import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashIP } from '@/lib/referral';
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const CLICK_RATE_LIMIT = { limit: 30, windowSeconds: 60 };

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = getClientIP(request);
  const rl = checkRateLimit(`referral-click:${ip}`, CLICK_RATE_LIMIT);
  const rlResponse = rateLimitResponse(rl);
  if (rlResponse) return rlResponse;

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { code } = body;
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing referral code' }, { status: 400 });
  }

  // Verify the referral code exists
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('referral_code', code)
    .single();

  if (!tenant) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  // Hash the IP for privacy
  const ipHash = hashIP(ip);

  // Insert click record
  const { error } = await supabaseAdmin
    .from('referral_clicks')
    .insert({
      referral_code: code,
      ip_hash: ipHash,
      referrer_url: request.headers.get('referer') || null,
      user_agent: request.headers.get('user-agent') || null,
    });

  if (error) {
    console.error('Failed to record referral click:', error);
    return NextResponse.json({ error: 'Failed to record click' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
