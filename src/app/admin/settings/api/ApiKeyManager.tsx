'use client';

import { useState, useEffect } from 'react';
import { API_SCOPES, maskKey, type ApiScope } from '@/lib/api-keys';

interface ApiKeyData {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_hour: number;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyRevealed, setNewKeyRevealed] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', scopes: ['read'] as string[] });

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    const res = await fetch('/api/admin/api-keys');
    const data = await res.json();
    setKeys(data.keys || []);
    setLoading(false);
  }

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          scopes: form.scopes,
        }),
      });
      const data = await res.json();
      if (data.fullKey) {
        setNewKeyRevealed(data.fullKey);
        setShowCreate(false);
        setForm({ name: '', scopes: ['read'] });
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    await fetch('/api/admin/api-keys', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchKeys();
  }

  function toggleScope(scope: string) {
    setForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope],
    }));
  }

  if (loading) return <div className="text-gray-400">Loading API keys...</div>;

  return (
    <div className="space-y-6">
      {/* New Key Alert */}
      {newKeyRevealed && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
          <h3 className="font-bold text-green-800 mb-2">🔑 API Key Created</h3>
          <p className="text-sm text-green-700 mb-3">
            Copy this key now — it will not be shown again.
          </p>
          <div className="bg-white rounded-lg p-3 font-mono text-sm break-all border border-green-200">
            {newKeyRevealed}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(newKeyRevealed);
              setNewKeyRevealed(null);
            }}
            className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            Copy & Dismiss
          </button>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{keys.filter(k => k.is_active).length} active key(s)</p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Create API Key
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Production Key"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(API_SCOPES) as [ApiScope, { label: string; description: string }][]).map(([scope, info]) => (
                <label key={scope} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
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
              onClick={createKey}
              disabled={!form.name.trim() || creating}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Key'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="space-y-3">
        {keys.map(key => (
          <div
            key={key.id}
            className={`bg-white rounded-xl border p-4 ${key.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-800">{key.name}</span>
                  {!key.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Revoked</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">{maskKey(key.key_prefix)}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-gray-400">
                    Scopes: {key.scopes.join(', ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {key.last_used_at
                      ? `Last used: ${new Date(key.last_used_at).toLocaleDateString()}`
                      : 'Never used'}
                  </span>
                </div>
              </div>
              {key.is_active && (
                <button
                  onClick={() => revokeKey(key.id)}
                  className="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}

        {keys.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-4xl mb-3">🔑</div>
            <p className="text-sm text-gray-500">No API keys yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* API Docs Link */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-2">API Endpoints</h3>
        <div className="space-y-2 text-sm font-mono text-gray-600">
          <p><span className="text-green-600 font-bold">GET</span> /api/v1/reviews?store_id=123&limit=50</p>
          <p><span className="text-blue-600 font-bold">GET</span> /api/v1/analytics?days=30</p>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Include header: <code className="bg-gray-200 px-1 rounded">Authorization: Bearer rm_live_xxxxx</code>
        </p>
      </div>
    </div>
  );
}
