import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiDays = parseInt(searchParams.get('days') || '30', 10);
    const storeId = parseInt(searchParams.get('store_id') || '1', 10);

    // Complex query replacement (WITH exploded...)
    // This is hard to replicate exactly with supabase-js without RPC.
    // We will fetch raw events and aggregate in JS for now as a migration step.

    const { data: events, error } = await supabase
      .from('generator_events')
      .select('event_type, tags_used')
      .eq('store_id', storeId)
      .gte('created_at', new Date(Date.now() - apiDays * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // JS Aggregation
    const tagStats: Record<string, { generated: number; clicked: number }> = {};

    events?.forEach((evt: any) => {
      if (!evt.tags_used || !Array.isArray(evt.tags_used)) return;

      evt.tags_used.forEach((tag: string) => {
        if (!tagStats[tag]) tagStats[tag] = { generated: 0, clicked: 0 };

        if (evt.event_type === 'generate') tagStats[tag].generated++;
        if (evt.event_type === 'click_google') tagStats[tag].clicked++;
      });
    });

    const rows = Object.entries(tagStats).map(([tag, stat]) => ({
      tag,
      generated_count: stat.generated,
      clicked_count: stat.clicked,
      click_rate_pct: stat.generated > 0 ? (stat.clicked / stat.generated) * 100 : 0
    })).sort((a, b) => b.generated_count - a.generated_count);

    return NextResponse.json(rows, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (err: any) {
    console.error("tag-funnel error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
