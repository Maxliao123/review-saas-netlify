import { NextRequest, NextResponse } from 'next/server';
import { supabase as adminSupabase } from '@/lib/db';
import { hashApiKey, isValidKeyFormat, hasScope, isKeyExpired, checkRateLimit } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

/**
 * Public API: GET /api/v1/analytics
 * Summary analytics for authenticated tenant.
 *
 * Headers: Authorization: Bearer rm_live_xxxxx
 * Query: ?days=30
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate
  const authResult = await authenticateApiKey(request, 'analytics');
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { tenantId, keyId } = authResult;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);

  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Get stores
    const { data: stores } = await adminSupabase
      .from('stores')
      .select('id, name')
      .eq('tenant_id', tenantId);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ analytics: null });
    }

    const storeIds = stores.map(s => s.id);

    // Get reviews
    const { data: reviews } = await adminSupabase
      .from('reviews_raw')
      .select('store_id, rating, reply_status, created_at')
      .in('store_id', storeIds)
      .gte('created_at', sinceDate.toISOString());

    const allReviews = reviews || [];
    const total = allReviews.length;
    const avgRating = total > 0
      ? Math.round((allReviews.reduce((s, r) => s + r.rating, 0) / total) * 100) / 100
      : 0;
    const replied = allReviews.filter(r => r.reply_status === 'published').length;
    const responseRate = total > 0 ? Math.round((replied / total) * 100) : 0;
    const positive = allReviews.filter(r => r.rating >= 4).length;
    const positiveRatio = total > 0 ? Math.round((positive / total) * 100) : 0;

    // Rating distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of allReviews) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }

    // Update last_used_at
    await adminSupabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);

    return NextResponse.json({
      analytics: {
        period: { days, from: sinceDate.toISOString(), to: new Date().toISOString() },
        totalReviews: total,
        avgRating,
        responseRate,
        positiveRatio,
        distribution,
        stores: stores.map(s => {
          const storeReviews = allReviews.filter(r => r.store_id === s.id);
          return {
            id: s.id,
            name: s.name,
            reviewCount: storeReviews.length,
            avgRating: storeReviews.length > 0
              ? Math.round((storeReviews.reduce((sum, r) => sum + r.rating, 0) / storeReviews.length) * 100) / 100
              : 0,
          };
        }),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function authenticateApiKey(
  request: NextRequest,
  requiredScope: 'read' | 'write' | 'analytics' | 'admin'
): Promise<{ tenantId: number; keyId: string } | { error: string; status: number }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing Authorization header', status: 401 };
  }

  const apiKey = authHeader.slice(7);
  if (!isValidKeyFormat(apiKey)) {
    return { error: 'Invalid API key format', status: 401 };
  }

  const keyHash = hashApiKey(apiKey);

  const { data: keyRecord } = await adminSupabase
    .from('api_keys')
    .select('id, tenant_id, scopes, rate_limit_per_hour, expires_at, is_active')
    .eq('key_hash', keyHash)
    .single();

  if (!keyRecord || !keyRecord.is_active) {
    return { error: 'Invalid or revoked API key', status: 401 };
  }

  if (isKeyExpired(keyRecord.expires_at)) {
    return { error: 'API key expired', status: 403 };
  }

  if (!hasScope(keyRecord.scopes, requiredScope)) {
    return { error: `Missing scope: ${requiredScope}`, status: 403 };
  }

  const rateCheck = checkRateLimit(keyRecord.id, keyRecord.rate_limit_per_hour);
  if (!rateCheck.allowed) {
    return { error: 'Rate limit exceeded', status: 429 };
  }

  return { tenantId: keyRecord.tenant_id, keyId: keyRecord.id };
}
