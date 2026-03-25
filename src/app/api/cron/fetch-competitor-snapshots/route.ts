import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/fetch-competitor-snapshots?cron_secret=xxx
 *
 * Daily cron job that fetches current rating/review_count for all tracked competitors
 * from Google Places API and stores snapshots for historical trending.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('cron_secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, { status: 500 });
    }

    // Fetch all tracked competitors
    const { data: competitors, error: fetchError } = await supabaseAdmin
      .from('competitor_tracking')
      .select('id, competitor_place_id, competitor_name');

    if (fetchError) {
      console.error('Failed to fetch competitor_tracking:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ message: 'No tracked competitors', updated: 0 });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let updated = 0;
    let errors = 0;

    // Process in batches of 5 to avoid rate limiting
    for (let i = 0; i < competitors.length; i += 5) {
      const batch = competitors.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (comp) => {
          const details = await fetchPlaceDetails(googleApiKey, comp.competitor_place_id);
          if (!details) return;

          // Update current values in competitor_tracking
          await supabaseAdmin
            .from('competitor_tracking')
            .update({
              current_rating: details.rating,
              current_review_count: details.reviewCount,
              last_fetched_at: new Date().toISOString(),
            })
            .eq('id', comp.id);

          // Upsert daily snapshot
          await supabaseAdmin
            .from('competitor_snapshots')
            .upsert(
              {
                competitor_id: comp.id,
                snapshot_date: today,
                rating: details.rating,
                review_count: details.reviewCount,
              },
              { onConflict: 'competitor_id,snapshot_date' }
            );

          updated++;
        })
      );

      results.forEach((r) => {
        if (r.status === 'rejected') {
          console.error('Competitor snapshot error:', r.reason);
          errors++;
        }
      });
    }

    return NextResponse.json({
      message: 'Competitor snapshots updated',
      total: competitors.length,
      updated,
      errors,
    });
  } catch (error: any) {
    console.error('Cron fetch-competitor-snapshots error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Fetch rating and review count for a place from Google Places API.
 */
async function fetchPlaceDetails(
  apiKey: string,
  placeId: string
): Promise<{ rating: number; reviewCount: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.result) return null;

  return {
    rating: data.result.rating ?? 0,
    reviewCount: data.result.user_ratings_total ?? 0,
  };
}
