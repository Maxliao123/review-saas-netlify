import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';
import { hasFeature } from '@/lib/plan-limits';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getUserTenantContext();
    if (!ctx?.tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Feature gate: Pro or Enterprise only
    if (!hasFeature(ctx.tenant.plan, 'advancedAnalytics') || !['pro', 'enterprise'].includes(ctx.tenant.plan)) {
      return NextResponse.json({ error: 'Upgrade to Pro to access Google Maps analytics' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rawDays = parseInt(searchParams.get('days') || '30', 10);
    const days = Number.isNaN(rawDays) || rawDays < 1 || rawDays > 365 ? 30 : rawDays;
    const storeId = searchParams.get('store_id');

    const supabase = await createSupabaseServerClient();
    const storeIds = (ctx.stores || []).map((s) => s.id);

    if (storeIds.length === 0) {
      return NextResponse.json({
        timeSeries: [],
        summary: {
          direction_requests: 0,
          phone_calls: 0,
          website_clicks: 0,
          search_impressions: 0,
          photo_views: 0,
        },
        previousSummary: {
          direction_requests: 0,
          phone_calls: 0,
          website_clicks: 0,
          search_impressions: 0,
          photo_views: 0,
        },
      });
    }

    // Validate that store_id belongs to the tenant's stores
    const targetStoreIds = storeId && storeIds.includes(Number(storeId)) ? [Number(storeId)] : storeIds;

    // Current period
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const since = sinceDate.toISOString().split('T')[0];

    // Previous period (for % change calculation)
    const prevEndDate = new Date(sinceDate);
    prevEndDate.setDate(prevEndDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const prevSince = prevStartDate.toISOString().split('T')[0];
    const prevEnd = prevEndDate.toISOString().split('T')[0];

    // Fetch current period time-series
    const { data: metrics } = await supabase
      .from('google_maps_metrics')
      .select('date, direction_requests, phone_calls, website_clicks, search_impressions, photo_views')
      .in('store_id', targetStoreIds)
      .gte('date', since)
      .order('date', { ascending: true });

    // Fetch previous period for comparison
    const { data: prevMetrics } = await supabase
      .from('google_maps_metrics')
      .select('direction_requests, phone_calls, website_clicks, search_impressions, photo_views')
      .in('store_id', targetStoreIds)
      .gte('date', prevSince)
      .lte('date', prevEnd);

    const rows = metrics || [];
    const prevRows = prevMetrics || [];

    // Aggregate time-series by date (sum across stores if multi-store)
    const dateMap = new Map<string, {
      direction_requests: number;
      phone_calls: number;
      website_clicks: number;
      search_impressions: number;
      photo_views: number;
    }>();

    for (const row of rows) {
      const existing = dateMap.get(row.date) || {
        direction_requests: 0,
        phone_calls: 0,
        website_clicks: 0,
        search_impressions: 0,
        photo_views: 0,
      };
      existing.direction_requests += row.direction_requests || 0;
      existing.phone_calls += row.phone_calls || 0;
      existing.website_clicks += row.website_clicks || 0;
      existing.search_impressions += row.search_impressions || 0;
      existing.photo_views += row.photo_views || 0;
      dateMap.set(row.date, existing);
    }

    const timeSeries = Array.from(dateMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Current period summary
    const summary = {
      direction_requests: rows.reduce((s, r) => s + (r.direction_requests || 0), 0),
      phone_calls: rows.reduce((s, r) => s + (r.phone_calls || 0), 0),
      website_clicks: rows.reduce((s, r) => s + (r.website_clicks || 0), 0),
      search_impressions: rows.reduce((s, r) => s + (r.search_impressions || 0), 0),
      photo_views: rows.reduce((s, r) => s + (r.photo_views || 0), 0),
    };

    // Previous period summary
    const previousSummary = {
      direction_requests: prevRows.reduce((s, r) => s + (r.direction_requests || 0), 0),
      phone_calls: prevRows.reduce((s, r) => s + (r.phone_calls || 0), 0),
      website_clicks: prevRows.reduce((s, r) => s + (r.website_clicks || 0), 0),
      search_impressions: prevRows.reduce((s, r) => s + (r.search_impressions || 0), 0),
      photo_views: prevRows.reduce((s, r) => s + (r.photo_views || 0), 0),
    };

    return NextResponse.json({ timeSeries, summary, previousSummary });
  } catch (err: any) {
    console.error('Error in google-maps-analytics:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
