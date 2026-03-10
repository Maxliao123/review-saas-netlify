'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import {
  Star,
  Filter,
  X,
  Loader2,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  Minus,
  LayoutGrid,
  Cloud,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ───────── Types ───────── */

interface Keyword {
  word: string;
  count: number;
  avgRating: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface ReviewItem {
  id: number;
  author_name: string;
  rating: number;
  content: string;
  created_at: string;
  store_name: string;
}

interface ComplaintCategory {
  key: string;
  label: string;
  labelZh: string;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  compensation: string;
  count: number;
  reviewIds: number[];
}

interface AnalyticsData {
  starDistribution: Record<number, number>;
  totalReviews: number;
  avgRating: number;
  keywords: Keyword[];
  sentimentTags: { positive: Keyword[]; negative: Keyword[] };
  complaintCategories: ComplaintCategory[];
  negativeCount: number;
  reviews: ReviewItem[];
}

const PAGE_SIZE = 12;

/* ───────── Component ───────── */

export default function ReviewAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStars, setSelectedStars] = useState<number | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<
    'all' | 'positive' | 'neutral' | 'negative'
  >('all');
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [cloudMode, setCloudMode] = useState<'tags' | 'cloud'>('tags');
  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(null);
  const [complaintExpanded, setComplaintExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/admin/analytics/review-analytics')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load analytics (${r.status})`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  // Derived: filtered reviews
  const filteredReviews = useMemo(() => {
    if (!data) return [];
    let reviews = data.reviews;

    if (selectedStars !== null) {
      reviews = reviews.filter((r) => Math.round(r.rating) === selectedStars);
    }
    if (selectedSentiment !== 'all') {
      reviews = reviews.filter((r) =>
        selectedSentiment === 'positive'
          ? r.rating >= 4
          : selectedSentiment === 'negative'
            ? r.rating <= 2
            : r.rating === 3,
      );
    }
    if (selectedKeyword) {
      const kw = selectedKeyword.toLowerCase();
      reviews = reviews.filter((r) => r.content.toLowerCase().includes(kw));
    }
    if (selectedComplaint && data.complaintCategories) {
      const cat = data.complaintCategories.find((c) => c.key === selectedComplaint);
      if (cat) {
        const idSet = new Set(cat.reviewIds);
        reviews = reviews.filter((r) => idSet.has(r.id));
      }
    }
    return reviews;
  }, [data, selectedStars, selectedSentiment, selectedKeyword, selectedComplaint]);

  // Derived: filtered keywords for word cloud
  const cloudKeywords = useMemo(() => {
    if (!data) return [];
    let kws = data.keywords;
    if (selectedSentiment === 'positive') {
      kws = kws.filter((k) => k.sentiment === 'positive');
    } else if (selectedSentiment === 'negative') {
      kws = kws.filter((k) => k.sentiment === 'negative');
    } else if (selectedSentiment === 'neutral') {
      kws = kws.filter((k) => k.sentiment === 'neutral');
    }
    return kws.slice(0, 50);
  }, [data, selectedSentiment]);

  const paginatedReviews = filteredReviews.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paginatedReviews.length < filteredReviews.length;
  const hasActiveFilters =
    selectedStars !== null || selectedSentiment !== 'all' || selectedKeyword !== null || selectedComplaint !== null;

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [selectedStars, selectedSentiment, selectedKeyword, selectedComplaint]);

  function clearFilters() {
    setSelectedStars(null);
    setSelectedSentiment('all');
    setSelectedKeyword(null);
    setSelectedComplaint(null);
    setPage(0);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-10 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-sm text-gray-500">Loading review analytics&hellip;</span>
        </div>
      </div>
    );
  }

  if (error || !data || data.totalReviews === 0) return null;

  /* ── Sentiment counts ── */
  const posCount = data.reviews.filter((r) => r.rating >= 4).length;
  const neuCount = data.reviews.filter((r) => r.rating === 3).length;
  const negCount = data.reviews.filter((r) => r.rating <= 2).length;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Review Analytics
        </h2>
        <span className="text-xs text-gray-500">
          {data.totalReviews.toLocaleString()} total reviews &middot; avg{' '}
          {data.avgRating}&#9733;
        </span>
      </div>

      {/* ────── Star Distribution ────── */}
      <section>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Star Distribution
        </h3>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = data.starDistribution[star] || 0;
            const pct = data.totalReviews > 0 ? (count / data.totalReviews) * 100 : 0;
            const isActive = selectedStars === star;

            return (
              <button
                key={star}
                onClick={() => setSelectedStars(isActive ? null : star)}
                className={`w-full flex items-center gap-3 rounded-lg px-2 py-1.5 transition-all ${
                  isActive
                    ? 'bg-blue-50 ring-1 ring-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-0.5 w-[72px] shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      star >= 4
                        ? 'bg-green-400'
                        : star === 3
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="w-20 text-right shrink-0">
                  <span className="text-sm font-semibold text-gray-700">
                    {count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-1">
                    ({Math.round(pct)}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ────── Sentiment Filter ────── */}
      <section>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Sentiment
        </h3>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { key: 'all', label: 'All', count: data.totalReviews, icon: null },
              { key: 'positive', label: 'Positive', count: posCount, icon: ThumbsUp },
              { key: 'neutral', label: 'Neutral', count: neuCount, icon: Minus },
              { key: 'negative', label: 'Negative', count: negCount, icon: ThumbsDown },
            ] as const
          ).map((s) => {
            const Icon = s.icon;
            const isActive = selectedSentiment === s.key;
            return (
              <button
                key={s.key}
                onClick={() => {
                  const next = isActive && s.key !== 'all' ? 'all' : s.key;
                  setSelectedSentiment(next);
                  // Clear keyword if it belongs to the now-hidden tag group
                  if (selectedKeyword && data) {
                    const inPos = data.sentimentTags.positive.some((k) => k.word === selectedKeyword);
                    const inNeg = data.sentimentTags.negative.some((k) => k.word === selectedKeyword);
                    if ((next === 'negative' && inPos) || (next === 'positive' && inNeg) || next === 'neutral') {
                      setSelectedKeyword(null);
                    }
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  isActive
                    ? s.key === 'positive'
                      ? 'bg-green-600 text-white border-green-600'
                      : s.key === 'negative'
                        ? 'bg-red-600 text-white border-red-600'
                        : s.key === 'neutral'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {s.label} ({s.count.toLocaleString()})
              </button>
            );
          })}
        </div>
      </section>

      {/* ────── Sentiment Tags (positive + negative keywords) ────── */}
      {(data.sentimentTags.positive.length > 0 ||
        data.sentimentTags.negative.length > 0) && (
        <section>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Topic Tags
          </h3>
          <div className="space-y-2">
            {/* Show positive tags when: all, positive */}
            {data.sentimentTags.positive.length > 0 &&
              selectedSentiment !== 'negative' &&
              selectedSentiment !== 'neutral' && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <ThumbsUp className="h-3 w-3 text-green-500 shrink-0" />
                {data.sentimentTags.positive.map((kw) => (
                  <button
                    key={kw.word}
                    onClick={() =>
                      setSelectedKeyword(
                        selectedKeyword === kw.word ? null : kw.word,
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      selectedKeyword === kw.word
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    }`}
                  >
                    {kw.word}{' '}
                    <span className="opacity-60">{kw.count}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Show negative tags when: all, negative */}
            {data.sentimentTags.negative.length > 0 &&
              selectedSentiment !== 'positive' &&
              selectedSentiment !== 'neutral' && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <ThumbsDown className="h-3 w-3 text-red-500 shrink-0" />
                {data.sentimentTags.negative.map((kw) => (
                  <button
                    key={kw.word}
                    onClick={() =>
                      setSelectedKeyword(
                        selectedKeyword === kw.word ? null : kw.word,
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      selectedKeyword === kw.word
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {kw.word}{' '}
                    <span className="opacity-60">{kw.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ────── Complaint Category Analysis (negative reviews) ────── */}
      {data.complaintCategories && data.complaintCategories.length > 0 && (
        <section className="rounded-xl bg-gradient-to-br from-red-50/60 to-orange-50/40 border border-red-100/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-red-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Complaint Analysis
              <span className="text-[10px] font-normal text-red-500 normal-case ml-1">
                ({data.negativeCount} negative review{data.negativeCount !== 1 ? 's' : ''})
              </span>
            </h3>
            {data.complaintCategories.length > 5 && (
              <button
                onClick={() => setComplaintExpanded(!complaintExpanded)}
                className="flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800 font-medium"
              >
                {complaintExpanded ? 'Show less' : 'Show all'}
                {complaintExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {(complaintExpanded
              ? data.complaintCategories
              : data.complaintCategories.slice(0, 5)
            ).map((cat) => {
              const pct =
                data.negativeCount > 0
                  ? Math.round((cat.count / data.negativeCount) * 100)
                  : 0;
              const isActive = selectedComplaint === cat.key;
              const severityColor =
                cat.severity === 'critical'
                  ? 'bg-red-500'
                  : cat.severity === 'high'
                    ? 'bg-orange-500'
                    : cat.severity === 'medium'
                      ? 'bg-amber-400'
                      : 'bg-gray-400';
              const severityBadge =
                cat.severity === 'critical'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : cat.severity === 'high'
                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                    : cat.severity === 'medium'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200';

              return (
                <button
                  key={cat.key}
                  onClick={() =>
                    setSelectedComplaint(isActive ? null : cat.key)
                  }
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all text-left ${
                    isActive
                      ? 'bg-white ring-2 ring-red-300 shadow-sm'
                      : 'bg-white/60 hover:bg-white/90'
                  }`}
                >
                  {/* Icon + Label */}
                  <span className="text-base shrink-0" role="img">
                    {cat.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-800 truncate">
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {cat.labelZh}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${severityBadge}`}
                      >
                        {cat.severity}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${severityColor}`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 w-8 text-right shrink-0">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  {/* Count + Compensation */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-gray-800">{cat.count}</div>
                    <div className="text-[9px] text-gray-400">{cat.compensation}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-3 text-[9px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> critical
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" /> high
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" /> low
            </span>
            <span className="ml-auto text-[9px] text-gray-400">
              compensation range per guidelines
            </span>
          </div>
        </section>
      )}

      {/* ────── Word Cloud ────── */}
      {cloudKeywords.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Keyword Cloud
              {selectedSentiment !== 'all' && (
                <span className={`ml-2 text-[10px] font-normal ${
                  selectedSentiment === 'positive' ? 'text-green-600' :
                  selectedSentiment === 'negative' ? 'text-red-500' : 'text-amber-500'
                }`}>
                  ({selectedSentiment})
                </span>
              )}
            </h3>
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setCloudMode('tags')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  cloudMode === 'tags'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                title="Tag view"
              >
                <LayoutGrid className="h-3 w-3" />
                Tags
              </button>
              <button
                onClick={() => setCloudMode('cloud')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium transition-colors border-l border-gray-200 ${
                  cloudMode === 'cloud'
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                title="Cloud view"
              >
                <Cloud className="h-3 w-3" />
                Cloud
              </button>
            </div>
          </div>

          {cloudMode === 'tags' ? (
            /* ── Tags mode (original) ── */
            <div className="flex flex-wrap gap-1 items-center justify-center rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 p-5 min-h-[120px] border border-gray-100">
              {cloudKeywords.map((kw) => {
                const maxCount = cloudKeywords[0]?.count || 1;
                const ratio = kw.count / maxCount;
                const fontSize = 11 + ratio * 20;
                const isActive = selectedKeyword === kw.word;

                return (
                  <button
                    key={kw.word}
                    onClick={() =>
                      setSelectedKeyword(isActive ? null : kw.word)
                    }
                    className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md scale-110'
                        : 'hover:bg-white hover:shadow-sm'
                    }`}
                    style={{
                      fontSize: `${fontSize}px`,
                      color: isActive
                        ? 'white'
                        : kw.sentiment === 'positive'
                          ? '#16a34a'
                          : kw.sentiment === 'negative'
                            ? '#dc2626'
                            : '#d97706',
                      fontWeight: ratio > 0.5 ? 700 : ratio > 0.25 ? 600 : 400,
                      opacity: isActive ? 1 : 0.6 + ratio * 0.4,
                    }}
                    title={`"${kw.word}" — ${kw.count} mentions · avg ${kw.avgRating}★`}
                  >
                    {kw.word}
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── Cloud mode (premium) ── */
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 p-6 sm:p-8 min-h-[280px] sm:min-h-[340px] border border-slate-700/50">
              {/* Decorative glow orbs */}
              <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex flex-wrap gap-x-3 gap-y-2 items-center justify-center">
                {cloudKeywords.map((kw, i) => {
                  const maxCount = cloudKeywords[0]?.count || 1;
                  const ratio = kw.count / maxCount;
                  const fontSize = 13 + ratio * 40;
                  const isActive = selectedKeyword === kw.word;

                  // Deterministic rotation pattern
                  const rotations = [0, 0, 0, -90, 90, 0, -12, 12, 0, 0, -90, 0, 8, -8, 0, 90, 0, 0];
                  const rotation = rotations[i % rotations.length];

                  // Sentiment color for dark bg
                  const sentimentColor =
                    kw.sentiment === 'positive'
                      ? { base: '#4ade80', glow: 'rgba(74,222,128,0.4)' }
                      : kw.sentiment === 'negative'
                        ? { base: '#f87171', glow: 'rgba(248,113,113,0.4)' }
                        : { base: '#fbbf24', glow: 'rgba(251,191,36,0.4)' };

                  return (
                    <button
                      key={kw.word}
                      onClick={() =>
                        setSelectedKeyword(isActive ? null : kw.word)
                      }
                      className="transition-all duration-300 cursor-pointer rounded-md px-1 leading-tight"
                      style={{
                        fontSize: `${fontSize}px`,
                        fontWeight: ratio > 0.6 ? 800 : ratio > 0.3 ? 600 : 400,
                        color: isActive ? '#fff' : sentimentColor.base,
                        opacity: isActive ? 1 : 0.45 + ratio * 0.55,
                        transform: `rotate(${rotation}deg)${isActive ? ' scale(1.15)' : ''}`,
                        textShadow: isActive
                          ? `0 0 20px ${sentimentColor.glow}, 0 0 40px ${sentimentColor.glow}`
                          : ratio > 0.5
                            ? `0 0 12px ${sentimentColor.glow}`
                            : 'none',
                        letterSpacing: ratio > 0.5 ? '0.02em' : 'normal',
                        display: 'inline-block',
                        lineHeight: rotation !== 0 ? '1' : '1.3',
                        margin: rotation !== 0 ? '8px 4px' : '2px 0',
                      }}
                      title={`"${kw.word}" — ${kw.count} mentions · avg ${kw.avgRating}★`}
                    >
                      {kw.word}
                    </button>
                  );
                })}
              </div>

              {/* Bottom badge */}
              <div className="absolute bottom-2 right-3 flex items-center gap-1.5 text-[9px] text-slate-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" /> positive
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" /> neutral
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 ml-1" /> negative
              </div>
            </div>
          )}

          {cloudMode === 'tags' && (
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              <span className="text-green-600">&#9679;</span> positive&ensp;
              <span className="text-amber-500">&#9679;</span> neutral&ensp;
              <span className="text-red-500">&#9679;</span> negative&ensp;
              &mdash; click a keyword to filter
            </p>
          )}
        </section>
      )}

      {/* ────── Active Filters ────── */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap bg-blue-50/50 rounded-lg px-3 py-2">
          <Filter className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="text-xs text-gray-500">Filtering:</span>

          {selectedStars !== null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
              {selectedStars}&#9733; only
              <button onClick={() => setSelectedStars(null)} className="hover:text-blue-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedSentiment !== 'all' && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                selectedSentiment === 'positive'
                  ? 'bg-green-100 text-green-700'
                  : selectedSentiment === 'negative'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
              }`}
            >
              {selectedSentiment}
              <button onClick={() => setSelectedSentiment('all')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedKeyword && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
              &ldquo;{selectedKeyword}&rdquo;
              <button onClick={() => setSelectedKeyword(null)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedComplaint && data?.complaintCategories && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
              {data.complaintCategories.find((c) => c.key === selectedComplaint)?.icon}{' '}
              {data.complaintCategories.find((c) => c.key === selectedComplaint)?.label}
              <button onClick={() => setSelectedComplaint(null)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-[10px] text-gray-500 hover:text-gray-700 underline ml-auto"
          >
            Clear all
          </button>
          <span className="text-xs font-medium text-gray-700">
            {filteredReviews.length.toLocaleString()} reviews
          </span>
        </div>
      )}

      {/* ────── Filtered Review List ────── */}
      <section>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          {hasActiveFilters ? 'Filtered Reviews' : 'All Reviews'}
        </h3>

        {filteredReviews.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">
            No reviews match the current filters.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {paginatedReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-lg border border-gray-100 p-4 hover:border-blue-100 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                        {(review.author_name || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                        {review.author_name}
                      </span>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < review.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.content && (
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                      {selectedKeyword
                        ? highlightKw(review.content, selectedKeyword)
                        : review.content}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate max-w-[100px]">
                      {review.store_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                >
                  Load More (
                  {(filteredReviews.length - paginatedReviews.length).toLocaleString()}{' '}
                  remaining)
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/* ───────── Helpers ───────── */

function highlightKw(text: string, keyword: string): ReactNode {
  try {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  } catch {
    return text;
  }
}
