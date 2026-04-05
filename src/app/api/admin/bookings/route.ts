import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateVerificationCode } from '@/lib/member-token';
import { isSlotAvailable } from '@/lib/booking-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bookings
 * List bookings for tenant stores.
 * Query params: ?store_id, ?date (YYYY-MM-DD), ?staff_id, ?status, ?limit=20, ?offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const date = searchParams.get('date');
    const staffId = searchParams.get('staff_id');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (tenantStoreIds.length === 0) {
      return NextResponse.json({ bookings: [], total: 0 });
    }

    if (storeId && !tenantStoreIds.includes(parseInt(storeId, 10))) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    let query = supabaseAdmin
      .from('bookings')
      .select(
        `*, members:member_id (id, name, phone), services:service_id (id, name), staff:staff_id (id, name)`,
        { count: 'exact' }
      )
      .in('store_id', storeId ? [parseInt(storeId, 10)] : tenantStoreIds)
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);

    if (date) {
      query = query
        .gte('start_time', `${date}T00:00:00`)
        .lt('start_time', `${date}T23:59:59`);
    }

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ bookings: data || [], total: count || 0 });
  } catch (err: any) {
    console.error('Bookings GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/bookings
 * Create a new booking. Auto-calculates end_time and generates verification_code.
 * Body: { store_id, member_id, service_id, staff_id, start_time }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { store_id, member_id, service_id, staff_id, start_time } = body;

    if (!store_id || !member_id || !service_id || !staff_id || !start_time) {
      return NextResponse.json(
        { error: 'store_id, member_id, service_id, staff_id, and start_time are all required' },
        { status: 400 }
      );
    }

    // Verify store belongs to tenant
    const tenantStoreIds = ctx.stores.map((s: any) => s.id);
    if (!tenantStoreIds.includes(store_id)) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Look up service duration
    const { data: service, error: serviceErr } = await supabaseAdmin
      .from('services')
      .select('id, duration_minutes')
      .eq('id', service_id)
      .eq('store_id', store_id)
      .single();

    if (serviceErr || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Calculate end_time from service duration
    const startDate = new Date(start_time);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start_time format' }, { status: 400 });
    }

    const endDate = new Date(startDate.getTime() + service.duration_minutes * 60 * 1000);
    const endTime = endDate.toISOString();

    // Check slot availability
    const available = await isSlotAvailable(staff_id, store_id, start_time, endTime);
    if (!available) {
      return NextResponse.json(
        { error: 'This time slot is not available. The staff member has a conflicting booking.' },
        { status: 409 }
      );
    }

    const verificationCode = generateVerificationCode();

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        tenant_id: ctx.tenant.id,
        store_id,
        member_id,
        service_id,
        staff_id,
        start_time,
        end_time: endTime,
        status: 'confirmed',
        verification_code: verificationCode,
      })
      .select(
        `*, members:member_id (id, name, phone), services:service_id (id, name), staff:staff_id (id, name)`
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (err: any) {
    console.error('Bookings POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
