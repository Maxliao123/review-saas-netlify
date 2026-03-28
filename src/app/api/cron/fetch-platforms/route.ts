import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchFacebookReviews, normalizeFacebookRating } from '@/lib/facebook';
import { syncYelpSummary } from '@/lib/yelp';
import { syncTripAdvisorSummary } from '@/lib/tripadvisor';

export const dynamic = 'force-dynamic';

/**
 * Cron: Fetch reviews from connected platforms (Facebook, Yelp, TripAdvisor).
 * Runs separately from fetch-reviews (Google) to isolate failures.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('cron_secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const log: string[] = [];

    // ── A. Facebook Reviews ──
    const { data: fbCreds } = await supabaseAdmin
      .from('platform_credentials')
      .select('tenant_id, account_identifier, access_token, meta')
      .eq('platform', 'facebook');

    if (fbCreds && fbCreds.length > 0) {
      log.push(`Processing ${fbCreds.length} Facebook connection(s)...`);

      for (const cred of fbCreds) {
        try {
          const pageId = cred.account_identifier;
          const pageToken = cred.access_token;
          if (!pageId || !pageToken) continue;

          // Get stores for this tenant
          const { data: stores } = await supabaseAdmin
            .from('stores')
            .select('id')
            .eq('tenant_id', cred.tenant_id);

          const storeId = stores?.[0]?.id;
          if (!storeId) {
            log.push(`[FB ${cred.tenant_id}] No stores found, skipping.`);
            continue;
          }

          const reviews = await fetchFacebookReviews(pageId, pageToken);
          let imported = 0;

          for (const review of reviews) {
            const externalId = `fb_${review.id}`;
            const { data: existing } = await supabaseAdmin
              .from('reviews_raw')
              .select('id')
              .eq('platform', 'facebook')
              .eq('external_review_id', externalId)
              .limit(1)
              .maybeSingle();

            if (!existing) {
              const normalizedRating = normalizeFacebookRating(review.recommendation_type);
              await supabaseAdmin.from('reviews_raw').insert({
                store_id: storeId,
                google_review_id: externalId, // reuse column for backward compat
                external_review_id: externalId,
                platform: 'facebook',
                author_name: review.reviewer?.name || 'Facebook User',
                rating: review.recommendation_type === 'positive' ? 5 : 1,
                normalized_rating: normalizedRating,
                content: review.review_text || '',
                reply_status: 'pending',
                created_at: new Date(review.created_time).toISOString(),
              });
              imported++;
            }
          }

          // Update platform summary
          const positiveCount = reviews.filter(r => r.recommendation_type === 'positive').length;
          const avgRating = reviews.length > 0
            ? Math.round((positiveCount / reviews.length) * 5 * 100) / 100
            : 0;

          await supabaseAdmin
            .from('platform_summaries')
            .upsert({
              store_id: storeId,
              platform: 'facebook',
              overall_rating: avgRating,
              review_count: reviews.length,
              fetched_at: new Date().toISOString(),
            }, { onConflict: 'store_id,platform' });

          log.push(`[FB ${cred.tenant_id}] Imported ${imported} new reviews (${reviews.length} total).`);
        } catch (err: any) {
          log.push(`[FB ${cred.tenant_id}] Error: ${err.message}`);
        }
      }
    } else {
      log.push('No Facebook connections found.');
    }

    // ── B. Yelp Summary Sync ──
    // Yelp uses API key (env var), sync summaries for stores with yelp_business_id
    if (process.env.YELP_API_KEY) {
      const { data: stores } = await supabaseAdmin
        .from('platform_summaries')
        .select('store_id, meta')
        .eq('platform', 'yelp');

      if (stores && stores.length > 0) {
        for (const store of stores) {
          try {
            const bizId = (store.meta as Record<string, string>)?.business_id;
            if (!bizId) continue;
            await syncYelpSummary(store.store_id, bizId);
            log.push(`[Yelp] Synced summary for store ${store.store_id}.`);
          } catch (err: any) {
            log.push(`[Yelp] Error store ${store.store_id}: ${err.message}`);
          }
        }
      } else {
        log.push('No Yelp stores configured.');
      }
    }

    // ── C. TripAdvisor Summary Sync ──
    if (process.env.TRIPADVISOR_API_KEY) {
      const { data: taStores } = await supabaseAdmin
        .from('platform_summaries')
        .select('store_id, meta')
        .eq('platform', 'tripadvisor');

      if (taStores && taStores.length > 0) {
        for (const store of taStores) {
          try {
            const locationId = (store.meta as Record<string, string>)?.location_id;
            if (!locationId) continue;
            await syncTripAdvisorSummary(store.store_id, locationId);
            log.push(`[TripAdvisor] Synced summary for store ${store.store_id}.`);
          } catch (err: any) {
            log.push(`[TripAdvisor] Error store ${store.store_id}: ${err.message}`);
          }
        }
      } else {
        log.push('No TripAdvisor stores configured.');
      }
    }

    return NextResponse.json({ success: true, processed: log });
  } catch (error: any) {
    console.error('Error in fetch-platforms:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
