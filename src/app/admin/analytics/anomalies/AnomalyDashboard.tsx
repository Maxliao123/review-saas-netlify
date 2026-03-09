'use client';

import { useState, useEffect } from 'react';
import { ANOMALY_LEVEL_CONFIG } from '@/lib/anomaly-detection';

interface AnomalyData {
  reviewId: string;
  authorName: string;
  rating: number;
  content: string;
  score: number;
  level: 'flagged' | 'suspect' | 'clean';
  flags: string[];
  storeId: number;
  storeName: string;
  breakdown: {
    textQuality: number;
    patternSignal: number;
    sentimentMismatch: number;
    profileSignal: number;
  };
}

interface Stats {
  total: number;
  flagged: number;
  suspect: number;
  clean: number;
}

export default function AnomalyDashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, flagged: 0, suspect: 0, clean: 0 });
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/anomalies?days=${days}`)
      .then(r => r.json())
      .then(data => {
        setAnomalies(data.anomalies || []);
        setStats(data.stats || { total: 0, flagged: 0, suspect: 0, clean: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="p-8 text-gray-400">Scanning for anomalies...</div>;

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Analyzed" value={stats.total} color="gray" />
        <StatCard label="Flagged" value={stats.flagged} color="red" icon="🚩" />
        <StatCard label="Suspect" value={stats.suspect} color="yellow" icon="⚠️" />
        <StatCard label="Clean" value={stats.clean} color="green" icon="✅" />
      </div>

      {/* Period Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {anomalies.length > 0
            ? `${anomalies.length} suspicious review${anomalies.length !== 1 ? 's' : ''} found`
            : 'No suspicious reviews detected'}
        </p>
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

      {/* Anomaly List */}
      {anomalies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-5xl mb-4">🛡️</div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">All Clear</h3>
          <p className="text-sm text-gray-500">No suspicious reviews detected in the last {days} days.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map(anomaly => {
            const config = ANOMALY_LEVEL_CONFIG[anomaly.level];
            return (
              <div
                key={anomaly.reviewId}
                className={`rounded-xl border p-5 ${config.bgClass}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{config.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-800">{anomaly.authorName}</span>
                        <span className="text-xs text-gray-400">{anomaly.storeName}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={`text-xs ${i < anomaly.rating ? 'text-yellow-500' : 'text-gray-300'}`}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">{anomaly.score}</div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      anomaly.level === 'flagged' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Review Content */}
                {anomaly.content && (
                  <p className="text-sm text-gray-600 mb-3 bg-white/60 rounded-lg p-3 italic">
                    &ldquo;{anomaly.content.slice(0, 200)}{anomaly.content.length > 200 ? '…' : ''}&rdquo;
                  </p>
                )}

                {/* Flags */}
                <div className="space-y-1 mb-3">
                  {anomaly.flags.map((flag, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="text-red-400">●</span>
                      {flag}
                    </div>
                  ))}
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-4 gap-2">
                  <BreakdownBar label="Text" value={anomaly.breakdown.textQuality} max={25} />
                  <BreakdownBar label="Pattern" value={anomaly.breakdown.patternSignal} max={25} />
                  <BreakdownBar label="Sentiment" value={anomaly.breakdown.sentimentMismatch} max={25} />
                  <BreakdownBar label="Profile" value={anomaly.breakdown.profileSignal} max={25} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon?: string }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span>{icon}</span>}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
    </div>
  );
}

function BreakdownBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = pct >= 60 ? 'bg-red-500' : pct >= 30 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="bg-white/80 rounded p-2">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-mono text-gray-700">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
