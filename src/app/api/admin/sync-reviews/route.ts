import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGoogleClientForTenant } from '@/lib/google-business';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyNewReview } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for scanning

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant (owner only)
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Only tenant owners can sync reviews' }, { status: 403 });
    }

    const tenantId = membership.tenant_id;

    // Get Google client for this tenant
    const client = await getGoogleClientForTenant(tenantId);
    if (!client) {
      return NextResponse.json({ error: 'Google Business not connected. Please connect in Settings.' }, { status: 400 });
    }

    const { oauth2Client, accounts, gmb } = client;

    // 1. List accounts
    const accountsRes = await accounts.accounts.list();
    const accountsList = accountsRes.data.accounts || [];
    if (accountsList.length === 0) {
      return NextResponse.json({ error: 'No Google Business accounts found' }, { status: 404 });
    }
    const accountName = accountsList[0].name!;

    // 2. List locations
    const locationsResponse = await gmb.accounts.locations.list({
      parent: accountName,
      readMask: 'name,title,storeCode,regularHours,metadata',
    });
    const locations = locationsResponse.data.locations || [];

    if (locations.length === 0) {
      return NextResponse.json({ success: true, message: 'No locations found', stats: { fetched: 0, newReviews: 0 } });
    }

    // 3. Get tenant's stores for matching
    const { data: tenantStores } = await supabaseAdmin
      .from('stores')
      .select('id, name, slug, place_id')
      .eq('tenant_id', tenantId);

    if (!tenantStores || tenantStores.length === 0) {
      return NextResponse.json({ error: 'No stores found for this tenant' }, { status: 404 });
    }

    // 90 day lookback
    const lookback = new Date();
    lookback.setDate(lookback.getDate() - 90);

    let totalFetched = 0;
    let newReviews = 0;
    const log: string[] = [];

    for (const loc of locations) {
      const googlePlaceId = loc.metadata?.placeId;
      const locTitle = (loc.title || '').toLowerCase();

      // Match location to store
      const matchedStore = tenantStores.find(s => {
        if (googlePlaceId && s.place_id && s.place_id === googlePlaceId) return true;
        if (locTitle === (s.name || '').toLowerCase()) return true;
        return false;
      });

      if (!matchedStore) {
        log.push(`Skipped "${loc.title}" (no matching store)`);
        continue;
      }

      // Fetch reviews via v4 API
      let pageToken: string | undefined;
      do {
        try {
          const url = `https://mybusiness.googleapis.com/v4/${accountName}/${loc.name}/reviews`;
          const res = await oauth2Client.request({
            url,
            params: { pageSize: 50, pageToken },
          });

          const reviewsRes = res.data as any;
          const reviews = reviewsRes.reviews || [];

          for (const review of reviews) {
            const reviewDate = new Date(review.updateTime);
            if (reviewDate < lookback) continue;
            totalFetched++;

            // Check if already exists
            const { data: existing } = await supabaseAdmin
              .from('reviews_raw')
              .select('id')
              .eq('google_review_id', review.reviewId)
              .single();

            if (!existing) {
              const numericRating = STAR_RATING_MAP[review.starRating] || 5;
              const { error: insertError } = await supabaseAdmin.from('reviews_raw').insert({
                google_review_id: review.reviewId,
                author_name: review.reviewer.displayName,
                rating: numericRating,
                content: review.comment || '',
                full_json: review,
                reply_status: review.reviewReply ? 'published' : 'pending',
                created_at: new Date().toISOString(),
                store_id: matchedStore.id,
              });

              if (!insertError) {
                newReviews++;
                // Fire notification for new reviews
                notifyNewReview(matchedStore.id, {
                  author_name: review.reviewer.displayName,
                  rating: STAR_RATING_MAP[review.starRating] || 5,
                  content: review.comment || '',
                }).catch(() => {});
              }
            }
          }
          pageToken = reviewsRes.nextPageToken;
        } catch (err: any) {
          log.push(`Error fetching reviews for "${loc.title}": ${err.message}`);
          break;
        }
      } while (pageToken);

      log.push(`"${loc.title}" → ${matchedStore.name} synced`);
    }

    return NextResponse.json({
      success: true,
      stats: { totalFetched, newReviews, locations: locations.length },
      log,
    });
  } catch (error: any) {
    console.error('Sync reviews error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
