import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { sendReviewInvite, type InviteInput } from '@/lib/invites';
import { getPlanLimits } from '@/lib/plan-limits';
import { scheduleReminderEmail } from '@/lib/drip-campaigns';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/invites — Send review invites
 * Body: { recipients: [{ channel, recipient, recipientName? }], storeId }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx || !ctx.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Plan gating
    const limits = getPlanLimits(ctx.tenant.plan);
    if (!limits.features.reviewInvites) {
      return NextResponse.json(
        { error: 'Review invites require Pro or Enterprise plan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { recipients, storeId } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients required' }, { status: 400 });
    }

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    // Find store slug + name
    const supabase = await createSupabaseServerClient();
    const { data: store } = await supabase
      .from('stores')
      .select('slug, name')
      .eq('id', storeId)
      .limit(1)
      .maybeSingle();

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Check monthly limit
    const yearMonth = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from('usage_monthly')
      .select('invites_sent')
      .eq('tenant_id', ctx.tenant.id)
      .eq('store_id', storeId)
      .eq('year_month', yearMonth)
      .limit(1)
      .maybeSingle();

    const currentUsage = usage?.invites_sent || 0;
    const remaining = limits.maxInvitesPerMonth - currentUsage;

    if (recipients.length > remaining) {
      return NextResponse.json(
        { error: `Monthly invite limit: ${remaining} remaining of ${limits.maxInvitesPerMonth}` },
        { status: 429 }
      );
    }

    // Send invites
    const results = [];
    for (const r of recipients) {
      const input: InviteInput = {
        storeId,
        tenantId: ctx.tenant.id,
        channel: r.channel,
        recipient: r.recipient,
        recipientName: r.recipientName,
        storeSlug: store.slug,
        storeName: store.name,
      };
      const result = await sendReviewInvite(input);
      results.push(result);

      // Schedule a 24h reminder drip email for successful invites
      if (result.success && result.inviteId) {
        scheduleReminderEmail(result.inviteId).catch((err) =>
          console.error('Failed to schedule reminder email:', err)
        );
      }
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({ sent, failed, results });
  } catch (error: any) {
    console.error('Invite API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/invites — List invite history
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx || !ctx.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from('review_invites')
      .select('*')
      .eq('tenant_id', ctx.tenant.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (storeId) {
      query = query.eq('store_id', parseInt(storeId));
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ invites: data || [] });
  } catch (error: any) {
    console.error('Invite list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
