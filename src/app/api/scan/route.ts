import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { parseUserAgent } from '@/lib/scan/parse-user-agent';
import { geoLookup } from '@/lib/scan/geo-lookup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_id, scan_source, referrer: clientReferrer } = body;

    if (!store_id) {
      return NextResponse.json({ error: 'store_id required' }, { status: 400 });
    }

    // Extract metadata from request
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const referrer = clientReferrer || request.headers.get('referer') || null;
    const language = request.headers.get('accept-language')?.split(',')[0] || null;

    // Parse user agent
    const { device_type, os_type, browser } = parseUserAgent(userAgent);

    // Geo lookup (fire-and-forget friendly — non-blocking with 2s timeout)
    const geo = await geoLookup(ip);

    // Insert scan event
    const { error } = await supabase.from('scan_events').insert({
      store_id,
      scan_source: scan_source || 'unknown',
      device_type,
      os_type,
      browser,
      ip_city: geo.city,
      ip_country: geo.country,
      referrer,
      user_agent: userAgent.substring(0, 500), // Truncate long UAs
      language,
    });

    if (error) {
      console.error('Scan event insert error:', error);
      return NextResponse.json({ error: 'Failed to log scan' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Scan tracking error:', error);
    return NextResponse.json({ ok: true }); // Never fail the user experience
  }
}

// CORS headers for cross-origin requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
