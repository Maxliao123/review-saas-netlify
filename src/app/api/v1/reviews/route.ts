import { NextRequest, NextResponse } from 'next/server';
import { supabase as adminSupabase } from '@/lib/db';
import { hashApiKey, isValidKeyFormat, hasScope, isKeyExpired, checkRateLimit } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

/**
 * Public API: GET /api/v1/reviews
 * List reviews for authenticated tenant.
 *
 * Headers: Authorization: Bearer rm_live_xxxxx
 * Query: ?store_id=123&rating=5&limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate via API key
  const authResult = await authenticateApiKey(request, 'read');
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { tenantId, keyId } = authResult;

  // 2. Parse query params
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('store_id');
  const rating = searchParams.get('rating');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    // 3. Get tenant stores
    const { data: stores } = await adminSupabase
      .from('stores')
      .select('id')
      .eq('tenant_id', tenantId);

    if (!stores || stores.length === 0) {
      return NextResponse.json({ reviews: [], total: 0 });
    }

    const storeIds = storeId
      ? [parseInt(storeId, 10)]
      : stores.map(s => s.id);

    // 4. Build query
    let query = adminSupabase
      .from('reviews_raw')
      .select('id, store_id, author_name, rating, content, platform, reply_status, sentiment_label, created_at, published_at', { count: 'exact' })
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (rating) {
      query = query.eq('rating', parseInt(rating, 10));
    }

    const { data: reviews, count } = await query;

    // 5. Update last_used_at
    await adminSupabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);

    return NextResponse.json({
      reviews: (reviews || []).map(r => ({
        id: r.id,
        storeId: r.store_id,
        author: r.author_name,
        rating: r.rating,
        content: r.content,
        platform: r.platform,
        replyStatus: r.reply_status,
        sentiment: r.sentiment_label,
        createdAt: r.created_at,
        publishedAt: r.published_at,
      })),
      total: count || 0,
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Authenticate request via API key.
 */
async function authenticateApiKey(
  request: NextRequest,
  requiredScope: 'read' | 'write' | 'analytics' | 'admin'
): Promise<{ tenantId: number; keyId: string } | { error: string; status: number }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing Authorization header. Use: Bearer rm_live_xxxxx', status: 401 };
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

  if (!keyRecord) {
    return { error: 'Invalid API key', status: 401 };
  }

  if (!keyRecord.is_active) {
    return { error: 'API key has been revoked', status: 403 };
  }

  if (isKeyExpired(keyRecord.expires_at)) {
    return { error: 'API key has expired', status: 403 };
  }

  if (!hasScope(keyRecord.scopes, requiredScope)) {
    return { error: `API key lacks required scope: ${requiredScope}`, status: 403 };
  }

  // Rate limiting
  const rateCheck = checkRateLimit(keyRecord.id, keyRecord.rate_limit_per_hour);
  if (!rateCheck.allowed) {
    return { error: 'Rate limit exceeded', status: 429 };
  }

  return { tenantId: keyRecord.tenant_id, keyId: keyRecord.id };
}
