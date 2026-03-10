import { NextRequest, NextResponse } from 'next/server';

/**
 * Public API: Look up a Google Business listing to get review count & rating.
 * Used by the ROI Calculator tool on the marketing site.
 *
 * Accepts either:
 *  - A Google Maps URL (extracts place_id or searches by name)
 *  - A business name + optional location
 *
 * Uses Google Places API (New) — cost covered by $200/mo free tier.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

// Simple in-memory rate limit: max 30 requests per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Extract place_id from various Google Maps URL formats
function extractPlaceId(url: string): string | null {
  // Format: ...place_id:ChIJ...
  const placeIdMatch = url.match(/place_id[=:]([A-Za-z0-9_-]+)/);
  if (placeIdMatch) return placeIdMatch[1];

  // Format: ...data=...!1s0x...!... (CID format — can't use directly)
  return null;
}

// Extract search query from Google Maps URL
function extractSearchQuery(url: string): string | null {
  // Format: google.com/maps/place/Business+Name/...
  const placeMatch = url.match(/maps\/place\/([^/@]+)/);
  if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));

  // Format: google.com/maps/search/...
  const searchMatch = url.match(/maps\/search\/([^/]+)/);
  if (searchMatch) return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));

  return null;
}

async function searchPlace(query: string): Promise<{ placeId: string } | null> {
  const res = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  const place = data.places?.[0];
  if (!place) return null;

  return { placeId: place.id };
}

async function getPlaceDetails(placeId: string) {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask':
          'id,displayName,formattedAddress,rating,userRatingCount,types,primaryType,googleMapsUri',
      },
    }
  );

  if (!res.ok) return null;
  return res.json();
}

// Map Google place types to our industry categories
function mapToIndustry(types: string[]): string {
  const typeSet = new Set(types || []);
  if (typeSet.has('restaurant') || typeSet.has('cafe') || typeSet.has('bakery') || typeSet.has('bar') || typeSet.has('meal_takeaway'))
    return 'restaurant';
  if (typeSet.has('lodging') || typeSet.has('hotel') || typeSet.has('motel'))
    return 'hotel';
  if (typeSet.has('doctor') || typeSet.has('dentist') || typeSet.has('hospital') || typeSet.has('health') || typeSet.has('physiotherapist'))
    return 'clinic';
  if (typeSet.has('hair_care') || typeSet.has('beauty_salon') || typeSet.has('spa'))
    return 'salon';
  if (typeSet.has('car_repair') || typeSet.has('car_dealer') || typeSet.has('car_wash'))
    return 'auto';
  if (typeSet.has('store') || typeSet.has('shopping_mall') || typeSet.has('clothing_store') || typeSet.has('electronics_store'))
    return 'retail';
  return 'other';
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'Google Places API not configured' }, { status: 500 });
  }

  // Rate limit
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { url, query } = body as { url?: string; query?: string };

    if (!url && !query) {
      return NextResponse.json({ error: 'Provide a Google Maps URL or business name' }, { status: 400 });
    }

    let placeId: string | null = null;

    if (url) {
      // Try to extract place_id directly from URL
      placeId = extractPlaceId(url);

      // If no place_id, extract search query from URL and search
      if (!placeId) {
        const searchQuery = extractSearchQuery(url);
        if (searchQuery) {
          const result = await searchPlace(searchQuery);
          placeId = result?.placeId || null;
        }
      }
    }

    // Fallback: use query param to search
    if (!placeId && query) {
      const result = await searchPlace(query);
      placeId = result?.placeId || null;
    }

    if (!placeId) {
      return NextResponse.json(
        { error: 'Could not find the business. Try entering the business name instead.' },
        { status: 404 }
      );
    }

    // Get place details
    const details = await getPlaceDetails(placeId);
    if (!details) {
      return NextResponse.json({ error: 'Could not fetch business details' }, { status: 404 });
    }

    return NextResponse.json({
      name: details.displayName?.text || '',
      address: details.formattedAddress || '',
      rating: details.rating || 0,
      reviewCount: details.userRatingCount || 0,
      industry: mapToIndustry(details.types || []),
      googleMapsUrl: details.googleMapsUri || '',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to look up business' }, { status: 500 });
  }
}
