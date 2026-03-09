import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { generateAlerts, type TrendDataPoint } from '@/lib/predictive';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/predictions
 * Returns predictive alerts and trend data for the tenant's stores.
 * Query: ?window=weekly|monthly (default: weekly)
 */
export async function GET(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const window = searchParams.get('window') || 'weekly';

    const supabase = await createSupabaseServerClient();

    // 1. Get tenant stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('tenant_id', ctx.tenant.id);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ predictions: [], trendData: [] });
    }

    const storeIds = stores.map(s => s.id);

    // 2. Get reviews from last 8 periods (4 recent + 4 previous)
    const now = new Date();
    const periodMs = window === 'monthly'
      ? 30 * 24 * 60 * 60 * 1000   // ~30 days
      : 7 * 24 * 60 * 60 * 1000;   // 7 days

    const lookbackStart = new Date(now.getTime() - periodMs * 8);

    const { data: reviews } = await supabase
      .from('reviews_raw')
      .select('store_id, rating, reply_status, created_at')
      .in('store_id', storeIds)
      .gte('created_at', lookbackStart.toISOString())
      .order('created_at', { ascending: true });

    // 3. Build trend data per store
    const allPredictions: Array<{
      storeId: number;
      storeName: string;
      alerts: ReturnType<typeof generateAlerts>;
      trendData: TrendDataPoint[];
    }> = [];

    for (const store of stores) {
      const storeReviews = (reviews || []).filter(r => r.store_id === store.id);

      if (storeReviews.length === 0) continue;

      // Bucket reviews into periods
      const periods: TrendDataPoint[] = [];

      for (let i = 0; i < 8; i++) {
        const periodEnd = new Date(now.getTime() - periodMs * i);
        const periodStart = new Date(now.getTime() - periodMs * (i + 1));

        const periodLabel = window === 'monthly'
          ? `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`
          : `${periodStart.getFullYear()}-W${String(getISOWeek(periodStart)).padStart(2, '0')}`;

        const periodReviews = storeReviews.filter(r => {
          const d = new Date(r.created_at);
          return d >= periodStart && d < periodEnd;
        });

        const count = periodReviews.length;
        if (count === 0) {
          periods.unshift({
            period: periodLabel,
            avgRating: 0,
            count: 0,
            positiveRatio: 0,
            responseRate: 0,
          });
          continue;
        }

        const avgRating = periodReviews.reduce((s, r) => s + r.rating, 0) / count;
        const positiveCount = periodReviews.filter(r => r.rating >= 4).length;
        const repliedCount = periodReviews.filter(r => r.reply_status === 'published').length;

        periods.unshift({
          period: periodLabel,
          avgRating: Math.round(avgRating * 100) / 100,
          count,
          positiveRatio: positiveCount / count,
          responseRate: repliedCount / count,
        });
      }

      // Split into recent (last 4) and previous (prior 4)
      const recentPeriods = periods.slice(4);
      const previousPeriods = periods.slice(0, 4);

      const alerts = generateAlerts(recentPeriods, previousPeriods);

      allPredictions.push({
        storeId: store.id,
        storeName: store.name,
        alerts,
        trendData: periods,
      });
    }

    return NextResponse.json({
      predictions: allPredictions,
      window,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Predictions error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Get ISO week number for a date.
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
