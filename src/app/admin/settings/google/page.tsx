import { getUserTenantContext, createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GoogleConnectionManager from './GoogleConnectionManager';

export const dynamic = 'force-dynamic';

export default async function GoogleSettingsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  // Fetch current Google credentials status
  const supabase = await createSupabaseServerClient();
  const { data: creds } = await supabase
    .from('google_credentials')
    .select('google_email, updated_at')
    .eq('tenant_id', ctx.tenant.id)
    .single();

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Google Business Connection</h1>
      <p className="text-gray-500 mb-8">
        Connect your Google Business Profile to automatically fetch reviews and publish replies.
      </p>

      <GoogleConnectionManager
        isConnected={!!creds}
        googleEmail={creds?.google_email || null}
        lastUpdated={creds?.updated_at || null}
        isOwner={ctx.role === 'owner'}
      />
    </div>
  );
}
