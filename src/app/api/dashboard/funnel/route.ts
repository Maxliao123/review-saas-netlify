import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/funnel?days=30&store_id=1
 *
 * Returns QR scan conversion funnel data:
 * scans → generated reviews → posted reviews
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365);
    const storeIdParam = searchParams.get('store_id');

    const since = new Date(Date.now() - days * 86400000).toISOString();
    const storeIds = ctx.stores.map(s => s.id);

    if (storeIds.length === 0) {
      return NextResponse.json({ scans: 0, generated: 0, posted: 0, rates: { scanToGenerate: 0, generateToPost: 0, overall: 0 } });
    }

    const supabase = await createSupabaseServerClient();

    // Filter by specific store if provided
    const filterStoreIds = storeIdParam ? [parseInt(storeIdParam, 10)].filter(id => storeIds.includes(id)) : storeIds;

    if (filterStoreIds.length === 0) {
      return NextResponse.json({ scans: 0, generated: 0, posted: 0, rates: { scanToGenerate: 0, generateToPost: 0, overall: 0 } });
    }

    // Three parallel count queries
    const [scans, generated, posted] = await Promise.all([
      supabase
        .from('scan_events')
        .select('id', { count: 'exact', head: true })
        .in('store_id', filterStoreIds)
        .gte('created_at', since),

      supabase
        .from('generated_reviews')
        .select('id', { count: 'exact', head: true })
        .in('store_id', filterStoreIds)
        .gte('created_at', since),

      supabase
        .from('generated_reviews')
        .select('id', { count: 'exact', head: true })
        .in('store_id', filterStoreIds)
        .eq('likely_posted', true)
        .gte('created_at', since),
    ]);

    const scanCount = scans.count || 0;
    const genCount = generated.count || 0;
    const postCount = posted.count || 0;

    return NextResponse.json({
      scans: scanCount,
      generated: genCount,
      posted: postCount,
      rates: {
        scanToGenerate: scanCount > 0 ? Math.round((genCount / scanCount) * 100) : 0,
        generateToPost: genCount > 0 ? Math.round((postCount / genCount) * 100) : 0,
        overall: scanCount > 0 ? Math.round((postCount / scanCount) * 100) : 0,
      },
    });
  } catch (err: any) {
    console.error('Funnel API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
