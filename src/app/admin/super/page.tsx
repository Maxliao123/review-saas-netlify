import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  Shield,
  Users,
  Store,
  Star,
  MessageSquare,
  CreditCard,
  Activity,
  ExternalLink,
} from 'lucide-react';

// Super-admin access list — only these emails can view this page
const SUPER_ADMINS = [
  'maxliao2020@gmail.com',
];

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const user = await getAuthUser();
  if (!user || !SUPER_ADMINS.includes(user.email || '')) {
    redirect('/admin');
  }

  // Fetch all data using service-role client (bypasses RLS)
  const [
    { data: tenants },
    { data: stores },
    { data: members },
    { count: totalReviews },
    { count: totalScans },
    { count: pendingDrafts },
  ] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('id, name, slug, plan, owner_id, created_at, onboarding_completed_at, referred_by_tenant_id')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('stores')
      .select('id, name, slug, tenant_id, place_id, created_at, google_rating, google_review_count')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('tenant_members')
      .select('id, user_id, tenant_id, role, created_at, profiles(email, display_name)')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('reviews')
      .select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('scans')
      .select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('ai_draft_status', 'pending'),
  ]);

  // Build tenant → stores map
  const storesByTenant = new Map<string, typeof stores>();
  for (const store of stores || []) {
    const list = storesByTenant.get(store.tenant_id) || [];
    list.push(store);
    storesByTenant.set(store.tenant_id, list);
  }

  // Build tenant → members map
  const membersByTenant = new Map<string, typeof members>();
  for (const member of members || []) {
    const list = membersByTenant.get(member.tenant_id) || [];
    list.push(member);
    membersByTenant.set(member.tenant_id, list);
  }

  const planColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Shield className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
          <p className="text-sm text-gray-500">All tenants, users, and system overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KpiCard icon={Users} label="Tenants" value={tenants?.length || 0} />
        <KpiCard icon={Store} label="Stores" value={stores?.length || 0} />
        <KpiCard icon={Users} label="Users" value={members?.length || 0} />
        <KpiCard icon={Star} label="Reviews" value={totalReviews || 0} />
        <KpiCard icon={Activity} label="Scans" value={totalScans || 0} />
        <KpiCard icon={MessageSquare} label="Pending Drafts" value={pendingDrafts || 0} />
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">All Tenants ({tenants?.length || 0})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Tenant</th>
                <th className="px-6 py-3 text-left">Plan</th>
                <th className="px-6 py-3 text-left">Stores</th>
                <th className="px-6 py-3 text-left">Members</th>
                <th className="px-6 py-3 text-left">Onboarded</th>
                <th className="px-6 py-3 text-left">Created</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(tenants || []).map((tenant) => {
                const tStores = storesByTenant.get(tenant.id) || [];
                const tMembers = membersByTenant.get(tenant.id) || [];
                const isOnboarded = !!tenant.onboarding_completed_at;

                return (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{tenant.name}</div>
                        <div className="text-xs text-gray-400">{tenant.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${planColors[tenant.plan] || planColors.free}`}>
                        {tenant.plan || 'free'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {tStores.length === 0 ? (
                          <span className="text-gray-400">none</span>
                        ) : (
                          tStores.map((s) => (
                            <div key={s.id} className="flex items-center gap-1.5">
                              <Store className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-700">{s.name}</span>
                              {s.google_rating && (
                                <span className="text-xs text-amber-600">
                                  {s.google_rating} ({s.google_review_count})
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {tMembers.map((m) => (
                          <div key={m.id} className="flex items-center gap-1.5 text-xs">
                            <span className={`rounded px-1.5 py-0.5 ${
                              m.role === 'owner' ? 'bg-red-50 text-red-600' :
                              m.role === 'manager' ? 'bg-blue-50 text-blue-600' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {m.role}
                            </span>
                            <span className="text-gray-500">
                              {(m.profiles as any)?.email || m.user_id.slice(0, 8)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isOnboarded ? (
                        <span className="text-green-600 text-xs">Yes</span>
                      ) : (
                        <span className="text-red-500 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/super/${tenant.id}`}
                        className="inline-flex items-center gap-1 text-xs text-[#E8654A] hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity — last 10 reviews */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">System Info</h2>
        </div>
        <div className="p-6 text-sm text-gray-500 space-y-2">
          <p>Logged in as: <strong className="text-gray-900">{user.email}</strong></p>
          <p>User ID: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{user.id}</code></p>
          <p>Environment: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{process.env.NODE_ENV}</code></p>
          <p>Supabase: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')}</code></p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <span className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</span>
    </div>
  );
}
