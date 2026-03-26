import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReferralDashboard from './ReferralDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminReferralsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Referral Program</h1>
      <ReferralDashboard />
    </div>
  );
}
