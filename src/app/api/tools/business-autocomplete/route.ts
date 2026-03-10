import { NextRequest, NextResponse } from 'next/server';

/**
 * Public API: Search businesses for the ROI Calculator autocomplete.
 *
 * Uses Google Places API (New) — Text Search endpoint.
 * Returns up to 5 business results with name, address, rating, reviewCount.
 *
 * Why Text Search instead of Autocomplete:
 *  - Text Search returns rating + userRatingCount in one call
 *  - Can filter to only businesses (not streets/addresses)
 *  - No need for a second lookup API call after selection
 *
 * Cost: ~$32/1000 requests (Text Search Basic), covered by $200/mo free tier.
 * With rate limiting (60 req/IP/hour), cost is well controlled.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

// Simple in-memory rate limit: max 60 requests per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000;

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

// Map Google place types to our industry categories
function mapToIndustry(types: string[]): string {
  const typeSet = new Set(types || []);
  if (
    typeSet.has('restaurant') ||
    typeSet.has('cafe') ||
    typeSet.has('bakery') ||
    typeSet.has('bar') ||
    typeSet.has('meal_takeaway')
  )
    return 'restaurant';
  if (typeSet.has('lodging') || typeSet.has('hotel') || typeSet.has('motel'))
    return 'hotel';
  if (
    typeSet.has('doctor') ||
    typeSet.has('dentist') ||
    typeSet.has('hospital') ||
    typeSet.has('health') ||
    typeSet.has('physiotherapist')
  )
    return 'clinic';
  if (typeSet.has('hair_care') || typeSet.has('beauty_salon') || typeSet.has('spa'))
    return 'salon';
  if (typeSet.has('car_repair') || typeSet.has('car_dealer') || typeSet.has('car_wash'))
    return 'auto';
  if (
    typeSet.has('store') ||
    typeSet.has('shopping_mall') ||
    typeSet.has('clothing_store') ||
    typeSet.has('electronics_store')
  )
    return 'retail';
  return 'other';
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { input } = (await request.json()) as { input?: string };
    if (!input || input.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Use Text Search to get businesses WITH rating + review count
    const res = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.primaryType',
        },
        body: JSON.stringify({
          textQuery: input.trim(),
          maxResultCount: 5,
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();
    const places = data.places || [];

    // Filter: only return results that have reviews (= real businesses)
    const suggestions = places
      .filter(
        (p: Record<string, unknown>) =>
          (p.userRatingCount as number) > 0 || (p.rating as number) > 0
      )
      .slice(0, 5)
      .map(
        (p: {
          id: string;
          displayName?: { text: string };
          formattedAddress?: string;
          rating?: number;
          userRatingCount?: number;
          types?: string[];
        }) => ({
          placeId: p.id,
          name: p.displayName?.text || '',
          address: p.formattedAddress || '',
          rating: p.rating || 0,
          reviewCount: p.userRatingCount || 0,
          industry: mapToIndustry(p.types || []),
        })
      );

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
