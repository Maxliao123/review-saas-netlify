import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { batchDetectAnomalies } from '@/lib/anomaly-detection';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/anomalies
 * Returns anomaly detection results for the tenant's reviews.
 * Query: ?store_id=123&days=30
 */
export async function GET(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const days = parseInt(searchParams.get('days') || '30', 10);

    const supabase = await createSupabaseServerClient();

    // 1. Get tenant stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('tenant_id', ctx.tenant.id);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ anomalies: [], stats: {} });
    }

    const storeIds = storeId
      ? [parseInt(storeId, 10)]
      : stores.map(s => s.id);

    // Verify store belongs to tenant
    if (storeId && !stores.some(s => s.id === parseInt(storeId, 10))) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // 2. Fetch recent reviews
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data: reviews } = await supabase
      .from('reviews_raw')
      .select('id, store_id, author_name, rating, content, created_at, sentiment_score, sentiment_label')
      .in('store_id', storeIds)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ anomalies: [], stats: { total: 0, flagged: 0, suspect: 0, clean: 0 } });
    }

    // 3. Run anomaly detection
    const results = batchDetectAnomalies(
      reviews.map(r => ({
        id: r.id,
        authorName: r.author_name || 'Unknown',
        rating: r.rating,
        content: r.content || '',
        createdAt: r.created_at,
        sentimentScore: r.sentiment_score,
        sentimentLabel: r.sentiment_label,
      }))
    );

    // 4. Attach store names
    const storeNameMap = new Map(stores.map(s => [s.id, s.name]));
    const reviewStoreMap = new Map(reviews.map(r => [r.id, r.store_id]));

    const anomalies = results.map(r => ({
      ...r,
      storeId: reviewStoreMap.get(r.reviewId),
      storeName: storeNameMap.get(reviewStoreMap.get(r.reviewId)!) || 'Unknown',
    }));

    // 5. Stats
    const stats = {
      total: anomalies.length,
      flagged: anomalies.filter(a => a.level === 'flagged').length,
      suspect: anomalies.filter(a => a.level === 'suspect').length,
      clean: anomalies.filter(a => a.level === 'clean').length,
    };

    return NextResponse.json({
      anomalies: anomalies.filter(a => a.level !== 'clean'), // Only return suspect+flagged
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Anomaly detection error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
