import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InviteDashboard from './InviteDashboard';

export const dynamic = 'force-dynamic';

export default async function InvitesPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Invites</h1>
      <p className="text-gray-500 mb-8">
        Send SMS or email invitations to customers to collect more reviews.
      </p>

      <InviteDashboard
        stores={ctx.stores || []}
        tenantId={ctx.tenant.id}
        plan={ctx.tenant.plan}
      />
    </div>
  );
}
