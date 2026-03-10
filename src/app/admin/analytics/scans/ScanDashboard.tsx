'use client';

import { useState, useEffect } from 'react';
import { QrCode, Smartphone, MapPin, TrendingUp, ArrowRight } from 'lucide-react';

interface Store {
  id: number;
  name: string;
}

interface ScanData {
  total: number;
  trend: Array<{ date: string; count: number }>;
  bySource: Record<string, number>;
  byDevice: Record<string, number>;
  byOS: Record<string, number>;
  topCities: Array<{ city: string; count: number }>;
}

export default function ScanDashboard({ stores }: { stores: Store[] }) {
  const [selectedStore, setSelectedStore] = useState<number | 'all'>('all');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<{
    scans: number; generated: number; posted: number;
    rates: { scanToGenerate: number; generateToPost: number; overall: number };
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: days.toString() });
    if (selectedStore !== 'all') params.set('store_id', selectedStore.toString());

    fetch(`/api/admin/analytics/scans?${params}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch(`/api/dashboard/funnel?${params}`)
      .then(r => r.json())
      .then(setFunnel)
      .catch(() => {});
  }, [selectedStore, days]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">Failed to load data</div>;
  }

  const sourceColors: Record<string, string> = {
    qr: 'bg-blue-500',
    nfc: 'bg-purple-500',
    link: 'bg-gray-400',
    unknown: 'bg-gray-300',
  };

  const maxTrend = Math.max(...data.trend.map(d => d.count), 1);

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
              {stores.map(s => (
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
          {[7, 30, 90].map(d => (
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
        <StatCard icon={QrCode} label="Total Scans" value={data.total} />
        <StatCard icon={Smartphone} label="Mobile" value={data.byDevice.mobile || 0} />
        <StatCard icon={MapPin} label="Cities" value={data.topCities.length} />
        <StatCard
          icon={TrendingUp}
          label="Today"
          value={data.trend.length > 0 ? data.trend[data.trend.length - 1].count : 0}
        />
      </div>

      {/* Conversion Funnel */}
      {funnel && funnel.scans > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
          <div className="flex items-center gap-3">
            <FunnelStep label="Scans" value={funnel.scans} pct={100} color="bg-blue-500" />
            <FunnelArrow rate={funnel.rates.scanToGenerate} />
            <FunnelStep label="Generated" value={funnel.generated} pct={funnel.rates.scanToGenerate} color="bg-indigo-500" />
            <FunnelArrow rate={funnel.rates.generateToPost} />
            <FunnelStep label="Posted" value={funnel.posted} pct={funnel.rates.overall} color="bg-green-500" />
          </div>
          <p className="mt-3 text-xs text-gray-400 text-center">
            Overall conversion: {funnel.rates.overall}% of scans result in a posted review
          </p>
        </div>
      )}

      {/* Trend Chart (simple bar chart) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Scans</h3>
        <div className="flex items-end gap-1 h-40">
          {data.trend.map(d => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-blue-500 rounded-t min-h-[2px]"
                style={{ height: `${(d.count / maxTrend) * 100}%` }}
                title={`${d.date}: ${d.count} scans`}
              />
            </div>
          ))}
        </div>
        {data.trend.length > 0 && (
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{data.trend[0].date}</span>
            <span>{data.trend[data.trend.length - 1].date}</span>
          </div>
        )}
      </div>

      {/* Breakdown Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* By Source */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">By Source</h3>
          <div className="space-y-3">
            {Object.entries(data.bySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${sourceColors[source] || 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-700 uppercase">{source}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Device */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">By Device</h3>
          <div className="space-y-3">
            {Object.entries(data.byDevice).sort((a, b) => b[1] - a[1]).map(([device, count]) => (
              <div key={device} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{device}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Cities</h3>
          <div className="space-y-3">
            {data.topCities.map(({ city, count }) => (
              <div key={city} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{city}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
            {data.topCities.length === 0 && (
              <p className="text-sm text-gray-400">No location data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

function FunnelStep({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div className={`${color} h-3 rounded-full transition-all`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  );
}

function FunnelArrow({ rate }: { rate: number }) {
  return (
    <div className="flex flex-col items-center shrink-0 px-1">
      <span className="text-xs font-semibold text-gray-600">{rate}%</span>
      <ArrowRight className="w-4 h-4 text-gray-300" />
    </div>
  );
}
