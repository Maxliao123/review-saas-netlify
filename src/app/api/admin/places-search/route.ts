import { NextRequest, NextResponse } from 'next/server';
import { getUserTenantContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

/**
 * GET /api/admin/places-search?q=店名
 * Search Google Places and return matching businesses with name, address, place_id
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get('q');
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
    }

    // Use Google Places Text Search (New) API
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 8,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[PlacesSearch] Google API error:', res.status, err);
      return NextResponse.json({ error: 'Google Places search failed' }, { status: 502 });
    }

    const data = await res.json();
    const results = (data.places || []).map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      rating: place.rating || null,
      reviewCount: place.userRatingCount || 0,
      mapsUrl: place.googleMapsUri || '',
      types: (place.types || []).slice(0, 3),
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[PlacesSearch]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
