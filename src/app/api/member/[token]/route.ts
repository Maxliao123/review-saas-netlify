import { NextRequest, NextResponse } from 'next/server';
import { validateMemberToken } from '@/lib/member-token';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { valid, member, error } = await validateMemberToken(token);

  if (!valid || !member) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Fetch upcoming bookings
  const now = new Date().toISOString();
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, start_time, end_time, status, verification_code,
      services:service_id (id, name, duration_minutes, price),
      staff:staff_id (id, name)
    `)
    .eq('member_id', member.id)
    .eq('store_id', member.store_id)
    .in('status', ['confirmed'])
    .gte('start_time', now)
    .order('start_time', { ascending: true })
    .limit(5);

  // Fetch credit packages with remaining
  const { data: credits } = await supabase
    .from('member_credits')
    .select(`
      id, remaining, total,
      credit_packages:package_id (id, name, session_count, price)
    `)
    .eq('member_id', member.id)
    .gt('remaining', 0);

  return NextResponse.json({
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
      points_balance: member.points_balance || 0,
      status: member.status,
    },
    store: {
      id: member.stores?.id,
      name: member.stores?.name,
      place_id: member.stores?.place_id,
    },
    upcoming_bookings: bookings || [],
    credit_packages: credits || [],
  });
}
