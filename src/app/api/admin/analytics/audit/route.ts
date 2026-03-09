import { NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { auditReviews, type ReviewForAudit } from '@/lib/review-auditor';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/audit
 * Returns AI review audit results (competitor manipulation detection).
 * Query: ?days=30
 */
export async function GET(request: Request) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const supabase = await createSupabaseServerClient();

    // Get tenant stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('tenant_id', ctx.tenant.id);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ alerts: [], stats: {} });
    }

    const storeIds = stores.map(s => s.id);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Fetch reviews
    const { data: reviews } = await supabase
      .from('reviews_raw')
      .select('id, store_id, author_name, rating, content, created_at')
      .in('store_id', storeIds)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({ alerts: [], stats: { totalReviewed: 0 } });
    }

    // Run audit
    const reviewsForAudit: ReviewForAudit[] = reviews.map(r => ({
      id: r.id,
      storeId: r.store_id,
      authorName: r.author_name || 'Unknown',
      rating: r.rating,
      content: r.content || '',
      createdAt: r.created_at,
    }));

    const alerts = auditReviews(reviewsForAudit);

    // Attach store names
    const storeNameMap = new Map(stores.map(s => [s.id, s.name]));

    return NextResponse.json({
      alerts: alerts.map(a => ({
        ...a,
        storeName: a.affectedReviews.length > 0
          ? storeNameMap.get(
              reviews.find(r => r.id === a.affectedReviews[0])?.store_id
            ) || 'Unknown'
          : 'Unknown',
      })),
      stats: {
        totalReviewed: reviews.length,
        alertCount: alerts.length,
        criticalCount: alerts.filter(a => a.severity === 'critical').length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Audit error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
