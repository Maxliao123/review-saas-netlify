'use client';

import { useState, useEffect } from 'react';
import { formatHour } from '@/lib/journey-analytics';

interface JourneyData {
  funnel: {
    stages: Array<{ name: string; count: number; conversionRate: number }>;
    totalScans: number;
    totalGenerated: number;
    totalClicked: number;
    overallConversion: number;
  };
  channels: Array<{ channel: string; scans: number; conversionRate: number }>;
  devices: Array<{ deviceType: string; count: number; conversionRate: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  inviteFunnel: {
    sent: number;
    delivered: number;
    opened: number;
    completed: number;
    deliveryRate: number;
    openRate: number;
    completionRate: number;
  };
}

export default function JourneyDashboard() {
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/journeys?days=${days}`)
      .then(r => r.json())
      .then(data => setJourney(data.journey || null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="p-8 text-gray-400">Mapping customer journeys...</div>;

  if (!journey) return (
    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
      <div className="text-5xl mb-4">🗺️</div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">No Journey Data</h3>
      <p className="text-sm text-gray-500">Start collecting QR scans to see customer journey analytics.</p>
    </div>
  );

  const maxHourCount = Math.max(...journey.peakHours.map(h => h.count), 1);

  return (
    <div className="space-y-6">
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

      {/* Main Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-1">Conversion Funnel</h3>
        <p className="text-xs text-gray-400 mb-6">
          Overall conversion: {journey.funnel.overallConversion}% (scan → click)
        </p>

        <div className="space-y-4">
          {journey.funnel.stages.map((stage, idx) => {
            const maxCount = Math.max(...journey.funnel.stages.map(s => s.count), 1);
            const width = Math.max(5, (stage.count / maxCount) * 100);
            const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-green-500'];

            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                    {idx > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        stage.conversionRate >= 50 ? 'bg-green-100 text-green-700' :
                        stage.conversionRate >= 20 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {stage.conversionRate}%
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-800">{stage.count.toLocaleString()}</span>
                </div>
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg ${colors[idx]} transition-all duration-700 flex items-center px-3`}
                    style={{ width: `${width}%` }}
                  >
                    {width > 15 && (
                      <span className="text-xs text-white font-medium">{stage.count}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column: Channels + Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">By Channel</h3>
          {journey.channels.length === 0 ? (
            <p className="text-sm text-gray-400">No channel data yet</p>
          ) : (
            <div className="space-y-3">
              {journey.channels.map(ch => {
                const icons: Record<string, string> = {
                  qr: '📱', nfc: '📡', link: '🔗', email: '📧', sms: '💬', unknown: '❓',
                };
                return (
                  <div key={ch.channel} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span>{icons[ch.channel] || '📊'}</span>
                      <span className="text-sm font-medium text-gray-700 capitalize">{ch.channel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{ch.scans} scans</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {ch.conversionRate}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">By Device</h3>
          {journey.devices.length === 0 ? (
            <p className="text-sm text-gray-400">No device data yet</p>
          ) : (
            <div className="space-y-3">
              {journey.devices.map(dev => {
                const icons: Record<string, string> = {
                  mobile: '📱', tablet: '📲', desktop: '🖥️', unknown: '❓',
                };
                return (
                  <div key={dev.deviceType} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span>{icons[dev.deviceType] || '📊'}</span>
                      <span className="text-sm font-medium text-gray-700 capitalize">{dev.deviceType}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{dev.count} scans</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                        {dev.conversionRate}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Peak Hours Heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Peak Activity Hours</h3>
        <div className="grid grid-cols-12 gap-1">
          {journey.peakHours.slice(6, 24).map(h => {
            const intensity = h.count / maxHourCount;
            const bg = intensity === 0 ? 'bg-gray-100' :
              intensity < 0.25 ? 'bg-blue-100' :
              intensity < 0.5 ? 'bg-blue-300' :
              intensity < 0.75 ? 'bg-blue-500' : 'bg-blue-700';
            const textColor = intensity >= 0.5 ? 'text-white' : 'text-gray-600';

            return (
              <div key={h.hour} className={`${bg} rounded p-2 text-center`} title={`${formatHour(h.hour)}: ${h.count} events`}>
                <div className={`text-xs font-mono ${textColor}`}>{formatHour(h.hour).replace(' ', '\n').split('\n')[0]}</div>
                <div className={`text-xs font-bold ${textColor}`}>{h.count}</div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">Shows activity from 6 AM to midnight. Darker = more activity.</p>
      </div>

      {/* Invite Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Invite Channel Funnel</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InviteStat label="Sent" value={journey.inviteFunnel.sent} />
          <InviteStat label="Delivered" value={journey.inviteFunnel.delivered} rate={journey.inviteFunnel.deliveryRate} />
          <InviteStat label="Opened" value={journey.inviteFunnel.opened} rate={journey.inviteFunnel.openRate} />
          <InviteStat label="Completed" value={journey.inviteFunnel.completed} rate={journey.inviteFunnel.completionRate} />
        </div>
      </div>
    </div>
  );
}

function InviteStat({ label, value, rate }: { label: string; value: number; rate?: number }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
      {rate !== undefined && (
        <div className={`text-xs font-bold mt-1 ${
          rate >= 50 ? 'text-green-600' : rate >= 20 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {rate}%
        </div>
      )}
    </div>
  );
}
