'use client';

import { useState, useEffect } from 'react';

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

export default function CompetitorDashboard() {
  const [stores, setStores] = useState<StoreMetrics[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/analytics/competitors');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStores(data.stores || []);
      setCompetitors(data.competitors || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          value={competitors.length.toString()}
          color="purple"
        />
      </div>

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
                </tr>
              </thead>
              <tbody>
                {competitors.map((comp, i) => {
                  const diff = bestStore.avgRating - comp.rating;
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
