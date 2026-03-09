/**
 * Yelp Fusion API v3 integration.
 * Only 3 review excerpts available via public API.
 * Primarily used for summary stats (overall rating + review count).
 */

const YELP_API_KEY = process.env.YELP_API_KEY || '';
const YELP_BASE_URL = 'https://api.yelp.com/v3';

interface YelpBusiness {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  url: string;
}

interface YelpReviewExcerpt {
  id: string;
  text: string;
  rating: number;
  time_created: string;
  user: { name: string };
}

export interface YelpSummary {
  business_id: string;
  name: string;
  rating: number;
  review_count: number;
  url: string;
  excerpts: YelpReviewExcerpt[];
}

/**
 * Search for a business on Yelp by name and location.
 */
export async function searchYelpBusiness(
  name: string,
  location: string
): Promise<YelpBusiness | null> {
  if (!YELP_API_KEY) return null;

  const params = new URLSearchParams({ term: name, location, limit: '1' });
  const resp = await fetch(`${YELP_BASE_URL}/businesses/search?${params}`, {
    headers: { Authorization: `Bearer ${YELP_API_KEY}` },
  });

  if (!resp.ok) {
    console.error(`Yelp search error: ${resp.status}`);
    return null;
  }

  const data = await resp.json();
  return data.businesses?.[0] || null;
}

/**
 * Get business details + up to 3 review excerpts.
 */
export async function getYelpSummary(businessId: string): Promise<YelpSummary | null> {
  if (!YELP_API_KEY) return null;

  // Fetch business details
  const bizResp = await fetch(`${YELP_BASE_URL}/businesses/${businessId}`, {
    headers: { Authorization: `Bearer ${YELP_API_KEY}` },
  });
  if (!bizResp.ok) return null;
  const biz = await bizResp.json();

  // Fetch review excerpts (max 3 from Yelp API)
  const reviewResp = await fetch(`${YELP_BASE_URL}/businesses/${businessId}/reviews?limit=3&sort_by=yelp_sort`, {
    headers: { Authorization: `Bearer ${YELP_API_KEY}` },
  });
  const reviewData = reviewResp.ok ? await reviewResp.json() : { reviews: [] };

  return {
    business_id: biz.id,
    name: biz.name,
    rating: biz.rating,
    review_count: biz.review_count,
    url: biz.url,
    excerpts: reviewData.reviews || [],
  };
}

/**
 * Fetch and store Yelp summary for a store.
 */
export async function syncYelpSummary(
  storeId: number,
  yelpBusinessId: string
): Promise<YelpSummary | null> {
  const summary = await getYelpSummary(yelpBusinessId);
  if (!summary) return null;

  const { supabaseAdmin } = await import('@/lib/supabase/admin');

  await supabaseAdmin
    .from('platform_summaries')
    .upsert({
      store_id: storeId,
      platform: 'yelp',
      overall_rating: summary.rating,
      review_count: summary.review_count,
      fetched_at: new Date().toISOString(),
      meta: {
        business_id: summary.business_id,
        url: summary.url,
        excerpts: summary.excerpts,
      },
    }, { onConflict: 'store_id,platform' });

  return summary;
}
