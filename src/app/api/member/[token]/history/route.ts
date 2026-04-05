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

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, start_time, end_time, status, verification_code,
      services:service_id (id, name, duration_minutes, price),
      staff:staff_id (id, name)
    `)
    .eq('member_id', member.id)
    .eq('store_id', member.store_id)
    .order('start_time', { ascending: false })
    .limit(30);

  return NextResponse.json({ bookings: bookings || [] });
}
