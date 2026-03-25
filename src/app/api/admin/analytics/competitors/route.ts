import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { getPlanLimits } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics/competitors
 *
 * Returns comparison data: your stores vs nearby competitors.
 * Uses Google Places API to find nearby competitors and fetch their ratings.
 * Also returns tracked competitors with snapshot history.
 */
export async function GET() {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();

    // 1. Get all stores for this tenant with their place_ids
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, place_id, business_vertical')
      .eq('tenant_id', ctx.tenant.id)
      .order('name');

    if (!stores || stores.length === 0) {
      return NextResponse.json({ stores: [], competitors: [], tracked: [], planLimit: 0 });
    }

    // 2. Get our review stats per store
    const storeIds = stores.map(s => s.id);
    const { data: reviewStats } = await supabase
      .from('reviews_raw')
      .select('store_id, rating')
      .in('store_id', storeIds);

    // Aggregate per store
    const storeMetrics = stores.map(store => {
      const storeReviews = (reviewStats || []).filter(r => r.store_id === store.id);
      const totalReviews = storeReviews.length;
      const avgRating = totalReviews > 0
        ? storeReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      // Rating distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      storeReviews.forEach(r => {
        if (r.rating >= 1 && r.rating <= 5) {
          distribution[r.rating as keyof typeof distribution]++;
        }
      });

      // Response rate (reviews with published replies)
      const repliedCount = storeReviews.length; // We don't have reply_status in this query
      // We'll get this separately

      return {
        storeId: store.id,
        storeName: store.name,
        placeId: store.place_id,
        vertical: store.business_vertical,
        totalReviews,
        avgRating: Math.round(avgRating * 100) / 100,
        distribution,
      };
    });

    // 3. Get reply stats
    const { data: replyStats } = await supabase
      .from('reviews_raw')
      .select('store_id, reply_status')
      .in('store_id', storeIds);

    const replyMetrics: Record<number, { total: number; replied: number }> = {};
    (replyStats || []).forEach(r => {
      if (!replyMetrics[r.store_id]) {
        replyMetrics[r.store_id] = { total: 0, replied: 0 };
      }
      replyMetrics[r.store_id].total++;
      if (r.reply_status === 'published') {
        replyMetrics[r.store_id].replied++;
      }
    });

    // 4. Get 30/60/90 day trends
    const now = new Date();
    const periods = [
      { label: '30d', start: new Date(now.getTime() - 30 * 86400000) },
      { label: '60d', start: new Date(now.getTime() - 60 * 86400000) },
      { label: '90d', start: new Date(now.getTime() - 90 * 86400000) },
    ];

    const trends: Record<number, Record<string, { count: number; avgRating: number }>> = {};

    for (const period of periods) {
      const { data: periodReviews } = await supabase
        .from('reviews_raw')
        .select('store_id, rating')
        .in('store_id', storeIds)
        .gte('created_at', period.start.toISOString());

      storeIds.forEach(sid => {
        if (!trends[sid]) trends[sid] = {};
        const reviews = (periodReviews || []).filter(r => r.store_id === sid);
        trends[sid][period.label] = {
          count: reviews.length,
          avgRating: reviews.length > 0
            ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 100) / 100
            : 0,
        };
      });
    }

    // 5. Competitor data from Google Places (if API key available)
    let competitors: any[] = [];
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (googleApiKey) {
      // Fetch competitors for the first store with a place_id
      const primaryStore = stores.find(s => s.place_id);
      if (primaryStore?.place_id) {
        try {
          competitors = await fetchNearbyCompetitors(
            googleApiKey,
            primaryStore.place_id,
            primaryStore.business_vertical || 'restaurant'
          );
        } catch (err: any) {
          console.error('Failed to fetch competitors:', err.message);
        }
      }
    }

    // 6. Fetch tracked competitors with snapshot history
    const { data: trackedRaw } = await supabase
      .from('competitor_tracking')
      .select(`
        id,
        store_id,
        competitor_name,
        competitor_place_id,
        current_rating,
        current_review_count,
        last_fetched_at,
        created_at,
        competitor_snapshots (
          snapshot_date,
          rating,
          review_count
        )
      `)
      .in('store_id', storeIds)
      .order('competitor_name');

    // Shape tracked competitors with snapshot data sorted by date
    const tracked = (trackedRaw || []).map(t => ({
      id: t.id,
      storeId: t.store_id,
      competitorName: t.competitor_name,
      competitorPlaceId: t.competitor_place_id,
      currentRating: t.current_rating,
      currentReviewCount: t.current_review_count,
      lastFetchedAt: t.last_fetched_at,
      createdAt: t.created_at,
      snapshots: ((t as any).competitor_snapshots || [])
        .sort((a: any, b: any) => a.snapshot_date.localeCompare(b.snapshot_date))
        .slice(-30), // last 30 days
    }));

    // Plan limit info
    const planLimits = getPlanLimits(ctx.tenant.plan || 'free');

    // 7. Compose response
    const result = storeMetrics.map(store => ({
      ...store,
      responseRate: replyMetrics[store.storeId]
        ? Math.round((replyMetrics[store.storeId].replied / replyMetrics[store.storeId].total) * 100)
        : 0,
      trends: trends[store.storeId] || {},
    }));

    return NextResponse.json({
      stores: result,
      competitors,
      tracked,
      trackedCount: tracked.length,
      maxCompetitorsPerStore: planLimits.maxCompetitorsPerStore,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Competitor analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/analytics/competitors
 *
 * Track or untrack a competitor for persistent monitoring.
 * Body: { action: 'track' | 'untrack', storeId, competitorName, competitorPlaceId }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners/managers can manage tracked competitors
    if (!ctx.role || !['owner', 'manager'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, storeId, competitorName, competitorPlaceId } = body;

    if (!action || !storeId || !competitorPlaceId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, storeId, competitorPlaceId' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify this store belongs to the tenant
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('tenant_id', ctx.tenant.id)
      .single();

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (action === 'track') {
      // Enforce plan limit
      const planLimits = getPlanLimits(ctx.tenant.plan || 'free');
      const { count } = await supabase
        .from('competitor_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId);

      if ((count || 0) >= planLimits.maxCompetitorsPerStore) {
        return NextResponse.json(
          {
            error: `Plan limit reached. Your ${planLimits.name} plan allows tracking up to ${planLimits.maxCompetitorsPerStore} competitors per store.`,
            limitReached: true,
          },
          { status: 403 }
        );
      }

      // Insert tracked competitor
      const { data: inserted, error: insertErr } = await supabase
        .from('competitor_tracking')
        .upsert(
          {
            tenant_id: ctx.tenant.id,
            store_id: storeId,
            competitor_name: competitorName,
            competitor_place_id: competitorPlaceId,
          },
          { onConflict: 'store_id,competitor_place_id' }
        )
        .select()
        .single();

      if (insertErr) {
        console.error('Failed to track competitor:', insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, tracked: inserted });
    }

    if (action === 'untrack') {
      const { error: deleteErr } = await supabase
        .from('competitor_tracking')
        .delete()
        .eq('store_id', storeId)
        .eq('competitor_place_id', competitorPlaceId);

      if (deleteErr) {
        console.error('Failed to untrack competitor:', deleteErr);
        return NextResponse.json({ error: deleteErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, untracked: competitorPlaceId });
    }

    return NextResponse.json({ error: 'Invalid action. Use "track" or "untrack".' }, { status: 400 });

  } catch (error: any) {
    console.error('Competitor tracking error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Fetch nearby competitors from Google Places API.
 */
async function fetchNearbyCompetitors(
  apiKey: string,
  placeId: string,
  vertical: string
): Promise<any[]> {
  // 1. Get location details from our place
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,types&key=${apiKey}`;
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  if (!detailsData.result?.geometry?.location) return [];

  const { lat, lng } = detailsData.result.geometry.location;

  // Map vertical to Google Places type
  const typeMap: Record<string, string> = {
    restaurant: 'restaurant',
    medical: 'doctor',
    hotel: 'lodging',
    auto_repair: 'car_repair',
    salon: 'beauty_salon',
    retail: 'store',
    fitness: 'gym',
    other: 'establishment',
  };

  const placeType = typeMap[vertical] || 'restaurant';

  // 2. Search nearby
  const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${placeType}&key=${apiKey}`;
  const nearbyRes = await fetch(nearbyUrl);
  const nearbyData = await nearbyRes.json();

  if (!nearbyData.results) return [];

  // Filter out our own store and limit to top 10
  return nearbyData.results
    .filter((p: any) => p.place_id !== placeId)
    .slice(0, 10)
    .map((p: any) => ({
      name: p.name,
      placeId: p.place_id,
      rating: p.rating || 0,
      totalReviews: p.user_ratings_total || 0,
      vicinity: p.vicinity || '',
      priceLevel: p.price_level,
    }));
}
