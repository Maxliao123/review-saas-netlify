import { getUserTenantContext, createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PlatformConnectionManager from './PlatformConnectionManager';

export const dynamic = 'force-dynamic';

export default async function PlatformSettingsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  const supabase = await createSupabaseServerClient();

  // Fetch platform credentials
  const { data: platforms } = await supabase
    .from('platform_credentials')
    .select('platform, account_identifier, meta, updated_at')
    .eq('tenant_id', ctx.tenant.id);

  // Fetch platform summaries for stores
  const storeIds = (ctx.stores || []).map((s: { id: number }) => s.id);
  const { data: summaries } = storeIds.length > 0
    ? await supabase
        .from('platform_summaries')
        .select('store_id, platform, overall_rating, review_count, fetched_at')
        .in('store_id', storeIds)
    : { data: [] };

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Platform Connections</h1>
      <p className="text-gray-500 mb-8">
        Connect review platforms to aggregate all your reviews in one place.
      </p>

      <PlatformConnectionManager
        platforms={platforms || []}
        summaries={summaries || []}
        stores={ctx.stores || []}
        isOwner={ctx.role === 'owner'}
      />
    </div>
  );
}
