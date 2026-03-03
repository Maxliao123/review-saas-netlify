import { getUserTenantContext, createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import WeeklyReportView from './WeeklyReportView';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  const supabase = await createSupabaseServerClient();

  const storeIds = ctx.stores.map(s => s.id);
  const { data: reports } = storeIds.length > 0
    ? await supabase
        .from('weekly_reports')
        .select('*')
        .in('store_id', storeIds)
        .order('report_week', { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Weekly Reports</h1>
      <p className="text-gray-500 mb-8">
        AI-generated operational insights delivered every Monday.
      </p>

      <WeeklyReportView
        reports={reports || []}
        stores={ctx.stores}
      />
    </div>
  );
}
