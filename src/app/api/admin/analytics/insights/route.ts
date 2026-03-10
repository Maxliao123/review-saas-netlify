import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getUserTenantContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
    return NextResponse.json({
      topicCloud: [], categories: [], negativeHotspots: [], positiveHighlights: [],
      summary: { total_reviews: 0, avg_rating: 0, avg_sentiment: 0, negative_pct: 0 },
    });
  }

  const targetStoreIds = storeId ? [Number(storeId)] : storeIds;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString();

  // Fetch all reviews with sentiment data
  const { data: reviews } = await supabase
    .from('reviews_raw')
    .select('id, author_name, rating, content, sentiment_score, sentiment_label, key_topics, reply_draft, created_at')
    .in('store_id', targetStoreIds)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  const rows = reviews || [];

  // 1. Topic Cloud — aggregate key_topics with sentiment
  const topicMap = new Map<string, { count: number; totalSentiment: number }>();
  for (const r of rows) {
    if (Array.isArray(r.key_topics)) {
      for (const t of r.key_topics) {
        const entry = topicMap.get(t) || { count: 0, totalSentiment: 0 };
        entry.count += 1;
        entry.totalSentiment += r.sentiment_score ?? 0;
        topicMap.set(t, entry);
      }
    }
  }
  const topicCloud = Array.from(topicMap.entries())
    .map(([topic, { count, totalSentiment }]) => ({
      topic,
      count,
      avg_sentiment: Math.round((totalSentiment / count) * 1000) / 1000,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  // 2. Category Breakdown — from reply_draft JSON
  const categoryMap = new Map<string, { count: number; totalRating: number; totalSentiment: number }>();
  for (const r of rows) {
    if (!r.reply_draft) continue;
    let category = '';
    try {
      const parsed = JSON.parse(r.reply_draft);
      category = parsed.category || '';
    } catch {
      continue;
    }
    if (!category || category === 'Legacy/Manual' || category === 'Parsing Error') continue;
    const entry = categoryMap.get(category) || { count: 0, totalRating: 0, totalSentiment: 0 };
    entry.count += 1;
    entry.totalRating += r.rating || 0;
    entry.totalSentiment += r.sentiment_score ?? 0;
    categoryMap.set(category, entry);
  }
  const categories = Array.from(categoryMap.entries())
    .map(([category, { count, totalRating, totalSentiment }]) => ({
      category,
      count,
      avg_rating: Math.round((totalRating / count) * 10) / 10,
      avg_sentiment: Math.round((totalSentiment / count) * 1000) / 1000,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // 3. Negative Hotspots — topics from negative reviews with sample reviews
  const negTopicMap = new Map<string, { count: number; reviews: Array<{ author: string; content: string; rating: number }> }>();
  for (const r of rows) {
    if ((r.sentiment_score ?? 0) >= 0) continue;
    if (Array.isArray(r.key_topics)) {
      for (const t of r.key_topics) {
        const entry = negTopicMap.get(t) || { count: 0, reviews: [] };
        entry.count += 1;
        if (entry.reviews.length < 2) {
          entry.reviews.push({
            author: r.author_name || 'Anonymous',
            content: (r.content || '').slice(0, 200),
            rating: r.rating,
          });
        }
        negTopicMap.set(t, entry);
      }
    }
  }
  const negativeHotspots = Array.from(negTopicMap.entries())
    .map(([topic, { count, reviews }]) => ({ topic, count, reviews }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 4. Positive Highlights — topics from positive reviews
  const posTopicMap = new Map<string, { count: number; reviews: Array<{ author: string; content: string; rating: number }> }>();
  for (const r of rows) {
    if ((r.sentiment_score ?? 0) <= 0.3) continue;
    if (Array.isArray(r.key_topics)) {
      for (const t of r.key_topics) {
        const entry = posTopicMap.get(t) || { count: 0, reviews: [] };
        entry.count += 1;
        if (entry.reviews.length < 2) {
          entry.reviews.push({
            author: r.author_name || 'Anonymous',
            content: (r.content || '').slice(0, 200),
            rating: r.rating,
          });
        }
        posTopicMap.set(t, entry);
      }
    }
  }
  const positiveHighlights = Array.from(posTopicMap.entries())
    .map(([topic, { count, reviews }]) => ({ topic, count, reviews }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 5. Summary stats
  const totalReviews = rows.length;
  const avgRating = totalReviews > 0
    ? Math.round((rows.reduce((s, r) => s + (r.rating || 0), 0) / totalReviews) * 10) / 10
    : 0;
  const avgSentiment = totalReviews > 0
    ? Math.round((rows.reduce((s, r) => s + (r.sentiment_score ?? 0), 0) / totalReviews) * 1000) / 1000
    : 0;
  const negativeCount = rows.filter(r => (r.sentiment_score ?? 0) < 0).length;
  const negativePct = totalReviews > 0 ? Math.round((negativeCount / totalReviews) * 100) : 0;

  return NextResponse.json({
    topicCloud,
    categories,
    negativeHotspots,
    positiveHighlights,
    summary: {
      total_reviews: totalReviews,
      avg_rating: avgRating,
      avg_sentiment: avgSentiment,
      negative_pct: negativePct,
    },
  });
}
