'use client';

import { useState, useEffect } from 'react';

interface VerticalMetrics {
  vertical: string;
  totalExamples: number;
  approvedCount: number;
  rejectedCount: number;
  editedCount: number;
  approvalRate: number;
  editRate: number;
  avgConfidence: number;
}

interface ReadinessData {
  vertical: string;
  totalExamples: number;
  isReady: boolean;
  quality: 'high' | 'medium' | 'low';
  recommendation: string;
}

export default function TrainingDashboard() {
  const [metrics, setMetrics] = useState<VerticalMetrics[]>([]);
  const [readiness, setReadiness] = useState<ReadinessData[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, verticals: 0, readyForFineTuning: 0 });

  useEffect(() => {
    fetch('/api/admin/ai-training')
      .then(r => r.json())
      .then(data => {
        setMetrics(data.metrics || []);
        setReadiness(data.readiness || []);
        setSummary(data.summary || { total: 0, verticals: 0, readyForFineTuning: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading training data...</div>;

  if (metrics.length === 0) return (
    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
      <div className="text-5xl mb-4">🧠</div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">No Training Data Yet</h3>
      <p className="text-sm text-gray-500">
        As you approve, reject, or edit AI-generated replies, the system
        automatically collects training examples for future model improvement.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-gray-800">{summary.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Examples</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-gray-800">{summary.verticals}</div>
          <div className="text-xs text-gray-500 mt-1">Verticals</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{summary.readyForFineTuning}</div>
          <div className="text-xs text-gray-500 mt-1">Ready for Fine-Tuning</div>
        </div>
      </div>

      {/* Readiness Cards */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-800">Fine-Tuning Readiness</h3>
        {readiness.map(r => {
          const qualityConfig = {
            high: { color: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', icon: '✅' },
            medium: { color: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: '⚠️' },
            low: { color: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', icon: '❌' },
          };
          const config = qualityConfig[r.quality];

          return (
            <div key={r.vertical} className={`rounded-xl border p-4 ${config.color}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{config.icon}</span>
                  <span className="font-bold text-sm text-gray-800 capitalize">{r.vertical}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
                    {r.quality} quality
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-700">{r.totalExamples}</span>
                  <span className="text-xs text-gray-400"> / 100 min</span>
                </div>
              </div>
              {/* Progress bar to 100 examples */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${r.isReady ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (r.totalExamples / 100) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{r.recommendation}</p>
            </div>
          );
        })}
      </div>

      {/* Per-Vertical Metrics Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h3 className="font-bold text-gray-800 p-4 border-b">Quality Metrics by Vertical</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs text-gray-500">Vertical</th>
              <th className="text-center px-4 py-2 text-xs text-gray-500">Examples</th>
              <th className="text-center px-4 py-2 text-xs text-gray-500">Approved</th>
              <th className="text-center px-4 py-2 text-xs text-gray-500">Edited</th>
              <th className="text-center px-4 py-2 text-xs text-gray-500">Rejected</th>
              <th className="text-center px-4 py-2 text-xs text-gray-500">Approval Rate</th>
              <th className="text-center px-4 py-2 text-xs text-gray-500">Avg Confidence</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.vertical} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-700 capitalize">{m.vertical}</td>
                <td className="text-center px-4 py-3">{m.totalExamples}</td>
                <td className="text-center px-4 py-3 text-green-600">{m.approvedCount}</td>
                <td className="text-center px-4 py-3 text-yellow-600">{m.editedCount}</td>
                <td className="text-center px-4 py-3 text-red-600">{m.rejectedCount}</td>
                <td className="text-center px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    m.approvalRate >= 85 ? 'bg-green-100 text-green-700' :
                    m.approvalRate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {m.approvalRate}%
                  </span>
                </td>
                <td className="text-center px-4 py-3 text-gray-500">{m.avgConfidence || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
