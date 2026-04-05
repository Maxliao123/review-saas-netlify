import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/credit-packages
 * List credit packages for a store.
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
      return NextResponse.json({ packages: [] });
    }

    if (storeId && !tenantStoreIds.includes(parseInt(storeId, 10))) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('credit_packages')
      .select('*')
      .in('store_id', storeId ? [parseInt(storeId, 10)] : tenantStoreIds)
      .order('price', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ packages: data || [] });
  } catch (err: any) {
    console.error('Credit packages GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/credit-packages
 * Create a new credit package.
 * Body: { store_id, name, description, package_type, total_units, price, valid_days, applicable_service_ids }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      store_id,
      name,
      description,
      package_type,
      total_units,
      price,
      valid_days,
      applicable_service_ids,
    } = body;

    if (!store_id || !name?.trim()) {
      return NextResponse.json(
        { error: 'store_id and name are required' },
        { status: 400 }
      );
    }

    if (!total_units || total_units < 1) {
      return NextResponse.json(
        { error: 'total_units must be at least 1' },
        { status: 400 }
      );
    }

    if (price == null || price < 0) {
      return NextResponse.json(
        { error: 'price is required and must be non-negative' },
        { status: 400 }
      );
    }

    // Verify store belongs to tenant
    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (!tenantStoreIds.includes(store_id)) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('credit_packages')
      .insert({
        tenant_id: ctx.tenant.id,
        store_id,
        name: name.trim(),
        description: description?.trim() || null,
        package_type: package_type || 'count',
        total_units,
        price,
        valid_days: valid_days || 365,
        applicable_service_ids: applicable_service_ids || [],
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ package: data }, { status: 201 });
  } catch (err: any) {
    console.error('Credit packages POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
