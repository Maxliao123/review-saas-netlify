import { createClient } from '@supabase/supabase-js';

// Determine the URL and Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in environment variables.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Log environment status for debugging
 */
export function checkEnv() {
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('Supabase Key:', supabaseKey ? 'Set' : 'Missing');
}
