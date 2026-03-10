'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsDown, ThumbsUp, Sparkles, RefreshCw, Loader2 } from 'lucide-react';

interface Store {
  id: number;
  name: string;
}

interface TopicItem {
  topic: string;
  count: number;
  avg_sentiment: number;
}

interface CategoryItem {
  category: string;
  count: number;
  avg_rating: number;
  avg_sentiment: number;
}

interface HotspotItem {
  topic: string;
  count: number;
  reviews: Array<{ author: string; content: string; rating: number }>;
}

interface InsightsData {
  topicCloud: TopicItem[];
  categories: CategoryItem[];
  negativeHotspots: HotspotItem[];
  positiveHighlights: HotspotItem[];
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

function sentimentBg(score: number): string {
  if (score >= 0.3) return 'bg-green-100 text-green-800';
  if (score >= 0) return 'bg-lime-100 text-lime-800';
  if (score >= -0.3) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

export default function InsightsDashboard({ stores }: { stores: Store[] }) {
  const [selectedStore, setSelectedStore] = useState<number | 'all'>('all');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: days.toString() });
    if (selectedStore !== 'all') params.set('store_id', selectedStore.toString());

    fetch(`/api/admin/analytics/insights?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedStore, days]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">Loading insights...</span>
      </div>
    );
  }

  if (!data || data.summary.total_reviews === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-lg font-bold text-gray-700 mb-2">No review data yet</h3>
        <p className="text-sm text-gray-500">
          Reviews need to be synced and analyzed before insights can be generated.
        </p>
      </div>
    );
  }

  const maxTopicCount = Math.max(...data.topicCloud.map(t => t.count), 1);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => setSelectedStore(store.id === selectedStore ? 'all' : store.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedStore === store.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {store.name}
            </button>
          ))}
          {stores.length > 1 && (
            <button
              onClick={() => setSelectedStore('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedStore === 'all'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Stores
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{data.summary.total_reviews}</div>
          <div className="text-xs text-gray-500 mt-1">Total Reviews</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-gray-900 flex items-center gap-1">
            {data.summary.avg_rating}
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-xs text-gray-500 mt-1">Avg Rating</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className={`text-2xl font-bold ${data.summary.avg_sentiment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.summary.avg_sentiment > 0 ? '+' : ''}{data.summary.avg_sentiment}
          </div>
          <div className="text-xs text-gray-500 mt-1">Sentiment Score</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className={`text-2xl font-bold ${data.summary.negative_pct > 30 ? 'text-red-600' : 'text-gray-900'}`}>
            {data.summary.negative_pct}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Negative Rate</div>
        </div>
      </div>

      {/* Word Cloud */}
      {data.topicCloud.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Topic Word Cloud</h2>
          <div className="flex flex-wrap gap-2 items-center justify-center min-h-[120px]">
            {data.topicCloud.map((t) => {
              const ratio = t.count / maxTopicCount;
              const fontSize = 12 + ratio * 24; // 12px to 36px
              return (
                <button
                  key={t.topic}
                  onClick={() => setSelectedTopic(selectedTopic === t.topic ? null : t.topic)}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer hover:opacity-80 ${
                    selectedTopic === t.topic ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                  }`}
                  style={{
                    fontSize: `${fontSize}px`,
                    color: sentimentColor(t.avg_sentiment),
                    fontWeight: ratio > 0.5 ? 700 : 500,
                  }}
                  title={`${t.topic}: ${t.count} mentions, sentiment ${t.avg_sentiment}`}
                >
                  {t.topic}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Positive</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> Neutral</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> Negative</span>
            <span>Size = frequency</span>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {data.categories.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Issue Categories</h2>
          <div className="space-y-3">
            {data.categories.map((c) => {
              const maxCount = data.categories[0]?.count || 1;
              const pct = (c.count / maxCount) * 100;
              return (
                <div key={c.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{c.category}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{c.count} reviews</span>
                      <span className="flex items-center gap-0.5">
                        {c.avg_rating}<Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${sentimentBg(c.avg_sentiment)}`}>
                        {c.avg_sentiment > 0 ? '+' : ''}{c.avg_sentiment}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: sentimentColor(c.avg_sentiment),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Negative Hotspots + Positive Highlights side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Negative Hotspots */}
        <div className="bg-white rounded-xl p-6 border border-red-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ThumbsDown className="w-5 h-5 text-red-500" />
            Top Complaints
          </h2>
          {data.negativeHotspots.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No negative reviews found!</p>
          ) : (
            <div className="space-y-4">
              {data.negativeHotspots.map((h) => (
                <div key={h.topic} className="border-l-3 border-red-300 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-700">{h.topic}</span>
                    <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{h.count} mentions</span>
                  </div>
                  {h.reviews.map((r, i) => (
                    <div key={i} className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                      <span className="font-medium">{r.author}</span>
                      <span className="text-amber-500 ml-1">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <p className="mt-0.5 italic line-clamp-2">&ldquo;{r.content}&rdquo;</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Positive Highlights */}
        <div className="bg-white rounded-xl p-6 border border-green-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-green-500" />
            Top Highlights
          </h2>
          {data.positiveHighlights.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No positive reviews found yet.</p>
          ) : (
            <div className="space-y-4">
              {data.positiveHighlights.map((h) => (
                <div key={h.topic} className="border-l-3 border-green-300 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-700">{h.topic}</span>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{h.count} mentions</span>
                  </div>
                  {h.reviews.map((r, i) => (
                    <div key={i} className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                      <span className="font-medium">{r.author}</span>
                      <span className="text-amber-500 ml-1">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <p className="mt-0.5 italic line-clamp-2">&ldquo;{r.content}&rdquo;</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Operations Report */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            AI Operations Report
          </h2>
          <button
            onClick={generateReport}
            disabled={generatingReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {generatingReport ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : suggestions.length > 0 ? (
              <><RefreshCw className="w-4 h-4" /> Regenerate</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate Report</>
            )}
          </button>
        </div>

        {suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="flex gap-3 bg-white rounded-lg p-4 border border-indigo-100">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            Click &ldquo;Generate Report&rdquo; to get AI-powered operational suggestions based on your review data.
          </div>
        )}
      </div>
    </div>
  );
}
