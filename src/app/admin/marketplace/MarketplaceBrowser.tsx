'use client';

import { useState, useEffect } from 'react';
import {
  SUPPORTED_VERTICALS,
  VERTICAL_LABELS,
  ORDER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  calculateOrderTotal,
  rankSpecialists,
  calculateMarketplaceStats,
  projectSpecialistEarnings,
  type Specialist,
  type MarketplaceOrder,
  type OrderType,
} from '@/lib/marketplace';

export default function MarketplaceBrowser() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'orders' | 'stats'>('browse');

  // Filters
  const [filterLang, setFilterLang] = useState('');
  const [filterVertical, setFilterVertical] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [specRes, orderRes] = await Promise.all([
        fetch('/api/admin/marketplace/specialists'),
        fetch('/api/admin/marketplace/orders'),
      ]);
      if (specRes.ok) {
        const data = await specRes.json();
        setSpecialists(data.specialists || []);
      }
      if (orderRes.ok) {
        const data = await orderRes.json();
        setOrders(data.orders || []);
      }
    } catch {
      console.error('Failed to fetch marketplace data');
    } finally {
      setLoading(false);
    }
  }

  const rankedSpecialists = rankSpecialists(specialists, {
    language: filterLang || undefined,
    vertical: filterVertical || undefined,
    maxPrice,
  });

  const stats = calculateMarketplaceStats(specialists, orders);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading marketplace...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['browse', 'orders', 'stats'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'browse' ? 'Browse Specialists' : tab === 'orders' ? 'My Orders' : 'Marketplace Stats'}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterVertical}
              onChange={e => setFilterVertical(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Industries</option>
              {SUPPORTED_VERTICALS.map(v => (
                <option key={v} value={v}>{VERTICAL_LABELS[v]}</option>
              ))}
            </select>

            <select
              value={filterLang}
              onChange={e => setFilterLang(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Languages</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="ko">Korean</option>
              <option value="ja">Japanese</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>

            <input
              type="number"
              placeholder="Max price / review"
              value={maxPrice || ''}
              onChange={e => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-44"
            />
          </div>

          {/* Specialist Cards */}
          {rankedSpecialists.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-lg">No specialists available yet</p>
              <p className="text-sm mt-1">
                The marketplace is launching soon. Check back later!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rankedSpecialists.map(specialist => (
                <SpecialistCard
                  key={specialist.id}
                  specialist={specialist}
                  score={specialist.score}
                  onSelect={() => setSelectedSpecialist(specialist)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-lg">No orders yet</p>
              <p className="text-sm mt-1">
                Browse specialists and hire one to start getting professional review responses.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Order</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Reviews</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(order => {
                    const statusLabel = ORDER_STATUS_LABELS[order.status];
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {order.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          {ORDER_TYPE_LABELS[order.order_type]?.label || order.order_type}
                        </td>
                        <td className="px-4 py-3 text-right">{order.review_count}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${order.total_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabel.bgColor} ${statusLabel.color}`}>
                            {statusLabel.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Specialists" value={stats.totalSpecialists} />
            <StatCard label="Available" value={stats.availableSpecialists} color="green" />
            <StatCard label="Total Orders" value={stats.totalOrders} color="blue" />
            <StatCard label="Completion Rate" value={stats.completionRate} color="purple" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Industries</h3>
              {stats.topVerticals.length > 0 ? (
                <div className="space-y-2">
                  {stats.topVerticals.map(({ vertical, count }) => (
                    <div key={vertical} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {VERTICAL_LABELS[vertical] || vertical}
                      </span>
                      <span className="text-sm font-mono text-gray-800">{count} specialists</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No data yet</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Languages</h3>
              {stats.topLanguages.length > 0 ? (
                <div className="space-y-2">
                  {stats.topLanguages.map(({ language, count }) => (
                    <div key={language} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{language.toUpperCase()}</span>
                      <span className="text-sm font-mono text-gray-800">{count} specialists</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No data yet</p>
              )}
            </div>
          </div>

          {stats.totalRevenue > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
              <h3 className="text-sm font-semibold text-green-800 mb-3">Revenue Overview</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-green-900">
                    ${stats.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600">Total Revenue</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-900">
                    ${stats.avgOrderValue.toFixed(2)}
                  </div>
                  <div className="text-xs text-green-600">Avg Order Value</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-900">
                    {stats.avgSpecialistRating > 0 ? stats.avgSpecialistRating.toFixed(1) : '—'}
                  </div>
                  <div className="text-xs text-green-600">Avg Specialist Rating</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Specialist Detail Modal */}
      {selectedSpecialist && (
        <SpecialistModal
          specialist={selectedSpecialist}
          onClose={() => setSelectedSpecialist(null)}
        />
      )}
    </div>
  );
}

// --------------- Sub-components ---------------

function StatCard({ label, value, color = 'gray' }: { label: string; value: string | number; color?: string }) {
  const colorMap: Record<string, string> = {
    gray: 'text-gray-900',
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`text-2xl font-bold ${colorMap[color] || colorMap.gray}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function SpecialistCard({
  specialist,
  score,
  onSelect,
}: {
  specialist: Specialist & { score: number };
  score: number;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
          {specialist.display_name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800 truncate">{specialist.display_name}</h3>
            {specialist.is_verified && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                VERIFIED
              </span>
            )}
          </div>

          {specialist.bio && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{specialist.bio}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {specialist.verticals.slice(0, 3).map(v => (
              <span key={v} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {VERTICAL_LABELS[v] || v}
              </span>
            ))}
            {specialist.languages.map(l => (
              <span key={l} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                {l.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-yellow-600">
            ★ {specialist.rating_avg.toFixed(1)}
            <span className="text-gray-400 ml-0.5">({specialist.rating_count})</span>
          </span>
          <span className="text-gray-500">{specialist.total_reviews_written} reviews written</span>
        </div>
        <div className="text-lg font-bold text-blue-700">
          ${specialist.per_review_rate.toFixed(2)}
          <span className="text-xs text-gray-400 font-normal">/review</span>
        </div>
      </div>
    </div>
  );
}

function SpecialistModal({
  specialist,
  onClose,
}: {
  specialist: Specialist;
  onClose: () => void;
}) {
  const [orderType, setOrderType] = useState<OrderType>('batch');
  const [reviewCount, setReviewCount] = useState(10);

  const earnings = projectSpecialistEarnings(specialist);
  const orderCalc = calculateOrderTotal(specialist.per_review_rate, reviewCount);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
              {specialist.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {specialist.display_name}
                {specialist.is_verified && <span className="text-blue-500 text-sm">✓</span>}
              </h2>
              <p className="text-sm text-gray-500">
                Avg response: {specialist.response_time_avg_hours}h
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        {specialist.bio && <p className="text-sm text-gray-600">{specialist.bio}</p>}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-yellow-600">★ {specialist.rating_avg.toFixed(1)}</div>
            <div className="text-xs text-gray-500">{specialist.rating_count} reviews</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-800">{specialist.total_reviews_written}</div>
            <div className="text-xs text-gray-500">Written</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-700">${specialist.per_review_rate.toFixed(2)}</div>
            <div className="text-xs text-gray-500">Per review</div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {specialist.verticals.map(v => (
            <span key={v} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
              {VERTICAL_LABELS[v] || v}
            </span>
          ))}
          {specialist.languages.map(l => (
            <span key={l} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">
              {l.toUpperCase()}
            </span>
          ))}
          {specialist.certifications?.map(c => (
            <span key={c} className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full">
              🏆 {c}
            </span>
          ))}
        </div>

        {/* Order Form */}
        <div className="bg-blue-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-blue-900 text-sm">Place an Order</h3>

          <div className="flex gap-2">
            {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  orderType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-blue-100'
                }`}
              >
                {ORDER_TYPE_LABELS[type].label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs text-blue-800 mb-1">Number of reviews</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={reviewCount}
              onChange={e => setReviewCount(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm"
            />
          </div>

          <div className="bg-white rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal ({reviewCount} × ${specialist.per_review_rate.toFixed(2)})</span>
              <span className="text-gray-800">${orderCalc.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Platform fee (15%)</span>
              <span>${orderCalc.commission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-blue-900 pt-1 border-t">
              <span>Total</span>
              <span>${orderCalc.total.toFixed(2)}</span>
            </div>
          </div>

          <button
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Hire {specialist.display_name.split(' ')[0]}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
