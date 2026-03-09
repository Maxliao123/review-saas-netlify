import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validateOrderInput, calculateOrderTotal } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/marketplace/orders
 * List marketplace orders for the current tenant.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No tenant' }, { status: 403 });
    }

    const { data: orders, error } = await supabase
      .from('marketplace_orders')
      .select('*')
      .eq('tenant_id', member.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/marketplace/orders
 * Create a new marketplace order (hire a specialist).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No tenant' }, { status: 403 });
    }

    const body = await request.json();
    const errors = validateOrderInput(body);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    const orderCalc = calculateOrderTotal(body.price_per_review, body.review_count);

    const { data: order, error } = await supabase
      .from('marketplace_orders')
      .insert({
        tenant_id: member.tenant_id,
        store_id: body.store_id,
        specialist_id: body.specialist_id,
        order_type: body.order_type || 'one_time',
        review_count: body.review_count,
        price_per_review: body.price_per_review,
        total_price: orderCalc.total,
        instructions: body.instructions || null,
        deadline_at: body.deadline_at || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
