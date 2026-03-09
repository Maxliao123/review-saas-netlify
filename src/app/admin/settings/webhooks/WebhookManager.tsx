'use client';

import { useState, useEffect } from 'react';
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from '@/lib/webhooks';

interface WebhookData {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_status_code: number | null;
  failure_count: number;
  created_at: string;
}

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[] });

  useEffect(() => { fetchWebhooks(); }, []);

  async function fetchWebhooks() {
    const res = await fetch('/api/admin/webhooks');
    const data = await res.json();
    setWebhooks(data.webhooks || []);
    setLoading(false);
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
      if (data.secret) {
        setRevealedSecret(data.secret);
        setShowCreate(false);
        setForm({ name: '', url: '', events: [] });
        fetchWebhooks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch('/api/admin/webhooks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    fetchWebhooks();
  }

  function toggleEvent(event: string) {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  }

  if (loading) return <div className="text-gray-400">Loading webhooks...</div>;

  return (
    <div className="space-y-6">
      {/* Secret Alert */}
      {revealedSecret && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6">
          <h3 className="font-bold text-amber-800 mb-2">🔐 Webhook Signing Secret</h3>
          <p className="text-sm text-amber-700 mb-3">
            Use this secret to verify webhook signatures. It will not be shown again.
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
            Copy & Dismiss
          </button>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{webhooks.filter(w => w.is_active).length} active webhook(s)</p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Add Webhook
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Salesforce Sync"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL (HTTPS)</label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://your-app.com/webhooks/reviews"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(Object.entries(WEBHOOK_EVENT_TYPES) as [WebhookEventType, { label: string; description: string }][]).map(([event, info]) => (
                <label key={event} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-gray-50">
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
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createWebhook}
              disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0 || creating}
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
        {webhooks.map(wh => (
          <div key={wh.id} className={`bg-white rounded-xl border p-4 ${wh.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${wh.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="font-bold text-sm text-gray-800">{wh.name}</span>
                {wh.failure_count > 3 && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                    {wh.failure_count} failures
                  </span>
                )}
              </div>
              <button
                onClick={() => toggleActive(wh.id, wh.is_active)}
                className={`px-3 py-1 text-xs rounded-lg border ${
                  wh.is_active
                    ? 'text-red-600 border-red-300 hover:bg-red-50'
                    : 'text-green-600 border-green-300 hover:bg-green-50'
                }`}
              >
                {wh.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
            <p className="text-xs text-gray-400 font-mono truncate">{wh.url}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {wh.events.map(event => (
                <span key={event} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                  {event}
                </span>
              ))}
            </div>
            {wh.last_triggered_at && (
              <p className="text-xs text-gray-400 mt-2">
                Last triggered: {new Date(wh.last_triggered_at).toLocaleString()}
                {wh.last_status_code && ` (${wh.last_status_code})`}
              </p>
            )}
          </div>
        ))}

        {webhooks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-sm text-gray-500">No webhooks configured. Add one to receive real-time events.</p>
          </div>
        )}
      </div>
    </div>
  );
}
