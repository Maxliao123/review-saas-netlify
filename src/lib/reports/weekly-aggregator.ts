import { supabaseAdmin } from '@/lib/supabase/admin';

export interface WeeklyReportData {
  period: { start: string; end: string };
  reviews: {
    total_new: number;
    avg_rating: number;
    rating_distribution: Record<number, number>;
    negative_count: number;
    vs_last_week: {
      rating_trend: 'up' | 'down' | 'flat';
      volume_change_pct: number;
    };
  };
  replies: {
    total_replied: number;
    reply_rate_pct: number;
  };
  top_complaints: Array<{ category: string; count: number }>;
  scans: {
    total: number;
    by_source: Record<string, number>;
    top_cities: Array<{ city: string; count: number }>;
  };
  generation: {
    reviews_generated: number;
    likely_posted: number;
    conversion_rate_pct: number;
  };
}

export async function generateWeeklyReport(
  storeId: number,
  weekStart: Date
): Promise<WeeklyReportData> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  // 1. Current week reviews
  const { data: reviews } = await supabaseAdmin
    .from('reviews_raw')
    .select('rating, reply_status, reply_draft, created_at')
    .eq('store_id', storeId)
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString());

  // 2. Previous week reviews (for trend)
  const { data: prevReviews } = await supabaseAdmin
    .from('reviews_raw')
    .select('rating')
    .eq('store_id', storeId)
    .gte('created_at', prevWeekStart.toISOString())
    .lt('created_at', weekStart.toISOString());

  // 3. Scan events
  const { data: scans } = await supabaseAdmin
    .from('scan_events')
    .select('scan_source, ip_city')
    .eq('store_id', storeId)
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString());

  // 4. Generated reviews
  const { data: generated } = await supabaseAdmin
    .from('generated_reviews')
    .select('likely_posted')
    .eq('store_id', storeId)
    .gte('created_at', weekStart.toISOString())
    .lt('created_at', weekEnd.toISOString());

  // --- Compute metrics ---
  const currentReviews = reviews || [];
  const prevReviewsList = prevReviews || [];
  const scansList = scans || [];
  const genList = generated || [];

  // Rating distribution
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  currentReviews.forEach(r => {
    ratingDist[r.rating] = (ratingDist[r.rating] || 0) + 1;
    ratingSum += r.rating;
  });

  const avgRating = currentReviews.length > 0 ? ratingSum / currentReviews.length : 0;
  const prevAvg = prevReviewsList.length > 0
    ? prevReviewsList.reduce((s, r) => s + r.rating, 0) / prevReviewsList.length
    : 0;

  const volumeChange = prevReviewsList.length > 0
    ? ((currentReviews.length - prevReviewsList.length) / prevReviewsList.length) * 100
    : 0;

  // Reply metrics
  const replied = currentReviews.filter(r =>
    r.reply_status === 'published' || r.reply_status === 'approved'
  ).length;

  // Top complaints from AI categories
  const categoryCounts: Record<string, number> = {};
  currentReviews.forEach(r => {
    if (r.reply_draft && r.rating <= 3) {
      try {
        const parsed = JSON.parse(r.reply_draft);
        const cat = parsed.category || 'Unknown';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      } catch { /* ignore */ }
    }
  });

  const topComplaints = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Scan breakdown
  const bySource: Record<string, number> = {};
  const cityMap: Record<string, number> = {};
  scansList.forEach(s => {
    bySource[s.scan_source || 'unknown'] = (bySource[s.scan_source || 'unknown'] || 0) + 1;
    if (s.ip_city) {
      cityMap[s.ip_city] = (cityMap[s.ip_city] || 0) + 1;
    }
  });

  const topCities = Object.entries(cityMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Generation metrics
  const likelyPosted = genList.filter(g => g.likely_posted).length;

  return {
    period: {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
    },
    reviews: {
      total_new: currentReviews.length,
      avg_rating: Math.round(avgRating * 10) / 10,
      rating_distribution: ratingDist,
      negative_count: currentReviews.filter(r => r.rating <= 3).length,
      vs_last_week: {
        rating_trend: avgRating > prevAvg + 0.1 ? 'up' : avgRating < prevAvg - 0.1 ? 'down' : 'flat',
        volume_change_pct: Math.round(volumeChange),
      },
    },
    replies: {
      total_replied: replied,
      reply_rate_pct: currentReviews.length > 0 ? Math.round((replied / currentReviews.length) * 100) : 0,
    },
    top_complaints: topComplaints,
    scans: {
      total: scansList.length,
      by_source: bySource,
      top_cities: topCities,
    },
    generation: {
      reviews_generated: genList.length,
      likely_posted: likelyPosted,
      conversion_rate_pct: genList.length > 0 ? Math.round((likelyPosted / genList.length) * 100) : 0,
    },
  };
}
