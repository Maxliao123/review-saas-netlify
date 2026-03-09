import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { supabase as adminSupabase } from '@/lib/db';
import { computeBenchmark, type BenchmarkMetrics } from '@/lib/benchmarking';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/benchmarks
 * Returns benchmark data for the tenant's stores vs. industry peers.
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    // 1. Get tenant stores with verticals
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, business_vertical')
      .eq('tenant_id', ctx.tenant.id);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ benchmarks: [] });
    }

    // 2. Get review stats for each store
    const storeIds = stores.map(s => s.id);
    const { data: reviews } = await supabase
      .from('reviews_raw')
      .select('store_id, rating, reply_status, published_at, created_at')
      .in('store_id', storeIds);

    // Compute metrics per store
    const storeMetricsMap = new Map<number, BenchmarkMetrics>();
    for (const store of stores) {
      const storeReviews = (reviews || []).filter(r => r.store_id === store.id);
      const total = storeReviews.length;
      const avgRating = total > 0
        ? storeReviews.reduce((s, r) => s + r.rating, 0) / total
        : 0;
      const replied = storeReviews.filter(r => r.reply_status === 'published').length;
      const responseRate = total > 0 ? (replied / total) * 100 : 0;
      const positiveCount = storeReviews.filter(r => r.rating >= 4).length;
      const positiveRatio = total > 0 ? (positiveCount / total) * 100 : 0;

      // Average response time (hours) — from created_at to published_at
      const repliedReviews = storeReviews.filter(r => r.published_at && r.created_at);
      let avgResponseTime = 0;
      if (repliedReviews.length > 0) {
        const totalHours = repliedReviews.reduce((sum, r) => {
          const diff = new Date(r.published_at!).getTime() - new Date(r.created_at).getTime();
          return sum + diff / (1000 * 60 * 60);
        }, 0);
        avgResponseTime = totalHours / repliedReviews.length;
      }

      storeMetricsMap.set(store.id, {
        avgRating: Math.round(avgRating * 100) / 100,
        totalReviews: total,
        responseRate: Math.round(responseRate),
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        positiveRatio: Math.round(positiveRatio),
      });
    }

    // 3. Get peer metrics (aggregate from ALL stores in same vertical, anonymized)
    const verticals = [...new Set(stores.map(s => s.business_vertical || 'restaurant'))];

    const peerMetricsByVertical = new Map<string, BenchmarkMetrics[]>();

    for (const vertical of verticals) {
      // Query all stores in this vertical (across all tenants — anonymized)
      const { data: peerStores } = await adminSupabase
        .from('stores')
        .select('id')
        .eq('business_vertical', vertical);

      if (!peerStores || peerStores.length === 0) continue;

      const peerStoreIds = peerStores.map(s => s.id);
      const { data: peerReviews } = await adminSupabase
        .from('reviews_raw')
        .select('store_id, rating, reply_status')
        .in('store_id', peerStoreIds);

      // Aggregate per peer store
      const peerMetrics: BenchmarkMetrics[] = [];
      const storeGroups = new Map<number, any[]>();
      for (const r of (peerReviews || [])) {
        const arr = storeGroups.get(r.store_id) || [];
        arr.push(r);
        storeGroups.set(r.store_id, arr);
      }

      for (const [, storeRevs] of storeGroups) {
        const total = storeRevs.length;
        if (total === 0) continue;
        peerMetrics.push({
          avgRating: storeRevs.reduce((s: number, r: any) => s + r.rating, 0) / total,
          totalReviews: total,
          responseRate: (storeRevs.filter((r: any) => r.reply_status === 'published').length / total) * 100,
          avgResponseTime: 0, // Not computed for peers (too expensive)
          positiveRatio: (storeRevs.filter((r: any) => r.rating >= 4).length / total) * 100,
        });
      }

      peerMetricsByVertical.set(vertical, peerMetrics);
    }

    // 4. Compute benchmarks per store
    const benchmarks = stores.map(store => {
      const metrics = storeMetricsMap.get(store.id)!;
      const vertical = store.business_vertical || 'restaurant';
      const peers = peerMetricsByVertical.get(vertical) || [];

      return {
        storeId: store.id,
        storeName: store.name,
        vertical,
        peerCount: peers.length,
        ...computeBenchmark(metrics, peers),
      };
    });

    return NextResponse.json({
      benchmarks,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Benchmarks error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
