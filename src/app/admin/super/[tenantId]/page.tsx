import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  Shield,
  ArrowLeft,
  Store,
  Star,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

const SUPER_ADMINS = ['maxliao2020@gmail.com'];

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDetailPage({ params }: Props) {
  const user = await getAuthUser();
  if (!user || !SUPER_ADMINS.includes(user.email || '')) {
    redirect('/admin');
  }

  const { tenantId } = await params;

  // Fetch all tenant data (bypasses RLS)
  const [
    { data: tenant },
    { data: stores },
    { data: members },
    { data: reviews },
    { data: scans },
    { data: notifications },
    { data: dripEmails },
  ] = await Promise.all([
    supabaseAdmin.from('tenants').select('*').eq('id', tenantId).single(),
    supabaseAdmin.from('stores').select('*').eq('tenant_id', tenantId).order('created_at'),
    supabaseAdmin
      .from('tenant_members')
      .select('*, profiles(email, display_name)')
      .eq('tenant_id', tenantId),
    supabaseAdmin
      .from('reviews')
      .select('id, store_id, rating, source, ai_draft_status, reply_status, created_at, reviewer_name')
      .in('store_id', (await supabaseAdmin.from('stores').select('id').eq('tenant_id', tenantId)).data?.map((s: any) => s.id) || [])
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('scans')
      .select('id, store_id, created_at, source')
      .in('store_id', (await supabaseAdmin.from('stores').select('id').eq('tenant_id', tenantId)).data?.map((s: any) => s.id) || [])
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('notification_channels')
      .select('*')
      .eq('tenant_id', tenantId),
    supabaseAdmin
      .from('drip_emails')
      .select('id, store_id, status, created_at')
      .in('store_id', (await supabaseAdmin.from('stores').select('id').eq('tenant_id', tenantId)).data?.map((s: any) => s.id) || [])
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (!tenant) {
    redirect('/admin/super');
  }

  const statusIcon = (ok: boolean) =>
    ok ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-400" />;

  const reviewsByRating = [1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    count: (reviews || []).filter((rev) => rev.rating === r).length,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/super" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Shield className="h-5 w-5 text-red-500" />
        <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {tenant.plan || 'free'}
        </span>
      </div>

      {/* Tenant Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Tenant Details</h3>
          <div className="text-sm space-y-2 text-gray-600">
            <Row label="ID" value={tenant.id} mono />
            <Row label="Slug" value={tenant.slug} />
            <Row label="Plan" value={tenant.plan || 'free'} />
            <Row label="Created" value={new Date(tenant.created_at).toLocaleString()} />
            <Row label="Onboarded" value={tenant.onboarding_completed_at ? new Date(tenant.onboarding_completed_at).toLocaleString() : 'No'} />
            <Row label="Owner ID" value={tenant.owner_id} mono />
            {tenant.referred_by_tenant_id && (
              <Row label="Referred by" value={tenant.referred_by_tenant_id} mono />
            )}
          </div>
        </div>

        {/* Health Check */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Health Check</h3>
          <div className="space-y-2 text-sm">
            <HealthRow icon={statusIcon(!!tenant.onboarding_completed_at)} label="Onboarding complete" />
            <HealthRow icon={statusIcon((stores || []).length > 0)} label={`Stores: ${stores?.length || 0}`} />
            <HealthRow icon={statusIcon((stores || []).some((s: any) => s.place_id))} label="Google connected" />
            <HealthRow icon={statusIcon((notifications || []).length > 0)} label={`Notifications: ${notifications?.length || 0} channels`} />
            <HealthRow icon={statusIcon((reviews || []).length > 0)} label={`Reviews: ${reviews?.length || 0} (last 50)`} />
            <HealthRow icon={statusIcon((scans || []).length > 0)} label={`Scans: ${scans?.length || 0} (last 20)`} />
          </div>
        </div>
      </div>

      {/* Members */}
      <Section title={`Members (${members?.length || 0})`}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(members || []).map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{(m.profiles as any)?.display_name || 'Unknown'}</div>
                  <div className="text-xs text-gray-400">{(m.profiles as any)?.email || m.user_id}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    m.role === 'owner' ? 'bg-red-50 text-red-600' :
                    m.role === 'manager' ? 'bg-blue-50 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>{m.role}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Stores */}
      <Section title={`Stores (${stores?.length || 0})`}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(stores || []).map((store: any) => (
            <div key={store.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900">{store.name}</span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Place ID: <code className="bg-gray-100 px-1 rounded">{store.place_id || 'none'}</code></div>
                {store.google_rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" />
                    {store.google_rating} ({store.google_review_count} reviews)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Reviews */}
      <Section title={`Recent Reviews (${reviews?.length || 0})`}>
        {/* Rating distribution */}
        <div className="flex gap-4 mb-4 text-xs">
          {reviewsByRating.map(({ rating, count }) => (
            <div key={rating} className="flex items-center gap-1">
              <span className="text-amber-500">{'*'.repeat(rating)}</span>
              <span className="text-gray-500">{count}</span>
            </div>
          ))}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Reviewer</th>
              <th className="px-4 py-2 text-left">Rating</th>
              <th className="px-4 py-2 text-left">Source</th>
              <th className="px-4 py-2 text-left">AI Draft</th>
              <th className="px-4 py-2 text-left">Reply</th>
              <th className="px-4 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(reviews || []).slice(0, 20).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700">{r.reviewer_name || 'Anonymous'}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-medium ${r.rating >= 4 ? 'text-green-600' : r.rating >= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                    {'*'.repeat(r.rating)}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-400">{r.source}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.ai_draft_status} />
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.reply_status} />
                </td>
                <td className="px-4 py-2 text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function HealthRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-gray-700">{label}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 bg-white rounded-xl border overflow-hidden">
      <div className="px-5 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-300">-</span>;
  const colors: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-green-50 text-green-700',
    published: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
    draft: 'bg-blue-50 text-blue-700',
    sent: 'bg-green-50 text-green-700',
  };
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-50 text-gray-600'}`}>
      {status}
    </span>
  );
}
