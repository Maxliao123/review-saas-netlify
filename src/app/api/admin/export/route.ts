import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/plan-limits';
import { buildCSV } from '@/lib/csv-export';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/export?type=reviews|scans|analytics&store_id=X&from=DATE&to=DATE
 * Returns CSV as text/csv with Content-Disposition header.
 * Plan gating: Starter+ only (free plan blocked).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Plan gating
    if (!hasFeature(ctx.tenant.plan || 'free', 'csvExport')) {
      return NextResponse.json(
        { error: 'CSV export requires a Starter plan or above. Please upgrade.' },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type');
    const storeIdParam = searchParams.get('store_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!type || !['reviews', 'scans', 'analytics'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be reviews, scans, or analytics.' },
        { status: 400 }
      );
    }

    // Scope to tenant's stores
    const storeIds = ctx.stores.map((s) => s.id);
    if (storeIds.length === 0) {
      return csvResponse('export.csv', buildCSV(['No data'], []));
    }

    // If a specific store_id is provided, validate it belongs to tenant
    const filteredStoreIds =
      storeIdParam && storeIds.includes(Number(storeIdParam))
        ? [Number(storeIdParam)]
        : storeIds;

    const storeNameMap = ctx.stores.reduce(
      (acc: Record<number, string>, s) => {
        acc[s.id] = s.name;
        return acc;
      },
      {}
    );

    const supabase = await createSupabaseServerClient();

    let csv: string;
    let filename: string;

    switch (type) {
      case 'reviews':
        ({ csv, filename } = await exportReviews(supabase, filteredStoreIds, storeNameMap, from, to));
        break;
      case 'scans':
        ({ csv, filename } = await exportScans(supabase, filteredStoreIds, storeNameMap, from, to));
        break;
      case 'analytics':
        ({ csv, filename } = await exportAnalytics(supabase, filteredStoreIds, storeNameMap, from, to));
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return csvResponse(filename, csv);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

// ── Reviews Export ──────────────────────────────────────────────────────

async function exportReviews(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storeIds: number[],
  storeNameMap: Record<number, string>,
  from: string | null,
  to: string | null
) {
  let query = supabase
    .from('reviews_raw')
    .select('created_at, platform, author_name, rating, content, reply_status, reply_draft, sentiment, store_id')
    .in('store_id', storeIds)
    .order('created_at', { ascending: false });

  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data: reviews } = await query;

  const headers = ['Date', 'Store', 'Platform', 'Author', 'Rating', 'Content', 'Reply Status', 'Reply Content', 'Sentiment'];
  const rows = (reviews || []).map((r: any) => {
    let replyContent = '';
    if (r.reply_draft) {
      try {
        const parsed = JSON.parse(r.reply_draft);
        replyContent = parsed.draft || r.reply_draft;
      } catch {
        replyContent = r.reply_draft;
      }
    }

    return [
      r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
      storeNameMap[r.store_id] || '',
      r.platform || 'google',
      r.author_name || '',
      r.rating,
      r.content || '',
      r.reply_status || '',
      replyContent,
      r.sentiment || '',
    ];
  });

  const dateStr = new Date().toISOString().split('T')[0];
  return { csv: buildCSV(headers, rows), filename: `reviews-export-${dateStr}.csv` };
}

// ── Scans Export ────────────────────────────────────────────────────────

async function exportScans(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storeIds: number[],
  storeNameMap: Record<number, string>,
  from: string | null,
  to: string | null
) {
  let query = supabase
    .from('scan_events')
    .select('created_at, store_id, source, device_type, city, converted')
    .in('store_id', storeIds)
    .order('created_at', { ascending: false });

  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data: scans } = await query;

  const headers = ['Date', 'Store', 'Source', 'Device', 'City', 'Converted'];
  const rows = (scans || []).map((s: any) => [
    s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '',
    storeNameMap[s.store_id] || '',
    s.source || '',
    s.device_type || '',
    s.city || '',
    s.converted ? 'yes' : 'no',
  ]);

  const dateStr = new Date().toISOString().split('T')[0];
  return { csv: buildCSV(headers, rows), filename: `scans-export-${dateStr}.csv` };
}

// ── Analytics Export ────────────────────────────────────────────────────

async function exportAnalytics(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  storeIds: number[],
  storeNameMap: Record<number, string>,
  from: string | null,
  to: string | null
) {
  // Build date range (default: last 30 days)
  const toDate = to || new Date().toISOString().split('T')[0];
  const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  // Fetch reviews for aggregation
  let reviewQuery = supabase
    .from('reviews_raw')
    .select('created_at, store_id, rating')
    .in('store_id', storeIds)
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .order('created_at', { ascending: true });

  const { data: reviews } = await reviewQuery;

  // Fetch scans for aggregation
  let scanQuery = supabase
    .from('scan_events')
    .select('created_at, store_id, converted')
    .in('store_id', storeIds)
    .gte('created_at', fromDate)
    .lte('created_at', toDate)
    .order('created_at', { ascending: true });

  const { data: scans } = await scanQuery;

  // Aggregate by date + store
  const buckets: Record<string, {
    totalReviews: number;
    ratingSum: number;
    newScans: number;
    reviewsGenerated: number;
    reviewsPosted: number;
  }> = {};

  for (const r of reviews || []) {
    const date = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '';
    const key = `${date}|${r.store_id}`;
    if (!buckets[key]) {
      buckets[key] = { totalReviews: 0, ratingSum: 0, newScans: 0, reviewsGenerated: 0, reviewsPosted: 0 };
    }
    buckets[key].totalReviews += 1;
    buckets[key].ratingSum += r.rating || 0;
  }

  for (const s of scans || []) {
    const date = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '';
    const key = `${date}|${s.store_id}`;
    if (!buckets[key]) {
      buckets[key] = { totalReviews: 0, ratingSum: 0, newScans: 0, reviewsGenerated: 0, reviewsPosted: 0 };
    }
    buckets[key].newScans += 1;
    if (s.converted) {
      buckets[key].reviewsGenerated += 1;
    }
  }

  const headers = ['Date', 'Store', 'Total Reviews', 'Avg Rating', 'New Scans', 'Reviews Generated', 'Reviews Posted'];
  const rows = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      const [date, storeIdStr] = key.split('|');
      const storeId = Number(storeIdStr);
      const avgRating = val.totalReviews > 0 ? (val.ratingSum / val.totalReviews).toFixed(1) : '';
      return [
        date,
        storeNameMap[storeId] || '',
        val.totalReviews,
        avgRating,
        val.newScans,
        val.reviewsGenerated,
        val.reviewsPosted,
      ];
    });

  const dateStr = new Date().toISOString().split('T')[0];
  return { csv: buildCSV(headers, rows), filename: `analytics-export-${dateStr}.csv` };
}
