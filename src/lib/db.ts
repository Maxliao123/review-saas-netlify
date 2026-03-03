// Backward-compatible re-export of the admin (service-role) Supabase client.
// Existing cron jobs and public API routes import { supabase } from '@/lib/db'.
// New code should import from '@/lib/supabase/admin', '@/lib/supabase/server', or '@/lib/supabase/client'.

import { supabaseAdmin } from '@/lib/supabase/admin';

export const supabase = supabaseAdmin;

export function checkEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log('Supabase URL:', url ? 'Set' : 'Missing');
  console.log('Supabase Service Key:', key ? 'Set' : 'Missing');
}
