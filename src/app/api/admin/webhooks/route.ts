import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/webhooks — List webhook configs
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('id, name, url, events, is_active, last_triggered_at, last_status_code, failure_count, created_at')
      .eq('tenant_id', ctx.tenant.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ webhooks: webhooks || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/webhooks — Create webhook
 * Body: { name, url, events, secret? }
 */
export async function POST(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, url, events } = body;

    if (!name || !url || !events || events.length === 0) {
      return NextResponse.json({ error: 'Name, URL, and events are required' }, { status: 400 });
    }

    // Validate URL
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Auto-generate signing secret
    const secret = `whsec_${randomBytes(24).toString('hex')}`;

    const supabase = await createSupabaseServerClient();
    const { data: created, error } = await supabase
      .from('webhooks')
      .insert({
        tenant_id: ctx.tenant.id,
        name: name.trim(),
        url,
        secret,
        events,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      webhook: created,
      secret, // Only shown once
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/webhooks — Update webhook
 * Body: { id, is_active?, events?, url? }
 */
export async function PUT(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('webhooks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', ctx.tenant.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
