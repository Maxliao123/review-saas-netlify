import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS, for cron jobs and server-side admin operations only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key for admin client.');
}

export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '');

// Factory alias used by newer lib modules (member-token, booking-utils, verification)
export function createSupabaseAdmin() {
  return supabaseAdmin;
}
