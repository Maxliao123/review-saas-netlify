import { getUserTenantContext } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import ServicesClient from './ServicesClient';

export const metadata = {
  title: 'Services — ReplyWise AI',
};

export default async function ServicesPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/admin/onboarding');

  const storeIds = (ctx.stores || []).map((s) => s.id);
  if (storeIds.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">No stores configured. Set up a store first.</p>
        </div>
      </div>
    );
  }

  const supabase = createSupabaseAdmin();

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .in('store_id', storeIds)
    .order('sort_order', { ascending: true });

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <ServicesClient
        services={services || []}
        stores={ctx.stores}
        tenantId={ctx.tenant.id}
      />
    </div>
  );
}
