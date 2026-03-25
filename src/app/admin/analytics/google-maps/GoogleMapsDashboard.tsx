'use client';

import { useState, useEffect } from 'react';
import {
  Navigation,
  Phone,
  Globe,
  Search,
  Camera,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  TrendingUp,
} from 'lucide-react';

interface Store {
  id: number;
  name: string;
}

interface TimeSeriesRow {
  date: string;
  direction_requests: number;
  phone_calls: number;
  website_clicks: number;
  search_impressions: number;
  photo_views: number;
}

interface Summary {
  direction_requests: number;
  phone_calls: number;
  website_clicks: number;
  search_impressions: number;
  photo_views: number;
}

interface AnalyticsData {
  timeSeries: TimeSeriesRow[];
  summary: Summary;
  previousSummary: Summary;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const KPI_CONFIG = [
  { key: 'direction_requests' as const, label: 'Direction Requests', icon: Navigation, color: 'blue' },
  { key: 'phone_calls' as const, label: 'Phone Calls', icon: Phone, color: 'green' },
  { key: 'website_clicks' as const, label: 'Website Clicks', icon: Globe, color: 'purple' },
  { key: 'search_impressions' as const, label: 'Search Impressions', icon: Search, color: 'amber' },
  { key: 'photo_views' as const, label: 'Photo Views', icon: Camera, color: 'rose' },
];

const COLOR_MAP: Record<string, { bg: string; text: string; line: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', line: '#3b82f6' },
  green: { bg: 'bg-green-50', text: 'text-green-600', line: '#22c55e' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', line: '#a855f7' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', line: '#f59e0b' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', line: '#f43f5e' },
};

// Simple SVG line chart component
function MiniLineChart({
  data,
  dataKey,
  color,
  height = 180,
}: {
  data: TimeSeriesRow[];
  dataKey: keyof TimeSeriesRow;
  color: string;
  height?: number;
}) {
  if (data.length < 2) return null;

  const values = data.map((d) => Number(d[dataKey]) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const width = 600;
  const padding = { top: 10, right: 10, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = values.map((v, i) => ({
    x: padding.left + (i / (values.length - 1)) * chartW,
    y: padding.top + chartH - ((v - min) / range) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${dataKey}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${dataKey})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {/* X-axis labels: first, middle, last */}
      {[0, Math.floor(data.length / 2), data.length - 1].map((idx) => (
        <text
          key={idx}
          x={points[idx]?.x || 0}
          y={height - 5}
          textAnchor="middle"
          className="fill-gray-400"
          fontSize="11"
        >
          {data[idx]?.date?.slice(5) || ''}
        </text>
      ))}
    </svg>
  );
}

// Combined multi-line chart for overview
function CombinedChart({ data }: { data: TimeSeriesRow[] }) {
  if (data.length < 2) return null;

  const width = 700;
  const height = 250;
  const padding = { top: 10, right: 10, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Find global max across all metrics
  const allValues = KPI_CONFIG.flatMap((k) => data.map((d) => Number(d[k.key]) || 0));
  const max = Math.max(...allValues, 1);

  const lines = KPI_CONFIG.map((kpi) => {
    const values = data.map((d) => Number(d[kpi.key]) || 0);
    const points = values.map((v, i) => ({
      x: padding.left + (i / (values.length - 1)) * chartW,
      y: padding.top + chartH - (v / max) * chartH,
    }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return { key: kpi.key, path, color: COLOR_MAP[kpi.color].line };
  });

  const xPoints = data.map((_, i) => padding.left + (i / (data.length - 1)) * chartW);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      {lines.map((line) => (
        <path
          key={line.key}
          d={line.path}
          fill="none"
          stroke={line.color}
          strokeWidth="2"
          strokeLinejoin="round"
          opacity="0.85"
        />
      ))}
      {/* X-axis labels */}
      {[0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((data.length * 3) / 4), data.length - 1].map(
        (idx) =>
          xPoints[idx] !== undefined && (
            <text
              key={idx}
              x={xPoints[idx]}
              y={height - 5}
              textAnchor="middle"
              className="fill-gray-400"
              fontSize="11"
            >
              {data[idx]?.date?.slice(5) || ''}
            </text>
          )
      )}
    </svg>
  );
}

export default function GoogleMapsDashboard({ stores }: { stores: Store[] }) {
  const [selectedStore, setSelectedStore] = useState<number | 'all'>('all');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<keyof Summary>('search_impressions');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: days.toString() });
    if (selectedStore !== 'all') params.set('store_id', selectedStore.toString());

    fetch(`/api/admin/google-maps-analytics?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedStore, days]);

  // Empty state: no data at all
  const isEmpty = !loading && data && data.timeSeries.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Google Maps Data Yet</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          Connect your Google Business Profile to start tracking how customers find and interact with your business on Google Maps.
        </p>
        <a
          href="/admin/settings/google"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Settings className="w-4 h-4" />
          Connect Google Business Profile
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {stores.length > 1 && (
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {[30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-2" />}
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {KPI_CONFIG.map((kpi) => {
            const current = data.summary[kpi.key];
            const previous = data.previousSummary[kpi.key];
            const change = pctChange(current, previous);
            const colors = COLOR_MAP[kpi.color];
            const Icon = kpi.icon;
            const isActive = activeMetric === kpi.key;

            return (
              <button
                key={kpi.key}
                onClick={() => setActiveMetric(kpi.key)}
                className={`bg-white rounded-xl border p-4 text-left transition-all ${
                  isActive
                    ? 'border-blue-300 ring-2 ring-blue-100 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(current)}</p>
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                {change !== null && (
                  <div
                    className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                      change >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {change >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(change)}% vs prev period
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Charts */}
      {data && data.timeSeries.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Combined overview chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">All Metrics Overview</h3>
            <p className="text-xs text-gray-500 mb-4">Combined view of all Google Maps engagement metrics</p>
            <CombinedChart data={data.timeSeries} />
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4">
              {KPI_CONFIG.map((kpi) => (
                <div key={kpi.key} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLOR_MAP[kpi.color].line }}
                  />
                  <span className="text-xs text-gray-600">{kpi.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Single metric detail chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {KPI_CONFIG.find((k) => k.key === activeMetric)?.label || 'Metric'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Daily trend for the selected metric over {days} days
            </p>
            <MiniLineChart
              data={data.timeSeries}
              dataKey={activeMetric}
              color={COLOR_MAP[KPI_CONFIG.find((k) => k.key === activeMetric)?.color || 'blue'].line}
            />
          </div>
        </div>
      )}

      {/* Individual metric sparklines */}
      {data && data.timeSeries.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {KPI_CONFIG.map((kpi) => {
            const colors = COLOR_MAP[kpi.color];
            return (
              <div key={kpi.key} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">{kpi.label} — Daily</p>
                <div className="h-20">
                  <MiniLineChart data={data.timeSeries} dataKey={kpi.key} color={colors.line} height={80} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
