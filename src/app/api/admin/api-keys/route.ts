import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { generateApiKey } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/api-keys — List API keys for tenant
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: keys } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, rate_limit_per_hour, last_used_at, expires_at, is_active, created_at, revoked_at')
      .eq('tenant_id', ctx.tenant.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ keys: keys || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/api-keys — Create new API key
 * Body: { name, scopes?, rateLimitPerHour?, expiresAt? }
 */
export async function POST(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized — owner or manager required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, scopes = ['read'], rateLimitPerHour = 1000, expiresAt } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate key
    const { fullKey, keyPrefix, keyHash } = generateApiKey();

    const supabase = await createSupabaseServerClient();
    const { data: created, error } = await supabase
      .from('api_keys')
      .insert({
        tenant_id: ctx.tenant.id,
        name: name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes,
        rate_limit_per_hour: rateLimitPerHour,
        expires_at: expiresAt || null,
        created_by: ctx.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      key: created,
      fullKey, // Only returned ONCE at creation
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/api-keys — Revoke an API key
 * Body: { id }
 */
export async function PUT(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant || ctx.role === 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await request.json();

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
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
