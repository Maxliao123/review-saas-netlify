import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validateDeviceInput } from '@/lib/hardware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/hardware
 * List all hardware devices for the current tenant.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant
    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No tenant' }, { status: 403 });
    }

    const { data: devices, error } = await supabase
      .from('hardware_devices')
      .select('*')
      .eq('tenant_id', member.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ devices: devices || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/hardware
 * Register a new hardware device.
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
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member || member.role === 'staff') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const errors = validateDeviceInput(body);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    }

    // Verify store belongs to tenant
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', body.store_id)
      .eq('tenant_id', member.tenant_id)
      .single();

    if (!store) {
      return NextResponse.json({ error: 'Store not found or not yours' }, { status: 404 });
    }

    const { data: device, error } = await supabase
      .from('hardware_devices')
      .insert({
        tenant_id: member.tenant_id,
        store_id: body.store_id,
        device_type: body.device_type,
        name: body.name,
        serial_number: body.serial_number || null,
        nfc_tag_id: body.nfc_tag_id || null,
        location_description: body.location_description || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ device }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
