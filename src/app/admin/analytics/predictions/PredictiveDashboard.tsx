'use client';

import { useState, useEffect } from 'react';
import { SEVERITY_CONFIG, type PredictiveAlert, type TrendDataPoint } from '@/lib/predictive';

interface PredictionData {
  storeId: number;
  storeName: string;
  alerts: PredictiveAlert[];
  trendData: TrendDataPoint[];
}

export default function PredictiveDashboard() {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/predictions?window=${window}`)
      .then(r => r.json())
      .then(data => setPredictions(data.predictions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [window]);

  if (loading) return <div className="p-8 text-gray-400">Analyzing trends...</div>;

  if (predictions.length === 0) return (
    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
      <div className="text-5xl mb-4">&#128202;</div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">No Prediction Data</h3>
      <p className="text-sm text-gray-500">Need at least 2 weeks of reviews to generate predictions.</p>
    </div>
  );

  const totalAlerts = predictions.reduce((s, p) => s + p.alerts.length, 0);
  const criticalCount = predictions.reduce((s, p) => s + p.alerts.filter(a => a.severity === 'critical').length, 0);
  const positiveCount = predictions.reduce((s, p) => s + p.alerts.filter(a => a.severity === 'positive').length, 0);

  return (
    <div className="space-y-6">
      {/* Window Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Summary:</span>
            <span className="font-bold text-gray-800">{totalAlerts} alerts</span>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                {criticalCount} critical
              </span>
            )}
            {positiveCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded-full">
                {positiveCount} positive
              </span>
            )}
          </div>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setWindow('weekly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              window === 'weekly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setWindow('monthly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              window === 'monthly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Per-Store Predictions */}
      {predictions.map(pred => (
        <div key={pred.storeId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Store Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{pred.storeName}</h3>
              <span className="text-xs text-gray-400">
                {pred.alerts.length} alert{pred.alerts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Alerts */}
          {pred.alerts.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {pred.alerts.map((alert, idx) => {
                const config = SEVERITY_CONFIG[alert.severity];
                return (
                  <div key={idx} className={`px-6 py-4 ${config.bgClass}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm text-gray-800">{alert.title}</h4>
                          {alert.change !== 0 && (
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                              alert.change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {alert.change > 0 ? '+' : ''}{alert.change}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                        <p className="text-xs text-gray-500 italic">💡 {alert.suggestion}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              ✅ No alerts — all metrics looking stable
            </div>
          )}

          {/* Mini Trend Chart (text-based) */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3">
              {window === 'weekly' ? 'Weekly' : 'Monthly'} Trend (last 8 periods)
            </p>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {pred.trendData.map((point, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-xs font-mono text-gray-400 mb-1 truncate" title={point.period}>
                    {point.period.split('-').pop()}
                  </div>
                  {point.count > 0 ? (
                    <>
                      <div className="text-sm font-bold text-gray-700">
                        {point.avgRating.toFixed(1)}★
                      </div>
                      <div className="text-xs text-gray-400">{point.count} rev</div>
                      <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            point.positiveRatio >= 0.8 ? 'bg-green-500' :
                            point.positiveRatio >= 0.6 ? 'bg-blue-500' :
                            point.positiveRatio >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${point.positiveRatio * 100}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-300">—</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
