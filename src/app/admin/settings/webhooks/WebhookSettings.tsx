'use client';

import { useState, useEffect } from 'react';
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from '@/lib/webhooks';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  created_at: string;
}

interface Delivery {
  id: number;
  webhook_config_id: string;
  event: string;
  status_code: number | null;
  success: boolean;
  created_at: string;
}

const MAX_WEBHOOKS = 3;

// Subset of events shown in the UI (core Zapier-friendly events)
const SUBSCRIBABLE_EVENTS: WebhookEventType[] = [
  'review.created',
  'review.replied',
  'review.negative_alert',
];

export default function WebhookSettings() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; statusCode: number | null } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ url: '', events: ['review.created'] as string[] });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/admin/webhooks');
      const data = await res.json();
      setWebhooks(data.webhooks || []);
      setDeliveries(data.deliveries || []);
    } finally {
      setLoading(false);
    }
  }

  async function createWebhook() {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create webhook');
        return;
      }
      if (data.secret) {
        setRevealedSecret(data.secret);
        setShowCreate(false);
        setForm({ url: '', events: ['review.created'] });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Delete this webhook? Delivery history will also be removed.')) return;
    setDeletingId(id);
    try {
      await fetch('/api/admin/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchData();
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleEnabled(id: string, currentEnabled: boolean) {
    await fetch('/api/admin/webhooks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled: !currentEnabled }),
    });
    fetchData();
  }

  async function testWebhook(id: string) {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', webhookId: id }),
      });
      const data = await res.json();
      setTestResult({ success: data.success, statusCode: data.statusCode });
      fetchData(); // Refresh deliveries
    } catch {
      setTestResult({ success: false, statusCode: null });
    } finally {
      setTestingId(null);
    }
  }

  function toggleEvent(event: string) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  if (loading) return <div className="text-gray-400">Loading webhooks...</div>;

  return (
    <div className="space-y-6">
      {/* Secret Alert */}
      {revealedSecret && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6">
          <h3 className="font-bold text-amber-800 mb-2">Webhook Signing Secret</h3>
          <p className="text-sm text-amber-700 mb-3">
            Use this secret to verify webhook signatures via the{' '}
            <code className="bg-amber-100 px-1 rounded text-xs">X-ReplyWise-Signature</code> header.
            It will not be shown again.
          </p>
          <div className="bg-white rounded-lg p-3 font-mono text-sm break-all border border-amber-200">
            {revealedSecret}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(revealedSecret);
              setRevealedSecret(null);
            }}
            className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
          >
            Copy &amp; Dismiss
          </button>
        </div>
      )}

      {/* Test Result Toast */}
      {testResult && (
        <div
          className={`rounded-xl p-4 border-2 ${
            testResult.success
              ? 'bg-green-50 border-green-300 text-green-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {testResult.success
                ? `Test delivery succeeded (HTTP ${testResult.statusCode})`
                : `Test delivery failed${testResult.statusCode ? ` (HTTP ${testResult.statusCode})` : ' (connection error)'}`}
            </p>
            <button onClick={() => setTestResult(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {webhooks.length} / {MAX_WEBHOOKS} webhook(s) configured
        </p>
        {webhooks.length < MAX_WEBHOOKS && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + Add Webhook
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL (HTTPS)</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Events to subscribe</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUBSCRIBABLE_EVENTS.map((event) => {
                const info = WEBHOOK_EVENT_TYPES[event];
                return (
                  <label
                    key={event}
                    className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium">{info.label}</span>
                      <p className="text-xs text-gray-400">{info.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createWebhook}
              disabled={!form.url.trim() || form.events.length === 0 || creating}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Webhook'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      <div className="space-y-3">
        {webhooks.map((wh) => (
          <div
            key={wh.id}
            className={`bg-white rounded-xl border p-4 ${
              wh.enabled ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${wh.enabled ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                <span className="font-mono text-sm text-gray-800 truncate max-w-xs">{wh.url}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => testWebhook(wh.id)}
                  disabled={testingId === wh.id}
                  className="px-3 py-1 text-xs rounded-lg border text-blue-600 border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                >
                  {testingId === wh.id ? 'Sending...' : 'Test'}
                </button>
                <button
                  onClick={() => toggleEnabled(wh.id, wh.enabled)}
                  className={`px-3 py-1 text-xs rounded-lg border ${
                    wh.enabled
                      ? 'text-orange-600 border-orange-300 hover:bg-orange-50'
                      : 'text-green-600 border-green-300 hover:bg-green-50'
                  }`}
                >
                  {wh.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => deleteWebhook(wh.id)}
                  disabled={deletingId === wh.id}
                  className="px-3 py-1 text-xs rounded-lg border text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {wh.events.map((event) => (
                <span key={event} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                  {event}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Created {new Date(wh.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}

        {webhooks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">No webhooks configured.</p>
            <p className="text-xs text-gray-400">
              Connect Zapier, Slack, HubSpot, or any HTTPS endpoint to receive real-time review events.
            </p>
          </div>
        )}
      </div>

      {/* Recent Deliveries */}
      {deliveries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Deliveries</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Event</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Endpoint</th>
                  <th className="px-4 py-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((d) => {
                  const wh = webhooks.find((w) => w.id === d.webhook_config_id);
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{d.event}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                            d.success
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {d.success ? 'OK' : 'Failed'}
                          {d.status_code && ` (${d.status_code})`}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400 truncate max-w-[200px]">
                        {wh?.url || 'Deleted'}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400 text-right whitespace-nowrap">
                        {new Date(d.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
