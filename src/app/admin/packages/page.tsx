import { getUserTenantContext } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import PackagesClient from './PackagesClient';

export const metadata = {
  title: 'Packages — ReplyWise AI',
};

export default async function PackagesPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/admin/onboarding');

  const storeIds = (ctx.stores || []).map((s) => s.id);
  if (storeIds.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">No stores configured. Set up a store first.</p>
        </div>
      </div>
    );
  }

  const supabase = createSupabaseAdmin();

  const { data: packages } = await supabase
    .from('credit_packages')
    .select('*')
    .in('store_id', storeIds)
    .order('sort_order', { ascending: true });

  // Get member count per package
  const packageIds = (packages || []).map((p) => p.id);
  let usageMap: Record<string, number> = {};
  if (packageIds.length > 0) {
    const { data: usage } = await supabase
      .from('member_credits')
      .select('package_id')
      .in('package_id', packageIds)
      .eq('status', 'active');

    for (const u of usage || []) {
      usageMap[u.package_id] = (usageMap[u.package_id] || 0) + 1;
    }
  }

  const enriched = (packages || []).map((p) => ({
    ...p,
    member_count: usageMap[p.id] || 0,
  }));

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <PackagesClient
        packages={enriched}
        stores={ctx.stores}
        tenantId={ctx.tenant.id}
      />
    </div>
  );
}
