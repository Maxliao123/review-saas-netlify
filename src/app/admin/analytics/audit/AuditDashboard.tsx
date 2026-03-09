'use client';

import { useState, useEffect } from 'react';
import { AUDIT_SEVERITY_CONFIG, type AuditAlert } from '@/lib/review-auditor';

interface AuditData extends AuditAlert {
  storeName: string;
}

export default function AuditDashboard() {
  const [alerts, setAlerts] = useState<AuditData[]>([]);
  const [stats, setStats] = useState({ totalReviewed: 0, alertCount: 0, criticalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/audit?days=${days}`)
      .then(r => r.json())
      .then(data => {
        setAlerts(data.alerts || []);
        setStats(data.stats || { totalReviewed: 0, alertCount: 0, criticalCount: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="p-8 text-gray-400">Auditing reviews for manipulation...</div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.totalReviewed}</div>
          <div className="text-xs text-gray-500">Reviews Audited</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{stats.alertCount}</div>
          <div className="text-xs text-gray-500">Alerts Found</div>
        </div>
        <div className={`rounded-xl border p-4 text-center ${stats.criticalCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className={`text-2xl font-bold ${stats.criticalCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {stats.criticalCount}
          </div>
          <div className="text-xs text-gray-500">Critical Threats</div>
        </div>
      </div>

      {/* Period Toggle */}
      <div className="flex justify-end">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                days === d ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-5xl mb-4">🛡️</div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">No Manipulation Detected</h3>
          <p className="text-sm text-gray-500">All reviews look legitimate in the last {days} days.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert, idx) => {
            const config = AUDIT_SEVERITY_CONFIG[alert.severity];
            const typeIcons: Record<string, string> = {
              coordinated_attack: '🎯',
              review_bomb: '💣',
              cross_store: '🕸️',
              competitor_mention: '🏪',
              geographic_anomaly: '🌍',
            };

            return (
              <div key={idx} className={`rounded-xl border-2 p-5 ${config.bgClass}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{typeIcons[alert.type] || config.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-800">{alert.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                        alert.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{alert.description}</p>

                    {/* Evidence */}
                    <div className="bg-white/60 rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Evidence:</p>
                      {alert.evidence.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="text-gray-400">•</span> {e}
                        </div>
                      ))}
                    </div>

                    {/* Recommendation */}
                    <div className="flex items-start gap-2 text-xs text-gray-500">
                      <span>💡</span>
                      <span className="italic">{alert.recommendedAction}</span>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      {alert.affectedReviews.length} review(s) affected
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
