import { getUserTenantContext, createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FeedbackInbox from './FeedbackInbox';

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  const supabase = await createSupabaseServerClient();
  const storeIds = ctx.stores.map(s => s.id);

  const { data: feedback } = storeIds.length > 0
    ? await supabase
        .from('customer_feedback')
        .select('*')
        .in('store_id', storeIds)
        .order('created_at', { ascending: false })
        .limit(100)
    : { data: [] };

  const storeMap = ctx.stores.reduce((acc: Record<number, string>, store) => {
    acc[store.id] = store.name;
    return acc;
  }, {});

  const enriched = (feedback || []).map((f: any) => ({
    ...f,
    store_name: storeMap[f.store_id] || 'Unknown Store',
  }));

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Customer Feedback</h1>
      <p className="text-sm text-gray-500 mb-8">
        Negative feedback submitted by customers through the survey form.
      </p>
      <FeedbackInbox feedback={enriched} stores={ctx.stores} />
    </div>
  );
}
