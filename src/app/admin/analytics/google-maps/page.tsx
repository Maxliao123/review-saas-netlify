import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { hasFeature } from '@/lib/plan-limits';
import GoogleMapsDashboard from './GoogleMapsDashboard';

export const dynamic = 'force-dynamic';

export default async function GoogleMapsAnalyticsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  // Plan gate: Pro or Enterprise only
  if (!hasFeature(ctx.tenant.plan, 'advancedAnalytics') || !['pro', 'enterprise'].includes(ctx.tenant.plan)) {
    redirect('/admin/settings/billing?upgrade=pro&feature=google-maps-analytics');
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Google Maps Analytics</h1>
      <p className="text-gray-500 mb-8">
        Track how customers discover and interact with your business on Google Maps.
      </p>

      <GoogleMapsDashboard stores={ctx.stores || []} />
    </div>
  );
}
