import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant membership
    const { data: memberships } = await supabase
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .limit(1);

    const membership = memberships?.[0];
    if (!membership) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const tenantId = membership.tenant_id;

    // Get stores for this tenant
    const { data: stores } = await supabase
      .from('stores')
      .select('id')
      .eq('tenant_id', tenantId);

    const storeIds = (stores || []).map((s) => s.id);

    // Run all checks in parallel
    const [googleCreds, tags, notifications] = await Promise.all([
      // Check Google Business connection
      supabase
        .from('google_credentials')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),

      // Check if any store has custom tags
      storeIds.length > 0
        ? supabaseAdmin
            .from('generator_tags')
            .select('id', { count: 'exact', head: true })
            .in('store_id', storeIds)
            .eq('is_active', true)
        : Promise.resolve({ count: 0 }),

      // Check notification channels
      storeIds.length > 0
        ? supabase
            .from('notification_channels')
            .select('id', { count: 'exact', head: true })
            .in('store_id', storeIds)
            .eq('is_active', true)
        : Promise.resolve({ count: 0 }),
    ]);

    const steps = {
      account_created: true,
      store_added: storeIds.length > 0,
      google_connected: (googleCreds.count || 0) > 0,
      tags_customized: (tags.count || 0) > 0,
      qr_downloaded: false, // Always shown as a reminder — no tracking
      notifications_configured: (notifications.count || 0) > 0,
    };

    return NextResponse.json({ steps });
  } catch (err) {
    console.error('[setup-status] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
