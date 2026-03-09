import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/pos — List POS integrations
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('pos_integrations')
      .select('id, store_id, provider, name, auto_invite_enabled, auto_invite_delay_minutes, auto_invite_channel, min_transaction_amount, is_active, last_sync_at, transactions_synced, invites_triggered, created_at')
      .eq('tenant_id', ctx.tenant.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ integrations: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/pos — Create POS integration
 */
export async function POST(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { storeId, provider, name, autoInviteEnabled, autoInviteDelayMinutes, autoInviteChannel, minTransactionAmount } = body;

    if (!storeId || !provider || !name) {
      return NextResponse.json({ error: 'Store, provider, and name required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/pos/${provider}?integration_id=`;

    const { data: created, error } = await supabase
      .from('pos_integrations')
      .insert({
        tenant_id: ctx.tenant.id,
        store_id: storeId,
        provider,
        name,
        webhook_url: webhookUrl,
        auto_invite_enabled: autoInviteEnabled ?? false,
        auto_invite_delay_minutes: autoInviteDelayMinutes ?? 60,
        auto_invite_channel: autoInviteChannel ?? 'sms',
        min_transaction_amount: minTransactionAmount ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ integration: created, webhookUrl: `${webhookUrl}${created.id}` }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/pos — Update POS integration
 */
export async function PUT(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('pos_integrations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', ctx.tenant.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
