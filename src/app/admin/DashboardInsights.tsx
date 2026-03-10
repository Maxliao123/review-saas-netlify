'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ThumbsDown,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trophy,
} from 'lucide-react';

interface TopicItem {
  topic: string;
  count: number;
  avg_sentiment: number;
}

interface HotspotItem {
  topic: string;
  count: number;
  reviews: Array<{ author: string; content: string; rating: number }>;
}

interface InsightsData {
  topicCloud: TopicItem[];
  negativeHotspots: HotspotItem[];
  positiveHighlights: HotspotItem[];
  categories: Array<{ category: string; count: number; avg_rating: number; avg_sentiment: number }>;
  summary: {
    total_reviews: number;
    avg_rating: number;
    avg_sentiment: number;
    negative_pct: number;
  };
}

function sentimentColor(score: number): string {
  if (score >= 0.3) return '#16a34a';
  if (score >= 0) return '#65a30d';
  if (score >= -0.3) return '#d97706';
  return '#dc2626';
}

interface RegionalStanding {
  yourRating: number;
  regionAvg: number;
  percentile: number;
  competitorCount: number;
}

export default function DashboardInsights({ pendingReplies }: { pendingReplies: number }) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [regional, setRegional] = useState<RegionalStanding | null>(null);

  useEffect(() => {
    fetch('/api/admin/analytics/insights?days=30')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    // Regional standing (optional, graceful fail)
    fetch('/api/admin/analytics/competitors')
      .then((r) => r.json())
      .then((d) => {
        if (d.stores?.length > 0) {
          const yourRating = d.stores.reduce(
            (best: number, s: any) => Math.max(best, s.avgRating), 0
          );
          const competitors = d.competitors || [];
          if (competitors.length > 0) {
            const allRatings = competitors.map((c: any) => c.rating).filter((r: number) => r > 0);
            const regionAvg = allRatings.length > 0
              ? allRatings.reduce((s: number, r: number) => s + r, 0) / allRatings.length
              : 0;
            const beaten = allRatings.filter((r: number) => yourRating > r).length;
            const percentile = allRatings.length > 0
              ? Math.round((beaten / allRatings.length) * 100)
              : 0;
            setRegional({ yourRating, regionAvg: Math.round(regionAvg * 10) / 10, percentile, competitorCount: allRatings.length });
          }
        }
      })
      .catch(() => { /* no competitor data — skip silently */ });
  }, []);

  // Load cached suggestions
  useEffect(() => {
    const cached = localStorage.getItem('insights_report');
    if (cached) {
      try {
        const { suggestions: s, date } = JSON.parse(cached);
        const today = new Date().toISOString().slice(0, 10);
        if (date === today && Array.isArray(s)) setSuggestions(s);
      } catch { /* ignore */ }
    }
  }, []);

  const generateReport = useCallback(async () => {
    if (!data || generatingReport) return;
    setGeneratingReport(true);
    try {
      const res = await fetch('/api/admin/analytics/insights/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negativeTopics: data.negativeHotspots,
          positiveTopics: data.positiveHighlights,
          categories: data.categories,
          avgRating: data.summary.avg_rating,
          totalReviews: data.summary.total_reviews,
          negativePct: data.summary.negative_pct,
        }),
      });
      const result = await res.json();
      const s = result.suggestions || [];
      setSuggestions(s);
      localStorage.setItem('insights_report', JSON.stringify({
        suggestions: s,
        date: new Date().toISOString().slice(0, 10),
      }));
    } catch (err) {
      console.error('Report generation failed:', err);
    }
    setGeneratingReport(false);
  }, [data, generatingReport]);

  const negativeCount = data?.summary?.negative_pct
    ? Math.round((data.summary.negative_pct / 100) * (data.summary.total_reviews || 0))
    : 0;

  return (
    <div className="space-y-6">
      {/* Today's Actions */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Action Items</h2>
        <div className="flex flex-wrap gap-3">
          {pendingReplies > 0 ? (
            <Link
              href="/admin/reviews"
              className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 hover:bg-amber-100 transition-colors flex-1 min-w-[200px]"
            >
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium text-amber-900">
                {pendingReplies} reply draft{pendingReplies !== 1 ? 's' : ''} awaiting approval
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-amber-500 ml-auto" />
            </Link>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 flex-1 min-w-[200px]">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-700">All replies handled</span>
            </div>
          )}
          {negativeCount > 0 && (
            <Link
              href="/admin/analytics/insights"
              className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 hover:bg-red-100 transition-colors flex-1 min-w-[200px]"
            >
              <ThumbsDown className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-sm font-medium text-red-800">
                {negativeCount} negative review{negativeCount !== 1 ? 's' : ''} this month
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-red-400 ml-auto" />
            </Link>
          )}
        </div>
      </div>

      {/* Regional Standing */}
      {regional && (
        <Link
          href="/admin/analytics/competitors"
          className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 shadow-sm ring-1 ring-amber-100 hover:ring-amber-200 transition-all group"
        >
          <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-gray-700">
            <span className="font-bold text-gray-900">{regional.yourRating.toFixed(1)}</span>
            <span className="text-amber-400 ml-0.5">&#9733;</span>
            <span className="mx-2 text-gray-300">·</span>
            Area avg <span className="font-semibold text-gray-900">{regional.regionAvg}</span>
            <span className="text-amber-400 ml-0.5">&#9733;</span>
            <span className="mx-2 text-gray-300">·</span>
            You outrank{' '}
            <span className={`font-bold ${regional.percentile >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
              {regional.percentile}%
            </span>{' '}
            of nearby competitors
          </p>
          <ArrowUpRight className="h-4 w-4 text-amber-400 group-hover:text-amber-600 ml-auto shrink-0 transition-colors" />
        </Link>
      )}

      {/* Insights Snapshot + AI Suggestions side by side */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-500">Loading insights...</span>
        </div>
      ) : data && data.summary.total_reviews > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mini Word Cloud + Hotspots */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Review Topics</h2>
              <Link
                href="/admin/analytics/insights"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
              >
                Full analysis <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Mini Word Cloud */}
            {data.topicCloud.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center justify-center mb-4 min-h-[80px]">
                {data.topicCloud.slice(0, 15).map((t) => {
                  const maxCount = data.topicCloud[0]?.count || 1;
                  const ratio = t.count / maxCount;
                  const fontSize = 11 + ratio * 16;
                  return (
                    <span
                      key={t.topic}
                      className="px-1.5 py-0.5 rounded"
                      style={{
                        fontSize: `${fontSize}px`,
                        color: sentimentColor(t.avg_sentiment),
                        fontWeight: ratio > 0.5 ? 600 : 400,
                      }}
                      title={`${t.topic}: ${t.count} mentions`}
                    >
                      {t.topic}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Negative Hotspots Top 3 */}
            {data.negativeHotspots.length > 0 && (
              <div className="border-t border-gray-100 pt-3 mt-1">
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <ThumbsDown className="h-3 w-3" /> Top Complaints
                </p>
                <div className="space-y-1.5">
                  {data.negativeHotspots.slice(0, 3).map((h) => (
                    <div key={h.topic} className="flex items-center justify-between">
                      <span className="text-sm text-red-700">{h.topic}</span>
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{h.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Quick Tips */}
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-sm ring-1 ring-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                AI Suggestions
              </h2>
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/analytics/insights"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                >
                  Full report <ArrowUpRight className="h-3 w-3" />
                </Link>
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {generatingReport ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : suggestions.length > 0 ? (
                    <RefreshCw className="w-3 h-3" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {generatingReport ? 'Generating...' : suggestions.length > 0 ? 'Refresh' : 'Generate'}
                </button>
              </div>
            </div>

            {suggestions.length > 0 ? (
              <div className="space-y-2">
                {suggestions.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex gap-2 bg-white/70 rounded-lg p-3 border border-indigo-100">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500">
                Click &ldquo;Generate&rdquo; for AI-powered operational suggestions.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
