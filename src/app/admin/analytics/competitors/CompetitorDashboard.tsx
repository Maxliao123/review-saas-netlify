'use client';

import { useState, useEffect, useCallback } from 'react';

interface StoreMetrics {
  storeId: number;
  storeName: string;
  totalReviews: number;
  avgRating: number;
  responseRate: number;
  distribution: Record<number, number>;
  trends: Record<string, { count: number; avgRating: number }>;
}

interface Competitor {
  name: string;
  placeId: string;
  rating: number;
  totalReviews: number;
  vicinity: string;
}

interface Snapshot {
  snapshot_date: string;
  rating: number;
  review_count: number;
}

interface TrackedCompetitor {
  id: number;
  storeId: number;
  competitorName: string;
  competitorPlaceId: string;
  currentRating: number | null;
  currentReviewCount: number;
  lastFetchedAt: string | null;
  createdAt: string;
  snapshots: Snapshot[];
}

export default function CompetitorDashboard() {
  const [stores, setStores] = useState<StoreMetrics[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [tracked, setTracked] = useState<TrackedCompetitor[]>([]);
  const [trackedCount, setTrackedCount] = useState(0);
  const [maxCompetitors, setMaxCompetitors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingInProgress, setTrackingInProgress] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/competitors');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStores(data.stores || []);
      setCompetitors(data.competitors || []);
      setTracked(data.tracked || []);
      setTrackedCount(data.trackedCount || 0);
      setMaxCompetitors(data.maxCompetitorsPerStore || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrack = async (comp: Competitor, storeId: number) => {
    setTrackingInProgress(comp.placeId);
    try {
      const res = await fetch('/api/admin/analytics/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track',
          storeId,
          competitorName: comp.name,
          competitorPlaceId: comp.placeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to track competitor');
        return;
      }
      await fetchData();
    } catch {
      alert('Failed to track competitor');
    } finally {
      setTrackingInProgress(null);
    }
  };

  const handleUntrack = async (comp: TrackedCompetitor) => {
    setTrackingInProgress(comp.competitorPlaceId);
    try {
      const res = await fetch('/api/admin/analytics/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'untrack',
          storeId: comp.storeId,
          competitorPlaceId: comp.competitorPlaceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to untrack competitor');
        return;
      }
      await fetchData();
    } catch {
      alert('Failed to untrack competitor');
    } finally {
      setTrackingInProgress(null);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading competitor data...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (stores.length === 0) return (
    <div className="p-8 text-center">
      <div className="text-5xl mb-4">&#128202;</div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">No Data Yet</h3>
      <p className="text-sm text-gray-500">Import reviews to see competitor comparison.</p>
    </div>
  );

  // Find best-performing store
  const bestStore = stores.reduce((best, s) =>
    s.avgRating > best.avgRating ? s : best, stores[0]);

  // Set of tracked place IDs for quick lookup
  const trackedPlaceIds = new Set(tracked.map(t => t.competitorPlaceId));

  // Primary store for tracking actions
  const primaryStoreId = stores[0]?.storeId;

  return (
    <div className="space-y-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          label="Your Avg Rating"
          value={bestStore.avgRating.toFixed(1)}
          suffix="&#9733;"
          color={bestStore.avgRating >= 4.5 ? 'green' : bestStore.avgRating >= 4 ? 'blue' : 'yellow'}
        />
        <KpiCard
          label="Total Reviews"
          value={stores.reduce((s, st) => s + st.totalReviews, 0).toString()}
          color="blue"
        />
        <KpiCard
          label="Response Rate"
          value={`${Math.round(stores.reduce((s, st) => s + st.responseRate, 0) / stores.length)}%`}
          color={stores[0]?.responseRate >= 80 ? 'green' : 'yellow'}
        />
        <KpiCard
          label="Competitors Tracked"
          value={maxCompetitors > 0 ? `${trackedCount}/${maxCompetitors}` : '0'}
          color="purple"
        />
      </div>

      {/* Tracked Competitors Section */}
      {tracked.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Tracked Competitors</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {trackedCount}/{maxCompetitors} slots used
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracked.map(comp => {
              const snapshots = comp.snapshots || [];
              const oldest = snapshots.length > 0 ? snapshots[0] : null;
              const newest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
              const reviewDelta = oldest && newest ? newest.review_count - oldest.review_count : null;
              const ratingDelta = oldest && newest ? Number(newest.rating) - Number(oldest.rating) : null;

              return (
                <div key={comp.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm">{comp.competitorName}</h3>
                      {comp.lastFetchedAt && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Updated {new Date(comp.lastFetchedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleUntrack(comp)}
                      disabled={trackingInProgress === comp.competitorPlaceId}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      {trackingInProgress === comp.competitorPlaceId ? '...' : 'Untrack'}
                    </button>
                  </div>

                  {/* Current metrics */}
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <span className="text-2xl font-bold text-gray-800">
                        {comp.currentRating != null ? Number(comp.currentRating).toFixed(1) : '-'}
                      </span>
                      <span className="text-yellow-400 ml-1">&#9733;</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {comp.currentReviewCount} reviews
                    </div>
                  </div>

                  {/* Deltas */}
                  <div className="flex gap-3 mb-3 text-xs">
                    {ratingDelta !== null && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        ratingDelta > 0 ? 'bg-green-50 text-green-700' :
                        ratingDelta < 0 ? 'bg-red-50 text-red-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        Rating {ratingDelta > 0 ? '+' : ''}{ratingDelta.toFixed(1)} (30d)
                      </span>
                    )}
                    {reviewDelta !== null && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        reviewDelta > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'
                      }`}>
                        +{reviewDelta} reviews (30d)
                      </span>
                    )}
                  </div>

                  {/* Sparkline */}
                  {snapshots.length > 1 && (
                    <RatingSparkline snapshots={snapshots} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Your Stores Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Your Stores</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 font-medium">Store</th>
                <th className="pb-3 font-medium text-center">Rating</th>
                <th className="pb-3 font-medium text-center">Reviews</th>
                <th className="pb-3 font-medium text-center">Response Rate</th>
                <th className="pb-3 font-medium text-center">30d Trend</th>
                <th className="pb-3 font-medium">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(store => {
                const trend30 = store.trends['30d'];
                const trend60 = store.trends['60d'];
                const ratingDelta = trend30 && trend60 && trend60.avgRating > 0
                  ? trend30.avgRating - trend60.avgRating
                  : null;

                return (
                  <tr key={store.storeId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{store.storeName}</td>
                    <td className="py-3 text-center">
                      <span className={`font-bold text-lg ${
                        store.avgRating >= 4.5 ? 'text-green-600' :
                        store.avgRating >= 4.0 ? 'text-blue-600' :
                        store.avgRating >= 3.0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {store.avgRating.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-3 text-center text-gray-600">{store.totalReviews}</td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        store.responseRate >= 80 ? 'bg-green-100 text-green-700' :
                        store.responseRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {store.responseRate}%
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {ratingDelta !== null ? (
                        <span className={`text-sm font-medium ${
                          ratingDelta > 0 ? 'text-green-600' :
                          ratingDelta < 0 ? 'text-red-600' : 'text-gray-400'
                        }`}>
                          {ratingDelta > 0 ? '+' : ''}{ratingDelta.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3">
                      <MiniDistribution distribution={store.distribution} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Competitor Comparison */}
      {competitors.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Nearby Competitors</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Business</th>
                  <th className="pb-3 font-medium text-center">Rating</th>
                  <th className="pb-3 font-medium text-center">Reviews</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium text-center">vs You</th>
                  <th className="pb-3 font-medium text-center">Track</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((comp, i) => {
                  const diff = bestStore.avgRating - comp.rating;
                  const isTracked = trackedPlaceIds.has(comp.placeId);
                  const isProcessing = trackingInProgress === comp.placeId;
                  const limitReached = trackedCount >= maxCompetitors;

                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-800">{comp.name}</td>
                      <td className="py-3 text-center">
                        <span className="font-bold">{comp.rating.toFixed(1)}</span>
                        <span className="text-yellow-400 ml-1">&#9733;</span>
                      </td>
                      <td className="py-3 text-center text-gray-600">{comp.totalReviews}</td>
                      <td className="py-3 text-gray-500 text-xs max-w-[200px] truncate">{comp.vicinity}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          diff > 0 ? 'bg-green-100 text-green-700' :
                          diff < 0 ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        {isTracked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            Tracked
                          </span>
                        ) : maxCompetitors === 0 ? (
                          <span className="text-xs text-gray-400" title="Upgrade to Pro to track competitors">
                            Pro+
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTrack(comp, primaryStoreId)}
                            disabled={isProcessing || limitReached}
                            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                              limitReached
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100 disabled:opacity-50'
                            }`}
                            title={limitReached ? `Limit reached (${trackedCount}/${maxCompetitors})` : 'Track this competitor'}
                          >
                            {isProcessing ? '...' : limitReached ? 'Full' : 'Track'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="text-4xl mb-3">&#128205;</div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">Competitor Data</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Add <code className="bg-gray-100 px-1 rounded text-xs">GOOGLE_PLACES_API_KEY</code> to your environment variables to see nearby competitor ratings and review counts.
          </p>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, suffix, color }: {
  label: string; value: string; suffix?: string;
  color: 'green' | 'blue' | 'yellow' | 'purple' | 'red';
}) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="text-xs font-medium opacity-80 mb-1">{label}</div>
      <div className="text-2xl font-bold">
        {value}
        {suffix && <span className="text-lg ml-1" dangerouslySetInnerHTML={{ __html: suffix }} />}
      </div>
    </div>
  );
}

function MiniDistribution({ distribution }: { distribution: Record<number, number> }) {
  const max = Math.max(...Object.values(distribution), 1);
  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  return (
    <div className="flex items-end gap-[2px] h-5">
      {[1, 2, 3, 4, 5].map(star => (
        <div
          key={star}
          className="w-3 rounded-t-sm"
          style={{
            height: `${Math.max((distribution[star] / max) * 100, 5)}%`,
            backgroundColor: colors[star - 1],
            minHeight: '2px',
          }}
          title={`${star}★: ${distribution[star]}`}
        />
      ))}
    </div>
  );
}

/**
 * SVG sparkline showing rating trend over the last 30 days of snapshots.
 */
function RatingSparkline({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) return null;

  const width = 200;
  const height = 32;
  const padding = 2;

  const ratings = snapshots.map(s => Number(s.rating));
  const minR = Math.min(...ratings) - 0.1;
  const maxR = Math.max(...ratings) + 0.1;
  const range = maxR - minR || 1;

  const points = ratings.map((r, i) => {
    const x = padding + (i / (ratings.length - 1)) * (width - padding * 2);
    const y = height - padding - ((r - minR) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const isUp = ratings[ratings.length - 1] >= ratings[0];

  return (
    <div className="mt-1">
      <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={isUp ? '#22c55e' : '#ef4444'}
          strokeWidth="1.5"
          points={points.join(' ')}
        />
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{snapshots[0].snapshot_date.slice(5)}</span>
        <span>{snapshots[snapshots.length - 1].snapshot_date.slice(5)}</span>
      </div>
    </div>
  );
}
