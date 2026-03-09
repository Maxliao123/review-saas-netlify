'use client';

import { useState, useEffect } from 'react';
import { POS_PROVIDERS, type PosProvider } from '@/lib/pos-integration';

interface PosData {
  id: string;
  store_id: number;
  provider: PosProvider;
  name: string;
  auto_invite_enabled: boolean;
  auto_invite_delay_minutes: number;
  auto_invite_channel: string;
  min_transaction_amount: number;
  is_active: boolean;
  transactions_synced: number;
  invites_triggered: number;
}

export default function PosManager() {
  const [integrations, setIntegrations] = useState<PosData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    storeId: '',
    provider: 'toast' as PosProvider,
    name: '',
    autoInviteEnabled: true,
    autoInviteDelayMinutes: 60,
    autoInviteChannel: 'sms',
    minTransactionAmount: 0,
  });

  useEffect(() => { fetchIntegrations(); }, []);

  async function fetchIntegrations() {
    const res = await fetch('/api/admin/pos');
    const data = await res.json();
    setIntegrations(data.integrations || []);
    setLoading(false);
  }

  async function createIntegration() {
    setCreating(true);
    try {
      await fetch('/api/admin/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setShowCreate(false);
      setForm({ storeId: '', provider: 'toast', name: '', autoInviteEnabled: true, autoInviteDelayMinutes: 60, autoInviteChannel: 'sms', minTransactionAmount: 0 });
      fetchIntegrations();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch('/api/admin/pos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !isActive }),
    });
    fetchIntegrations();
  }

  if (loading) return <div className="text-gray-400">Loading POS integrations...</div>;

  return (
    <div className="space-y-6">
      {/* Provider Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {(Object.entries(POS_PROVIDERS) as [PosProvider, typeof POS_PROVIDERS[PosProvider]][]).map(([key, provider]) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors">
            <div className="text-2xl mb-2">{provider.icon}</div>
            <h4 className="font-bold text-sm text-gray-800">{provider.label}</h4>
            <p className="text-xs text-gray-400 mt-1">{provider.description}</p>
          </div>
        ))}
      </div>

      {/* Create Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{integrations.filter(i => i.is_active).length} active integration(s)</p>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Connect POS
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={form.provider}
                onChange={e => setForm(prev => ({ ...prev, provider: e.target.value as PosProvider }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {Object.entries(POS_PROVIDERS).map(([key, p]) => (
                  <option key={key} value={key}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Main Register"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay (min)</label>
              <input
                type="number"
                value={form.autoInviteDelayMinutes}
                onChange={e => setForm(prev => ({ ...prev, autoInviteDelayMinutes: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select
                value={form.autoInviteChannel}
                onChange={e => setForm(prev => ({ ...prev, autoInviteChannel: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount ($)</label>
              <input
                type="number"
                value={form.minTransactionAmount}
                onChange={e => setForm(prev => ({ ...prev, minTransactionAmount: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createIntegration} disabled={!form.name || creating} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
              {creating ? 'Connecting...' : 'Connect'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Integration List */}
      <div className="space-y-3">
        {integrations.map(int => {
          const provider = POS_PROVIDERS[int.provider];
          return (
            <div key={int.id} className={`bg-white rounded-xl border p-4 ${int.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider?.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{int.name}</span>
                      <span className="text-xs text-gray-400">{provider?.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{int.transactions_synced} transactions</span>
                      <span>{int.invites_triggered} invites sent</span>
                      <span>{int.auto_invite_delay_minutes}min delay</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(int.id, int.is_active)}
                  className={`px-3 py-1 text-xs rounded-lg border ${
                    int.is_active ? 'text-red-600 border-red-300' : 'text-green-600 border-green-300'
                  }`}
                >
                  {int.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          );
        })}
        {integrations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border">
            <div className="text-4xl mb-3">🔌</div>
            <p className="text-sm text-gray-500">No POS integrations yet. Connect your first POS system above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
