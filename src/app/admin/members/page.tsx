import { getUserTenantContext } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import {
  UserCheck,
  Search,
  Plus,
  Send,
  Package,
  AlertCircle,
} from 'lucide-react';
import MembersClient from './MembersClient';

export const metadata = {
  title: 'Members — ReplyWise AI',
};

export default async function MembersPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/admin/onboarding');

  const storeIds = (ctx.stores || []).map((s) => s.id);
  if (storeIds.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">No stores configured. Set up a store first.</p>
        </div>
      </div>
    );
  }

  const supabase = createSupabaseAdmin();

  // Fetch members with their active credit packages
  const { data: members } = await supabase
    .from('members')
    .select(`
      id, name, phone, email, points_balance, total_visits,
      last_visit_at, status, tags, created_at, store_id
    `)
    .in('store_id', storeIds)
    .order('created_at', { ascending: false });

  // Fetch active credit summaries for each member
  const memberIds = (members || []).map((m) => m.id);
  let creditMap: Record<string, { remaining: number; total: number }> = {};
  if (memberIds.length > 0) {
    const { data: credits } = await supabase
      .from('member_credits')
      .select('member_id, total_units, used_units, status')
      .in('member_id', memberIds)
      .eq('status', 'active');

    for (const c of credits || []) {
      if (!creditMap[c.member_id]) {
        creditMap[c.member_id] = { remaining: 0, total: 0 };
      }
      creditMap[c.member_id].remaining += (c.total_units - c.used_units);
      creditMap[c.member_id].total += c.total_units;
    }
  }

  const enrichedMembers = (members || []).map((m) => ({
    ...m,
    packages: creditMap[m.id] || { remaining: 0, total: 0 },
  }));

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="mt-1 text-sm text-gray-500">
            {enrichedMembers.length} member{enrichedMembers.length !== 1 ? 's' : ''} across {ctx.stores.length} store{ctx.stores.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <MembersClient
        members={enrichedMembers}
        stores={ctx.stores}
        tenantId={ctx.tenant.id}
      />
    </div>
  );
}
