/**
 * TripAdvisor Content API v1 integration.
 * Provides location search and summary stats (overall rating + review count).
 * API docs: https://tripadvisor-content-api.readme.io/reference
 */

const TRIPADVISOR_API_KEY = process.env.TRIPADVISOR_API_KEY || '';
const TRIPADVISOR_BASE_URL = 'https://api.content.tripadvisor.com/api/v1';

export interface TripAdvisorLocation {
  location_id: string;
  name: string;
  address_obj?: { address_string: string };
}

export interface TripAdvisorSummary {
  location_id: string;
  name: string;
  rating: number;
  num_reviews: number;
  ranking_string?: string;
  web_url?: string;
}

/**
 * Search for a location on TripAdvisor by name and address.
 */
export async function searchTripAdvisorLocation(
  name: string,
  location: string
): Promise<TripAdvisorLocation | null> {
  if (!TRIPADVISOR_API_KEY) return null;

  const params = new URLSearchParams({
    searchQuery: `${name} ${location}`,
    language: 'en',
    key: TRIPADVISOR_API_KEY,
  });
  const resp = await fetch(
    `${TRIPADVISOR_BASE_URL}/location/search?${params}`,
    { headers: { accept: 'application/json' } }
  );

  if (!resp.ok) {
    console.error(`TripAdvisor search error: ${resp.status}`);
    return null;
  }

  const data = await resp.json();
  return data.data?.[0] || null;
}

/**
 * Get location details (rating, review count, ranking).
 */
export async function getTripAdvisorSummary(
  locationId: string
): Promise<TripAdvisorSummary | null> {
  if (!TRIPADVISOR_API_KEY) return null;

  const params = new URLSearchParams({
    language: 'en',
    key: TRIPADVISOR_API_KEY,
  });
  const resp = await fetch(
    `${TRIPADVISOR_BASE_URL}/location/${locationId}/details?${params}`,
    { headers: { accept: 'application/json' } }
  );

  if (!resp.ok) {
    console.error(`TripAdvisor details error: ${resp.status}`);
    return null;
  }

  const data = await resp.json();

  return {
    location_id: data.location_id,
    name: data.name,
    rating: parseFloat(data.rating) || 0,
    num_reviews: parseInt(data.num_reviews, 10) || 0,
    ranking_string: data.ranking_data?.ranking_string || undefined,
    web_url: data.web_url || undefined,
  };
}

/**
 * Fetch and store TripAdvisor summary for a store.
 */
export async function syncTripAdvisorSummary(
  storeId: number,
  locationId: string
): Promise<TripAdvisorSummary | null> {
  const summary = await getTripAdvisorSummary(locationId);
  if (!summary) return null;

  const { supabaseAdmin } = await import('@/lib/supabase/admin');

  await supabaseAdmin
    .from('platform_summaries')
    .upsert(
      {
        store_id: storeId,
        platform: 'tripadvisor',
        overall_rating: summary.rating,
        review_count: summary.num_reviews,
        fetched_at: new Date().toISOString(),
        meta: {
          location_id: summary.location_id,
          ranking_string: summary.ranking_string,
          web_url: summary.web_url,
        },
      },
      { onConflict: 'store_id,platform' }
    );

  return summary;
}
