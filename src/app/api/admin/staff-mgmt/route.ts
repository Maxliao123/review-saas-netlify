import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/staff-mgmt
 * List staff for a store.
 * Query params: ?store_id
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');

    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (tenantStoreIds.length === 0) {
      return NextResponse.json({ staff: [] });
    }

    if (storeId && !tenantStoreIds.includes(parseInt(storeId, 10))) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('staff')
      .select('*')
      .in('store_id', storeId ? [parseInt(storeId, 10)] : tenantStoreIds)
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ staff: data || [] });
  } catch (err: any) {
    console.error('Staff GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/staff-mgmt
 * Create a new staff member.
 * Body: { store_id, name, phone, role, service_ids, working_hours, commission_rate }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { store_id, name, phone, role, service_ids, working_hours, commission_rate } = body;

    if (!store_id || !name?.trim()) {
      return NextResponse.json(
        { error: 'store_id and name are required' },
        { status: 400 }
      );
    }

    // Verify store belongs to tenant
    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (!tenantStoreIds.includes(store_id)) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('staff')
      .insert({
        tenant_id: ctx.tenant.id,
        store_id,
        name: name.trim(),
        phone: phone?.trim() || null,
        role: role || 'staff',
        service_ids: service_ids || [],
        working_hours: working_hours || {},
        commission_rate: commission_rate || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ staff: data }, { status: 201 });
  } catch (err: any) {
    console.error('Staff POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
