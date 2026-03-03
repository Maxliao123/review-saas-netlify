import { getUserTenantContext, createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReviewsManager from './ReviewsManager';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  const supabase = await createSupabaseServerClient();

  // Fetch reviews scoped to tenant's stores
  const storeIds = ctx.stores.map(s => s.id);

  const { data: reviews } = storeIds.length > 0
    ? await supabase
        .from('reviews_raw')
        .select('*')
        .in('store_id', storeIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  // Build store name map from context
  const storeMap = ctx.stores.reduce((acc: Record<number, string>, store) => {
    acc[store.id] = store.name;
    return acc;
  }, {});

  const enrichedReviews = (reviews || []).map((r: any) => ({
    ...r,
    store_name: storeMap[r.store_id] || 'Unknown Store',
  }));

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Review Management</h1>
      <ReviewsManager
        reviews={enrichedReviews}
        stores={ctx.stores}
        role={ctx.role!}
      />
    </div>
  );
}
