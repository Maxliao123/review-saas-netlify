import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const ctx = await getUserTenantContext();
  if (!ctx?.tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  const storeId = searchParams.get('store_id');

  const supabase = await createSupabaseServerClient();
  const storeIds = (ctx.stores || []).map((s) => s.id);
  if (storeIds.length === 0) {
    return NextResponse.json({ trend: [], emotions: [], topics: [], platforms: [], distribution: [] });
  }

  const targetStoreIds = storeId ? [Number(storeId)] : storeIds;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString();

  // Fetch all analyzed reviews in range
  const { data: reviews } = await supabase
    .from('reviews_raw')
    .select('rating, sentiment_score, sentiment_label, emotion_tags, key_topics, platform, created_at')
    .in('store_id', targetStoreIds)
    .not('sentiment_analyzed_at', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  const rows = reviews || [];

  // Daily trend
  const trendMap = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const day = r.created_at?.slice(0, 10);
    if (!day) continue;
    const entry = trendMap.get(day) || { total: 0, count: 0 };
    entry.total += r.sentiment_score ?? 0;
    entry.count += 1;
    trendMap.set(day, entry);
  }
  const trend = Array.from(trendMap.entries()).map(([date, { total, count }]) => ({
    date,
    avg_score: Math.round((total / count) * 1000) / 1000,
    count,
  }));

  // Emotion breakdown
  const emotionMap = new Map<string, number>();
  for (const r of rows) {
    if (Array.isArray(r.emotion_tags)) {
      for (const e of r.emotion_tags) {
        emotionMap.set(e, (emotionMap.get(e) || 0) + 1);
      }
    }
  }
  const emotions = Array.from(emotionMap.entries())
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top topics
  const topicMap = new Map<string, { count: number; totalScore: number }>();
  for (const r of rows) {
    if (Array.isArray(r.key_topics)) {
      for (const t of r.key_topics) {
        const entry = topicMap.get(t) || { count: 0, totalScore: 0 };
        entry.count += 1;
        entry.totalScore += r.sentiment_score ?? 0;
        topicMap.set(t, entry);
      }
    }
  }
  const topics = Array.from(topicMap.entries())
    .map(([topic, { count, totalScore }]) => ({
      topic,
      count,
      avg_sentiment: Math.round((totalScore / count) * 1000) / 1000,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // Platform comparison
  const platformMap = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const p = r.platform || 'google';
    const entry = platformMap.get(p) || { total: 0, count: 0 };
    entry.total += r.sentiment_score ?? 0;
    entry.count += 1;
    platformMap.set(p, entry);
  }
  const platforms = Array.from(platformMap.entries()).map(([platform, { total, count }]) => ({
    platform,
    avg_sentiment: Math.round((total / count) * 1000) / 1000,
    review_count: count,
  }));

  // Rating distribution with sentiment
  const distMap = new Map<number, { count: number; totalScore: number }>();
  for (const r of rows) {
    if (!r.rating) continue;
    const entry = distMap.get(r.rating) || { count: 0, totalScore: 0 };
    entry.count += 1;
    entry.totalScore += r.sentiment_score ?? 0;
    distMap.set(r.rating, entry);
  }
  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const entry = distMap.get(rating) || { count: 0, totalScore: 0 };
    return {
      rating,
      count: entry.count,
      avg_sentiment: entry.count > 0 ? Math.round((entry.totalScore / entry.count) * 1000) / 1000 : 0,
    };
  });

  // Label summary
  const labelCounts: Record<string, number> = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
  for (const r of rows) {
    if (r.sentiment_label && r.sentiment_label in labelCounts) {
      labelCounts[r.sentiment_label]++;
    }
  }

  return NextResponse.json({
    trend,
    emotions,
    topics,
    platforms,
    distribution,
    labels: labelCounts,
    total_analyzed: rows.length,
  });
}
