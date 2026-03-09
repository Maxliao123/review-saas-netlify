import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import {
  computeFunnel,
  computeChannelBreakdown,
  computeInviteFunnel,
  computePeakHours,
  computeDeviceBreakdown,
} from '@/lib/journey-analytics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/journeys
 * Returns customer journey analytics for the tenant.
 * Query: ?days=30&store_id=123
 */
export async function GET(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const storeId = searchParams.get('store_id');

    const supabase = await createSupabaseServerClient();

    // 1. Get tenant stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('tenant_id', ctx.tenant.id);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ journey: null });
    }

    const storeIds = storeId
      ? [parseInt(storeId, 10)]
      : stores.map(s => s.id);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceISO = sinceDate.toISOString();

    // 2. Fetch scan events
    const { data: scanEvents } = await supabase
      .from('scan_events')
      .select('id, store_id, scan_source, device_type, created_at')
      .in('store_id', storeIds)
      .gte('created_at', sinceISO);

    // 3. Fetch generator events
    const { data: genEvents } = await supabase
      .from('generator_events')
      .select('id, store_id, event_type, created_at')
      .in('store_id', storeIds)
      .gte('created_at', sinceISO);

    // 4. Fetch published reviews (as proxy for "made it to Google")
    const { data: publishedReviews } = await supabase
      .from('reviews_raw')
      .select('id, store_id, created_at')
      .in('store_id', storeIds)
      .gte('created_at', sinceISO);

    // 5. Fetch invite data
    const { data: invites } = await supabase
      .from('review_invites')
      .select('id, status, channel, sent_at')
      .in('store_id', storeIds)
      .gte('sent_at', sinceISO);

    // 6. Compute funnel
    const scans = scanEvents?.length || 0;
    const generated = (genEvents || []).filter(e => e.event_type === 'generate').length;
    const clicked = (genEvents || []).filter(e => e.event_type === 'click_google').length;
    const published = publishedReviews?.length || 0;

    const funnel = computeFunnel(scans, generated, clicked, published);

    // 7. Channel breakdown
    const scansByChannel: Record<string, number> = {};
    for (const scan of (scanEvents || [])) {
      const ch = scan.scan_source || 'unknown';
      scansByChannel[ch] = (scansByChannel[ch] || 0) + 1;
    }
    // For generated/clicked, we don't have channel directly, so estimate from scans ratio
    const channels = computeChannelBreakdown(
      scansByChannel,
      scansByChannel, // approximate: generated proportional to scans
      scansByChannel  // approximate: clicked proportional to scans
    );

    // 8. Device breakdown
    const scansByDevice: Record<string, number> = {};
    for (const scan of (scanEvents || [])) {
      const dt = scan.device_type || 'unknown';
      scansByDevice[dt] = (scansByDevice[dt] || 0) + 1;
    }
    const devices = computeDeviceBreakdown(scansByDevice, scansByDevice);

    // 9. Peak hours
    const allTimestamps = [
      ...(scanEvents || []).map(e => e.created_at),
      ...(genEvents || []).map(e => e.created_at),
    ];
    const peakHours = computePeakHours(allTimestamps);

    // 10. Invite funnel
    const inviteList = invites || [];
    const inviteFunnel = computeInviteFunnel(
      inviteList.length,
      inviteList.filter(i => ['delivered', 'opened', 'completed'].includes(i.status)).length,
      inviteList.filter(i => ['opened', 'completed'].includes(i.status)).length,
      inviteList.filter(i => i.status === 'completed').length,
    );

    return NextResponse.json({
      journey: {
        funnel,
        channels,
        devices,
        peakHours,
        inviteFunnel,
      },
      period: { days, from: sinceISO, to: new Date().toISOString() },
      stores: stores.map(s => ({ id: s.id, name: s.name })),
    });
  } catch (err: any) {
    console.error('Journey analytics error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
