import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { randomBytes, createHmac } from 'crypto';

export const dynamic = 'force-dynamic';

const MAX_WEBHOOKS = 3;

/**
 * GET /api/admin/webhooks — List webhook configs + recent deliveries
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch webhook configs
    const { data: webhooks } = await supabase
      .from('webhook_configs')
      .select('id, url, events, secret, enabled, created_at')
      .eq('tenant_id', ctx.tenant.id)
      .order('created_at', { ascending: false });

    // Fetch recent deliveries for all configs (last 10)
    const webhookIds = (webhooks || []).map((w: any) => w.id);
    let deliveries: any[] = [];
    if (webhookIds.length > 0) {
      const { data } = await supabase
        .from('webhook_config_deliveries')
        .select('id, webhook_config_id, event, status_code, success, created_at')
        .in('webhook_config_id', webhookIds)
        .order('created_at', { ascending: false })
        .limit(10);
      deliveries = data || [];
    }

    return NextResponse.json({ webhooks: webhooks || [], deliveries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/webhooks — Create webhook config OR test existing webhook
 * Body for create: { url, events }
 * Body for test:   { action: 'test', webhookId }
 */
export async function POST(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    // ── Test action ──
    if (body.action === 'test' && body.webhookId) {
      return await handleTestWebhook(ctx, body.webhookId);
    }

    // ── Create action ──
    const { url, events } = body;

    if (!url || !events || events.length === 0) {
      return NextResponse.json({ error: 'URL and events are required' }, { status: 400 });
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

    const supabase = await createSupabaseServerClient();

    // Enforce max webhook limit
    const { count } = await supabase
      .from('webhook_configs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenant.id);

    if ((count ?? 0) >= MAX_WEBHOOKS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_WEBHOOKS} webhooks allowed. Delete one before adding another.` },
        { status: 400 }
      );
    }

    // Auto-generate signing secret
    const secret = `whsec_${randomBytes(24).toString('hex')}`;

    const { data: created, error } = await supabase
      .from('webhook_configs')
      .insert({
        tenant_id: ctx.tenant.id,
        url,
        events,
        secret,
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      webhook: created,
      secret, // Only shown once at creation
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/webhooks — Remove a webhook config
 * Body: { id }
 */
export async function DELETE(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('webhook_configs')
      .delete()
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

/**
 * PUT /api/admin/webhooks — Toggle enabled/disabled
 * Body: { id, enabled }
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
      .from('webhook_configs')
      .update(updates)
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

/**
 * Send a test event to a specific webhook endpoint.
 */
async function handleTestWebhook(
  ctx: NonNullable<Awaited<ReturnType<typeof getUserTenantContext>>>,
  webhookId: string
) {
  const supabase = await createSupabaseServerClient();

  const { data: webhook } = await supabase
    .from('webhook_configs')
    .select('id, url, secret, events')
    .eq('id', webhookId)
    .eq('tenant_id', ctx.tenant!.id)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  const testPayload = {
    id: `whd_test_${Date.now()}`,
    event: 'review.created',
    timestamp: new Date().toISOString(),
    data: {
      review_id: 'test_review_123',
      store_name: 'Test Store',
      rating: 5,
      author: 'Test Customer',
      text: 'This is a test webhook delivery from ReplyWise AI.',
      platform: 'google',
    },
  };

  const body = JSON.stringify(testPayload);
  const signature = createHmac('sha256', webhook.secret)
    .update(body)
    .digest('hex');

  let statusCode: number | null = null;
  let responseBody = '';
  let success = false;

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ReplyWiseAI-Webhook/1.0',
        'X-ReplyWise-Signature': signature,
        'X-Webhook-Event': 'review.created',
        'X-Webhook-Delivery': testPayload.id,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    statusCode = response.status;
    success = response.status >= 200 && response.status < 300;

    try {
      const text = await response.text();
      responseBody = text.slice(0, 1024);
    } catch {
      // ignore
    }
  } catch (err: any) {
    responseBody = err.message || 'Network error';
  }

  // Record delivery
  await supabase.from('webhook_config_deliveries').insert({
    webhook_config_id: webhook.id,
    event: 'review.created',
    payload: testPayload,
    status_code: statusCode,
    response_body: responseBody,
    success,
  });

  return NextResponse.json({
    success,
    statusCode,
    responseBody: responseBody.slice(0, 200),
  });
}
