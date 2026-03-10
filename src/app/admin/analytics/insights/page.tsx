import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InsightsDashboard from './InsightsDashboard';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Insights</h1>
      <p className="text-gray-500 mb-8">
        Turn every customer review into actionable operational insights.
      </p>

      <InsightsDashboard stores={ctx.stores || []} />
    </div>
  );
}
