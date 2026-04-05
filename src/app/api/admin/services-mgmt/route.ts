import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/services-mgmt
 * List services for a store.
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
      return NextResponse.json({ services: [] });
    }

    if (storeId && !tenantStoreIds.includes(parseInt(storeId, 10))) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .in('store_id', storeId ? [parseInt(storeId, 10)] : tenantStoreIds)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ services: data || [] });
  } catch (err: any) {
    console.error('Services GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/services-mgmt
 * Create a new service.
 * Body: { store_id, name, description, duration_minutes, price, credits_required, category }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { store_id, name, description, duration_minutes, price, credits_required, category } = body;

    if (!store_id || !name?.trim()) {
      return NextResponse.json(
        { error: 'store_id and name are required' },
        { status: 400 }
      );
    }

    if (!duration_minutes || duration_minutes < 1) {
      return NextResponse.json(
        { error: 'duration_minutes must be at least 1' },
        { status: 400 }
      );
    }

    // Verify store belongs to tenant
    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (!tenantStoreIds.includes(store_id)) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('services')
      .insert({
        tenant_id: ctx.tenant.id,
        store_id,
        name: name.trim(),
        description: description?.trim() || null,
        duration_minutes,
        price: price || 0,
        credits_required: credits_required || 1,
        category: category?.trim() || 'general',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ service: data }, { status: 201 });
  } catch (err: any) {
    console.error('Services POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
