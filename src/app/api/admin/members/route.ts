import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateMemberToken } from '@/lib/member-token';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/members
 * List members for the current tenant's stores.
 * Query params: ?store_id, ?status, ?search, ?limit=20, ?offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (tenantStoreIds.length === 0) {
      return NextResponse.json({ members: [], total: 0 });
    }

    let query = supabaseAdmin
      .from('members')
      .select('id, name, phone, email, language, points_balance, total_visits, last_visit_at, status, tags, notes, birthday, store_id, created_at, updated_at', { count: 'exact' })
      .in('store_id', storeId ? [parseInt(storeId, 10)] : tenantStoreIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Scope store_id to tenant stores even if a specific one is requested
    if (storeId && !tenantStoreIds.includes(parseInt(storeId, 10))) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      const sanitized = search.replace(/[^a-zA-Z0-9\s@.\-_\u4e00-\u9fff]/g, '');
      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
      }
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ members: data || [], total: count || 0 });
  } catch (err: any) {
    console.error('Members GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/members
 * Create a new member. Generates a member_token automatically.
 * Body: { store_id, name, phone, email?, tier?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { store_id, name, phone, email, tier, notes } = body;

    if (!store_id || !name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'store_id, name, and phone are required' },
        { status: 400 }
      );
    }

    // Verify store belongs to tenant
    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (!tenantStoreIds.includes(store_id)) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Check for duplicate phone in same store
    const { data: existing } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('store_id', store_id)
      .eq('phone', phone.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A member with this phone number already exists in this store' },
        { status: 409 }
      );
    }

    const memberToken = generateMemberToken();

    const { data, error } = await supabaseAdmin
      .from('members')
      .insert({
        tenant_id: ctx.tenant.id,
        store_id,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        tier: tier || 'basic',
        notes: notes || null,
        member_token: memberToken,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        points_balance: 0,
        total_visits: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ member: data }, { status: 201 });
  } catch (err: any) {
    console.error('Members POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
