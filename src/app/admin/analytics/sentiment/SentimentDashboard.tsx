'use client';

import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Hash, Globe, BarChart3 } from 'lucide-react';

interface Store {
  id: number;
  name: string;
}

interface SentimentData {
  trend: Array<{ date: string; avg_score: number; count: number }>;
  emotions: Array<{ emotion: string; count: number }>;
  topics: Array<{ topic: string; count: number; avg_sentiment: number }>;
  platforms: Array<{ platform: string; avg_sentiment: number; review_count: number }>;
  distribution: Array<{ rating: number; count: number; avg_sentiment: number }>;
  labels: { positive: number; negative: number; neutral: number; mixed: number };
  total_analyzed: number;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-green-500',
  negative: 'bg-red-500',
  neutral: 'bg-gray-400',
  mixed: 'bg-yellow-500',
};

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  yelp: 'Yelp',
  tripadvisor: 'TripAdvisor',
};

function scoreColor(score: number): string {
  if (score >= 0.3) return 'text-green-600';
  if (score <= -0.3) return 'text-red-600';
  return 'text-gray-600';
}

function scoreBg(score: number): string {
  if (score >= 0.3) return 'bg-green-500';
  if (score >= 0) return 'bg-green-300';
  if (score >= -0.3) return 'bg-yellow-400';
  return 'bg-red-500';
}

export default function SentimentDashboard({ stores }: { stores: Store[] }) {
  const [selectedStore, setSelectedStore] = useState<number | 'all'>('all');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: days.toString() });
    if (selectedStore !== 'all') params.set('store_id', selectedStore.toString());

    fetch(`/api/admin/analytics/sentiment?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStore, days]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading sentiment data...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">Failed to load data</div>;
  }

  if (data.total_analyzed === 0) {
    return (
      <div className="text-center py-16">
        <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Sentiment Data Yet</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Sentiment analysis runs automatically on new reviews. Once reviews are analyzed,
          insights will appear here.
        </p>
      </div>
    );
  }

  const totalLabels = data.labels.positive + data.labels.negative + data.labels.neutral + data.labels.mixed;
  const maxTrendCount = Math.max(...data.trend.map((d) => d.count), 1);
  const maxEmotionCount = data.emotions.length > 0 ? data.emotions[0].count : 1;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {stores.length > 1 && (
            <>
              <button
                onClick={() => setSelectedStore('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  selectedStore === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                All Stores
              </button>
              {stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStore(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    selectedStore === s.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-sm ${
                days === d ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Analyzed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.total_analyzed.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500">Positive</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {totalLabels > 0 ? Math.round((data.labels.positive / totalLabels) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Top Topics</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.topics.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Platforms</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.platforms.length}</p>
        </div>
      </div>

      {/* Sentiment Label Distribution Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Sentiment Distribution</h3>
        {totalLabels > 0 ? (
          <>
            <div className="flex rounded-lg overflow-hidden h-8 mb-4">
              {(['positive', 'neutral', 'mixed', 'negative'] as const).map((label) => {
                const pct = (data.labels[label] / totalLabels) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={label}
                    className={`${SENTIMENT_COLORS[label]} flex items-center justify-center text-white text-xs font-medium`}
                    style={{ width: `${pct}%` }}
                    title={`${label}: ${data.labels[label]} (${Math.round(pct)}%)`}
                  >
                    {pct >= 8 && `${Math.round(pct)}%`}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-6 text-sm">
              {(['positive', 'neutral', 'mixed', 'negative'] as const).map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${SENTIMENT_COLORS[label]}`} />
                  <span className="text-gray-600 capitalize">{label}</span>
                  <span className="font-medium text-gray-900">{data.labels[label]}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">No label data available</p>
        )}
      </div>

      {/* Sentiment Trend */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Sentiment Trend</h3>
        {data.trend.length > 0 ? (
          <>
            <div className="flex items-end gap-1 h-40">
              {data.trend.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t min-h-[2px] ${scoreBg(d.avg_score)}`}
                    style={{ height: `${(d.count / maxTrendCount) * 100}%` }}
                    title={`${d.date}: score ${d.avg_score.toFixed(2)}, ${d.count} reviews`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{data.trend[0].date}</span>
              <span>{data.trend[data.trend.length - 1].date}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Bar height = review count, color = sentiment score</p>
          </>
        ) : (
          <p className="text-sm text-gray-400">No trend data for this period</p>
        )}
      </div>

      {/* Two-column grid: Emotions + Topics */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Emotion Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Emotion Breakdown</h3>
          {data.emotions.length > 0 ? (
            <div className="space-y-3">
              {data.emotions.map((e) => (
                <div key={e.emotion}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 capitalize">{e.emotion}</span>
                    <span className="text-sm font-medium text-gray-900">{e.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${(e.count / maxEmotionCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No emotion data yet</p>
          )}
        </div>

        {/* Top Topics */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Topics</h3>
          {data.topics.length > 0 ? (
            <div className="space-y-3">
              {data.topics.map((t) => (
                <div key={t.topic} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-700 truncate">{t.topic}</span>
                    <span className="text-xs text-gray-400">({t.count})</span>
                  </div>
                  <span className={`text-sm font-medium ${scoreColor(t.avg_sentiment)}`}>
                    {t.avg_sentiment > 0 ? '+' : ''}
                    {t.avg_sentiment.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No topic data yet</p>
          )}
        </div>
      </div>

      {/* Two-column grid: Platform Comparison + Rating Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Platform Comparison */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Platform Comparison</h3>
          {data.platforms.length > 0 ? (
            <div className="space-y-4">
              {data.platforms.map((p) => (
                <div key={p.platform} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {PLATFORM_LABELS[p.platform] || p.platform}
                    </p>
                    <p className="text-xs text-gray-500">{p.review_count} reviews</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${scoreColor(p.avg_sentiment)}`}>
                      {p.avg_sentiment > 0 ? '+' : ''}
                      {p.avg_sentiment.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No platform data yet</p>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Rating vs Sentiment</h3>
          <div className="space-y-3">
            {data.distribution.map((d) => {
              const maxCount = Math.max(...data.distribution.map((x) => x.count), 1);
              return (
                <div key={d.rating} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-6">{d.rating}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                    <div
                      className={`h-4 rounded-full ${scoreBg(d.avg_sentiment)}`}
                      style={{ width: `${(d.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="text-right w-24">
                    <span className="text-xs text-gray-500">{d.count}</span>
                    {d.count > 0 && (
                      <span className={`text-xs ml-1 ${scoreColor(d.avg_sentiment)}`}>
                        ({d.avg_sentiment > 0 ? '+' : ''}{d.avg_sentiment.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
