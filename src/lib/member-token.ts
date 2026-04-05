/**
 * Member token generation and validation
 * Pattern reused from review_approve_tokens
 */

import crypto from 'crypto';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Generate a unique member token (32 hex chars, 128 bits)
 */
export function generateMemberToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a 6-digit verification code for booking check-in (CSPRNG)
 */
export function generateVerificationCode(): string {
  const buf = crypto.randomBytes(4);
  return (100000 + (buf.readUInt32BE(0) % 900000)).toString();
}

/**
 * Validate member token and return member data
 * Auto-extends token expiry on each valid access (rolling 30 days)
 */
export async function validateMemberToken(token: string) {
  const supabase = createSupabaseAdmin();

  const { data: member, error } = await supabase
    .from('members')
    .select(`
      *,
      stores:store_id (id, name, slug, place_id, tenant_id)
    `)
    .eq('member_token', token)
    .single();

  if (error || !member) {
    return { valid: false, member: null, error: 'Invalid token' };
  }

  if (member.token_expires_at && new Date(member.token_expires_at) < new Date()) {
    return { valid: false, member: null, error: 'Token expired' };
  }

  if (member.status === 'churned') {
    return { valid: false, member: null, error: 'Membership inactive' };
  }

  // Rolling expiry: extend 30 days on each access
  await supabase
    .from('members')
    .update({ token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
    .eq('id', member.id);

  return { valid: true, member, error: null };
}

/**
 * Validate verification code for today's bookings
 */
export async function validateVerificationCode(code: string, storeId: number) {
  const supabase = createSupabaseAdmin();

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      members:member_id (id, name, phone, points_balance),
      services:service_id (id, name, credits_required, price),
      staff:staff_id (id, name)
    `)
    .eq('verification_code', code)
    .eq('store_id', storeId)
    .eq('status', 'confirmed')
    .gte('start_time', startOfDay)
    .lt('start_time', endOfDay)
    .single();

  if (error || !booking) {
    return { valid: false, booking: null, error: 'Invalid code or no booking found for today' };
  }

  if (booking.verified_at) {
    return { valid: false, booking: null, error: 'Already verified' };
  }

  return { valid: true, booking, error: null };
}
