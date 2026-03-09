import { getUserTenantContext } from '@/lib/supabase/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  MessageSquare,
  TrendingUp,
  QrCode,
  Star,
  ArrowUpRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export const metadata = {
  title: 'Dashboard — Reputation Monitor',
};

async function getDashboardData(tenantId: number, storeIds: number[]) {
  const supabase = await createSupabaseServerClient();

  // Get date boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  // Parallel queries for dashboard KPIs
  const [
    reviewsThisMonth,
    reviewsLastMonth,
    scansThisMonth,
    scansLastMonth,
    pendingReplies,
    recentReviews,
    generatedThisMonth,
  ] = await Promise.all([
    // Reviews this month
    supabase
      .from('reviews_raw')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('created_at', monthStart),

    // Reviews last month
    supabase
      .from('reviews_raw')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('created_at', lastMonthStart)
      .lte('created_at', lastMonthEnd),

    // Scans this month
    supabase
      .from('scan_events')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('created_at', monthStart),

    // Scans last month
    supabase
      .from('scan_events')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('created_at', lastMonthStart)
      .lte('created_at', lastMonthEnd),

    // Pending reply drafts
    supabase
      .from('reviews_raw')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .eq('reply_status', 'drafted'),

    // Recent reviews (last 5)
    supabase
      .from('reviews_raw')
      .select('id, author_name, rating, content, reply_status, created_at')
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })
      .limit(5),

    // AI-generated reviews this month
    supabase
      .from('generated_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', monthStart),
  ]);

  // Calculate average rating this month
  const { data: avgData } = await supabase
    .from('reviews_raw')
    .select('rating')
    .in('store_id', storeIds)
    .gte('created_at', monthStart);

  const avgRating = avgData && avgData.length > 0
    ? avgData.reduce((sum, r) => sum + r.rating, 0) / avgData.length
    : 0;

  return {
    reviewsThisMonth: reviewsThisMonth.count || 0,
    reviewsLastMonth: reviewsLastMonth.count || 0,
    scansThisMonth: scansThisMonth.count || 0,
    scansLastMonth: scansLastMonth.count || 0,
    pendingReplies: pendingReplies.count || 0,
    recentReviews: recentReviews.data || [],
    generatedThisMonth: generatedThisMonth.count || 0,
    avgRating: Math.round(avgRating * 10) / 10,
  };
}

function StatCard({
  label,
  value,
  previous,
  icon: Icon,
  href,
}: {
  label: string;
  value: number | string;
  previous?: number;
  icon: typeof MessageSquare;
  href: string;
}) {
  const current = typeof value === 'number' ? value : 0;
  const change =
    previous && previous > 0
      ? Math.round(((current - previous) / previous) * 100)
      : null;

  return (
    <Link
      href={href}
      className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 hover:shadow-md hover:ring-blue-100 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-gray-500">{label}</span>
          {change !== null && (
            <span
              className={`text-xs font-medium ${
                change >= 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {change >= 0 ? '+' : ''}
              {change}%
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

interface RecentReview {
  id: number;
  author_name: string | null;
  rating: number;
  content: string | null;
  reply_status: string | null;
  created_at: string;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

export default async function AdminDashboard() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/admin/onboarding');

  const storeIds = (ctx.stores || []).map((s) => s.id);
  if (storeIds.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900">No stores configured</h3>
            <p className="mt-1 text-sm text-amber-700">
              Set up your first store to start tracking reviews and generating analytics.
            </p>
            <Link
              href="/admin/stores/setup"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900"
            >
              Go to Store Setup <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const data = await getDashboardData(ctx.tenant.id, storeIds);

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview for {ctx.tenant.name} &middot; {ctx.stores.length} store{ctx.stores.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Google Reviews (this month)"
          value={data.reviewsThisMonth}
          previous={data.reviewsLastMonth}
          icon={MessageSquare}
          href="/admin/reviews"
        />
        <StatCard
          label="Avg Rating (this month)"
          value={data.avgRating || '—'}
          icon={Star}
          href="/admin/reviews"
        />
        <StatCard
          label="QR/NFC Scans (this month)"
          value={data.scansThisMonth}
          previous={data.scansLastMonth}
          icon={QrCode}
          href="/admin/analytics/scans"
        />
        <StatCard
          label="AI Reviews Generated"
          value={data.generatedThisMonth}
          icon={TrendingUp}
          href="/admin/analytics/scans"
        />
      </div>

      {/* Action Items + Recent Reviews */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Pending Actions */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Action Items
          </h2>
          <div className="mt-4 space-y-3">
            {data.pendingReplies > 0 ? (
              <Link
                href="/admin/reviews"
                className="flex items-center justify-between rounded-lg bg-amber-50 p-3 hover:bg-amber-100 transition-colors"
              >
                <span className="text-sm font-medium text-amber-900">
                  {data.pendingReplies} reply draft{data.pendingReplies !== 1 ? 's' : ''} awaiting approval
                </span>
                <ArrowUpRight className="h-4 w-4 text-amber-600" />
              </Link>
            ) : (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                All caught up! No pending actions.
              </div>
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Reviews</h2>
            <Link href="/admin/reviews" className="text-xs font-medium text-blue-600 hover:text-blue-800">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.recentReviews.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No reviews yet. Connect Google Business to start syncing.
              </p>
            ) : (
              data.recentReviews.map((review: RecentReview) => (
                <div key={review.id} className="flex items-start gap-3 border-b border-gray-50 pb-3 last:border-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 shrink-0">
                    {(review.author_name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {review.author_name || 'Anonymous'}
                      </span>
                      <RatingStars rating={review.rating} />
                    </div>
                    {review.content && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{review.content}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      review.reply_status === 'published'
                        ? 'bg-green-50 text-green-700'
                        : review.reply_status === 'drafted'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    {review.reply_status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
