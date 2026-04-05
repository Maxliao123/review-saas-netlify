/**
 * Booking verification (check-in) logic
 * Handles: deduct credits, update booking, record audit, update member stats
 */

import { createSupabaseAdmin } from '@/lib/supabase/admin';

interface VerifyInput {
  bookingId: string;
  storeId: number;
  staffId: string; // the staff performing the verification
}

interface VerifyResult {
  success: boolean;
  error?: string;
  data?: {
    memberName: string;
    serviceName: string;
    creditsDeducted: number;
    remainingCredits: number;
    packageName: string;
    pointsBalance: number;
  };
}

export async function verifyBooking({ bookingId, storeId, staffId }: VerifyInput): Promise<VerifyResult> {
  const supabase = createSupabaseAdmin();

  // 1. Fetch booking with relations
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select(`
      *,
      members:member_id (id, name, phone, points_balance, total_visits),
      services:service_id (id, name, credits_required)
    `)
    .eq('id', bookingId)
    .eq('store_id', storeId)
    .eq('status', 'confirmed')
    .is('verified_at', null)
    .single();

  if (bookingErr || !booking) {
    return { success: false, error: 'Booking not found or already verified' };
  }

  const creditsNeeded = booking.services?.credits_required || 1;

  // 2. Find active credit package to deduct from
  const { data: credits } = await supabase
    .from('member_credits')
    .select('*')
    .eq('member_id', booking.member_id)
    .eq('store_id', storeId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true }) // use earliest expiring first
    .limit(1);

  let memberCreditId: string | null = null;
  let remainingCredits = 0;
  let packageName = 'N/A';

  if (credits && credits.length > 0) {
    const credit = credits[0];
    const currentRemaining = credit.total_units - credit.used_units;

    if (currentRemaining < creditsNeeded) {
      return { success: false, error: `Not enough credits. Need ${creditsNeeded}, have ${currentRemaining}` };
    }

    // Deduct credits
    const { error: deductErr } = await supabase
      .from('member_credits')
      .update({ used_units: credit.used_units + creditsNeeded })
      .eq('id', credit.id);

    if (deductErr) {
      return { success: false, error: 'Failed to deduct credits' };
    }

    memberCreditId = credit.id;
    remainingCredits = currentRemaining - creditsNeeded;
    packageName = credit.package_name;
  }

  // 3. Update booking status
  const { error: updateErr } = await supabase
    .from('bookings')
    .update({
      status: 'completed',
      verified_at: new Date().toISOString(),
      verified_by: staffId,
      credits_deducted: creditsNeeded,
      member_credit_id: memberCreditId,
    })
    .eq('id', bookingId);

  if (updateErr) {
    return { success: false, error: 'Failed to update booking' };
  }

  // 4. Record verification audit
  await supabase.from('verifications').insert({
    booking_id: bookingId,
    store_id: storeId,
    member_id: booking.member_id,
    staff_id: staffId,
    verification_code: booking.verification_code,
    credits_deducted: creditsNeeded,
    member_credit_id: memberCreditId,
    service_name: booking.services?.name || '',
  });

  // 5. Update member stats
  await supabase
    .from('members')
    .update({
      total_visits: (booking.members?.total_visits || 0) + 1,
      last_visit_at: new Date().toISOString(),
    })
    .eq('id', booking.member_id);

  return {
    success: true,
    data: {
      memberName: booking.members?.name || '',
      serviceName: booking.services?.name || '',
      creditsDeducted: creditsNeeded,
      remainingCredits,
      packageName,
      pointsBalance: booking.members?.points_balance || 0,
    },
  };
}
