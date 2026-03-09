'use client';

import { useState, useEffect } from 'react';
import { TIER_CONFIG } from '@/lib/benchmarking';

interface BenchmarkData {
  storeId: number;
  storeName: string;
  vertical: string;
  peerCount: number;
  tier: 'top10' | 'top25' | 'top50' | 'bottom50';
  summary: string;
  metrics: {
    avgRating: number;
    totalReviews: number;
    responseRate: number;
    avgResponseTime: number;
    positiveRatio: number;
  };
  percentiles: {
    avgRating: number;
    totalReviews: number;
    responseRate: number;
    positiveRatio: number;
  };
}

export default function BenchmarkDashboard() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics/benchmarks')
      .then(r => r.json())
      .then(data => setBenchmarks(data.benchmarks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-400">Calculating benchmarks...</div>;
  if (benchmarks.length === 0) return (
    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
      <div className="text-5xl mb-4">&#128200;</div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">No Benchmark Data</h3>
      <p className="text-sm text-gray-500">Import reviews to see how you compare to industry peers.</p>
    </div>
  );

  const tierColors = {
    top10: 'border-green-300 bg-green-50',
    top25: 'border-blue-300 bg-blue-50',
    top50: 'border-yellow-300 bg-yellow-50',
    bottom50: 'border-red-300 bg-red-50',
  };

  return (
    <div className="space-y-6">
      {benchmarks.map(b => {
        const config = TIER_CONFIG[b.tier];

        return (
          <div key={b.storeId} className={`rounded-xl border-2 p-6 ${tierColors[b.tier]}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{b.storeName}</h3>
                <p className="text-xs text-gray-500 capitalize">{b.vertical} | {b.peerCount} peers in benchmark</p>
              </div>
              <div className="text-right">
                <div className="text-3xl">{config.emoji}</div>
                <span className="text-sm font-bold">{config.label}</span>
              </div>
            </div>

            {/* Summary */}
            <p className="text-sm text-gray-700 mb-4 bg-white/60 rounded-lg p-3">{b.summary}</p>

            {/* Percentile Bars */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PercentileBar label="Rating" value={b.percentiles.avgRating} metric={`${b.metrics.avgRating}★`} />
              <PercentileBar label="Reviews" value={b.percentiles.totalReviews} metric={String(b.metrics.totalReviews)} />
              <PercentileBar label="Response Rate" value={b.percentiles.responseRate} metric={`${b.metrics.responseRate}%`} />
              <PercentileBar label="Positive Ratio" value={b.percentiles.positiveRatio} metric={`${b.metrics.positiveRatio}%`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PercentileBar({ label, value, metric }: { label: string; value: number; metric: string }) {
  const color = value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-blue-500' : value >= 25 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-white/80 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">{metric}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-right">Top {100 - value}%</p>
    </div>
  );
}
