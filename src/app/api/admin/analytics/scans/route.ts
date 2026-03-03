import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const days = parseInt(searchParams.get('days') || '30');

    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = supabase
      .from('scan_events')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', parseInt(storeId));
    }

    const { data: scans, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const events = scans || [];

    // Aggregate: daily trend
    const dailyMap = new Map<string, number>();
    events.forEach(e => {
      const day = new Date(e.created_at).toISOString().split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    });
    const trend = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate: by source
    const bySource: Record<string, number> = {};
    events.forEach(e => {
      const src = e.scan_source || 'unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    });

    // Aggregate: by device
    const byDevice: Record<string, number> = {};
    events.forEach(e => {
      const dev = e.device_type || 'unknown';
      byDevice[dev] = (byDevice[dev] || 0) + 1;
    });

    // Aggregate: by OS
    const byOS: Record<string, number> = {};
    events.forEach(e => {
      const os = e.os_type || 'unknown';
      byOS[os] = (byOS[os] || 0) + 1;
    });

    // Top cities
    const cityMap: Record<string, number> = {};
    events.forEach(e => {
      if (e.ip_city) {
        cityMap[e.ip_city] = (cityMap[e.ip_city] || 0) + 1;
      }
    });
    const topCities = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      total: events.length,
      trend,
      bySource,
      byDevice,
      byOS,
      topCities,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
