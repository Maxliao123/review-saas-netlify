'use client';

import { useState, useEffect } from 'react';

interface HealthStatus {
  isActive: boolean;
  lastReceivedAt: string | null;
  lastProcessedAt: string | null;
  totalReceived: number;
  totalProcessed: number;
  totalErrors: number;
  avgProcessingMs: number;
  uptimePercent: number;
}

interface LatencyComparison {
  cronAvgLatency: string;
  webhookAvgLatency: string;
  improvement: string;
  speedupFactor: number;
}

interface WebhookData {
  health: HealthStatus;
  latency: LatencyComparison;
  instructions: string[];
  pushEndpoint: string;
  verificationToken: string;
  cronFallbackActive: boolean;
}

export default function RealtimeSettings() {
  const [data, setData] = useState<WebhookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/webhook-status')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <div className="text-gray-400">Loading real-time settings...</div>;
  if (!data) return <div className="text-red-500">Failed to load webhook status.</div>;

  const { health, latency, instructions, pushEndpoint, verificationToken, cronFallbackActive } = data;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-xl border-2 p-5 ${health.isActive ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${health.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <h3 className="font-bold text-gray-800">Real-Time Webhook</h3>
          </div>
          <p className="text-sm text-gray-600">
            {health.isActive ? 'Active — receiving push notifications' : 'Inactive — using cron polling'}
          </p>
        </div>
        <div className={`rounded-xl border-2 p-5 ${cronFallbackActive ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-300'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${cronFallbackActive ? 'bg-blue-500' : 'bg-gray-400'}`} />
            <h3 className="font-bold text-gray-800">Cron Fallback</h3>
          </div>
          <p className="text-sm text-gray-600">
            {cronFallbackActive ? 'Active — safety net every 5 min' : 'Disabled'}
          </p>
        </div>
      </div>

      {/* Latency Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Speed Comparison</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Cron Polling</div>
            <div className="text-xl font-bold text-gray-500">{latency.cronAvgLatency}</div>
          </div>
          <div className="text-center flex flex-col items-center justify-center">
            <div className="text-2xl">→</div>
            <div className="text-xs font-bold text-green-600 mt-1">{latency.improvement}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Real-Time Webhook</div>
            <div className="text-xl font-bold text-green-600">{latency.webhookAvgLatency}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">
          Webhook delivers reviews {latency.speedupFactor}x faster than cron polling
        </p>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">Processing Metrics</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{health.totalReceived}</div>
            <div className="text-xs text-gray-500">Received</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{health.totalProcessed}</div>
            <div className="text-xs text-gray-500">Processed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{health.totalErrors}</div>
            <div className="text-xs text-gray-500">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{health.uptimePercent}%</div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>
        </div>
        {health.lastProcessedAt && (
          <p className="text-xs text-gray-400 text-center mt-3">
            Last processed: {new Date(health.lastProcessedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Setup Guide</h3>
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showSetup ? 'Hide' : 'Show'} Instructions
          </button>
        </div>

        {/* Endpoint & Token (always visible) */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Push Endpoint URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm font-mono text-gray-700 truncate">
                {pushEndpoint}
              </code>
              <button
                onClick={() => copyToClipboard(pushEndpoint, 'endpoint')}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                {copied === 'endpoint' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Token</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm font-mono text-gray-700 truncate">
                {verificationToken}
              </code>
              <button
                onClick={() => copyToClipboard(verificationToken, 'token')}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                {copied === 'token' ? '✓' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Step-by-step guide */}
        {showSetup && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {instructions.map((step, i) => (
              <p key={i} className="text-sm text-gray-600 font-mono whitespace-pre-wrap">{step}</p>
            ))}
          </div>
        )}
      </div>

      {/* Architecture Diagram */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-800 mb-4">How It Works</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <pre className="text-xs text-gray-600 font-mono whitespace-pre overflow-x-auto">
{`┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Google Business    │     │  Google Cloud     │     │  Your App           │
│  Profile            │────→│  Pub/Sub          │────→│  /api/webhooks/     │
│  (New Review)       │     │  (Push)           │     │  google-reviews     │
└─────────────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                                │
                                              ┌─────────────────▼────────────────┐
                                              │  Real-Time Processing Pipeline   │
                                              │                                  │
                                              │  1. Verify Pub/Sub signature     │
                                              │  2. Fetch review from Google API │
                                              │  3. AI generates reply (<3s)     │
                                              │  4. Auto-approve (if enabled)    │
                                              │  5. Publish to Google (<1s)      │
                                              │                                  │
                                              │  Total: ~15-25 seconds           │
                                              └──────────────────────────────────┘

  ┌──────────────────────────────────────────┐
  │  Cron Fallback (every 5 min)             │
  │  Catches any missed notifications        │
  │  Deduplication prevents double-processing│
  └──────────────────────────────────────────┘`}
          </pre>
        </div>
      </div>
    </div>
  );
}
