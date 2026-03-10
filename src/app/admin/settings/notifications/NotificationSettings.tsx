'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Mail, MessageSquare, Hash, Phone, Plus, Trash2, TestTube, FileText } from 'lucide-react';
import { hasFeature } from '@/lib/plan-limits';

interface Store {
  id: number;
  name: string;
  slug?: string;
}

interface Channel {
  id: number;
  store_id: number;
  channel_type: string;
  is_active: boolean;
  config: any;
}

const CHANNEL_TYPES = [
  { type: 'email', label: 'Email', icon: Mail, description: 'Receive email notifications via Resend' },
  { type: 'line', label: 'LINE', icon: MessageSquare, description: 'LINE Messaging API notifications' },
  { type: 'slack', label: 'Slack', icon: Hash, description: 'Slack webhook notifications' },
  { type: 'whatsapp', label: 'WhatsApp', icon: Phone, description: 'WhatsApp via Twilio' },
];

export default function NotificationSettings({ stores, channels: initialChannels, role, storeThresholds: initialThresholds, weeklyReportEnabled: initialWeekly, plan }: {
  stores: Store[];
  channels: Channel[];
  role: 'owner' | 'manager' | 'staff';
  storeThresholds?: Record<number, number>;
  weeklyReportEnabled?: Record<number, boolean>;
  plan?: string;
}) {
  const [channels, setChannels] = useState(initialChannels);
  const [selectedStore, setSelectedStore] = useState<number>(stores[0]?.id || 0);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [thresholds, setThresholds] = useState<Record<number, number>>(initialThresholds || {});
  const [weeklyReport, setWeeklyReport] = useState<Record<number, boolean>>(initialWeekly || {});
  const planSupportsWeekly = hasFeature(plan || 'free', 'weeklyReports');

  const supabase = createSupabaseBrowserClient();
  const canEdit = role !== 'staff';

  const storeChannels = channels.filter(c => c.store_id === selectedStore);

  function getChannelConfig(type: string): Channel | undefined {
    return storeChannels.find(c => c.channel_type === type);
  }

  async function toggleChannel(type: string, config: any) {
    if (!canEdit) return;
    setSaving(true);

    const existing = getChannelConfig(type);

    if (existing) {
      const { error } = await supabase
        .from('notification_channels')
        .update({ is_active: !existing.is_active, config })
        .eq('id', existing.id);

      if (!error) {
        setChannels(prev => prev.map(c =>
          c.id === existing.id ? { ...c, is_active: !c.is_active, config } : c
        ));
      }
    } else {
      const { data, error } = await supabase
        .from('notification_channels')
        .insert({ store_id: selectedStore, channel_type: type, is_active: true, config })
        .select()
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setChannels(prev => [...prev, data]);
      }
    }

    setSaving(false);
  }

  async function updateConfig(type: string, config: any) {
    if (!canEdit) return;
    const existing = getChannelConfig(type);
    if (!existing) return;

    setSaving(true);
    const { error } = await supabase
      .from('notification_channels')
      .update({ config })
      .eq('id', existing.id);

    if (!error) {
      setChannels(prev => prev.map(c =>
        c.id === existing.id ? { ...c, config } : c
      ));
      setMessage('Saved!');
      setTimeout(() => setMessage(''), 2000);
    }
    setSaving(false);
  }

  async function testNotification(type: string) {
    setTesting(type);
    try {
      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: selectedStore, channel_type: type }),
      });
      const data = await res.json();
      setMessage(data.success ? 'Test notification sent!' : `Failed: ${data.error}`);
    } catch {
      setMessage('Test failed');
    }
    setTesting(null);
    setTimeout(() => setMessage(''), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Store Selector */}
      {stores.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => setSelectedStore(store.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedStore === store.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {store.name}
            </button>
          ))}
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Urgent Alert Threshold */}
      {canEdit && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Urgent Alert Threshold</h3>
          <p className="text-xs text-gray-500 mb-4">
            Reviews at or below this rating trigger urgent notifications with AI draft reply.
          </p>
          <div className="flex gap-2">
            {[
              { value: 2, label: '1-2 stars (strict)' },
              { value: 3, label: '1-3 stars (recommended)' },
            ].map(opt => {
              const current = thresholds[selectedStore] ?? 2;
              return (
                <button
                  key={opt.value}
                  onClick={async () => {
                    const { error } = await supabase
                      .from('stores')
                      .update({ negative_review_threshold: opt.value })
                      .eq('id', selectedStore);
                    if (!error) {
                      setThresholds(prev => ({ ...prev, [selectedStore]: opt.value }));
                      setMessage('Threshold saved!');
                      setTimeout(() => setMessage(''), 2000);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    current === opt.value
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Report Toggle */}
      {canEdit && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${weeklyReport[selectedStore] !== false ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <FileText className={`w-5 h-5 ${weeklyReport[selectedStore] !== false ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Weekly Report</h3>
                <p className="text-xs text-gray-500">
                  {planSupportsWeekly
                    ? 'Receive a weekly summary of reviews, ratings, and insights every Monday.'
                    : 'Upgrade to Starter or above to enable weekly reports.'}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!planSupportsWeekly) return;
                const newVal = !(weeklyReport[selectedStore] ?? true);
                const { error } = await supabase
                  .from('stores')
                  .update({ weekly_report_enabled: newVal })
                  .eq('id', selectedStore);
                if (!error) {
                  setWeeklyReport(prev => ({ ...prev, [selectedStore]: newVal }));
                  setMessage(newVal ? 'Weekly reports enabled!' : 'Weekly reports disabled.');
                  setTimeout(() => setMessage(''), 2000);
                }
              }}
              disabled={!planSupportsWeekly}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                weeklyReport[selectedStore] !== false && planSupportsWeekly ? 'bg-blue-600' : 'bg-gray-300'
              } ${!planSupportsWeekly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                weeklyReport[selectedStore] !== false && planSupportsWeekly ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      )}

      {/* Channel Cards */}
      {CHANNEL_TYPES.map(({ type, label, icon: Icon, description }) => {
        const channel = getChannelConfig(type);
        const isActive = channel?.is_active || false;
        const config = channel?.config || {};

        return (
          <div key={type} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{label}</h3>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isActive && (
                  <button
                    onClick={() => testNotification(type)}
                    disabled={testing === type}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    {testing === type ? 'Sending...' : 'Test'}
                  </button>
                )}
                <button
                  onClick={() => toggleChannel(type, config)}
                  disabled={!canEdit || saving}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isActive ? 'bg-blue-600' : 'bg-gray-300'
                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {/* Channel-specific config */}
            {isActive && canEdit && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {type === 'email' && (
                  <EmailConfig
                    config={config}
                    onSave={(c) => updateConfig(type, c)}
                  />
                )}
                {type === 'line' && (
                  <LineConfig
                    config={config}
                    onSave={(c) => updateConfig(type, c)}
                  />
                )}
                {type === 'slack' && (
                  <SlackConfig
                    config={config}
                    onSave={(c) => updateConfig(type, c)}
                  />
                )}
                {type === 'whatsapp' && (
                  <WhatsAppConfig
                    config={config}
                    onSave={(c) => updateConfig(type, c)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Config sub-components ----

function EmailConfig({ config, onSave }: { config: any; onSave: (c: any) => void }) {
  const [recipients, setRecipients] = useState<string[]>(config.recipients || []);
  const [newEmail, setNewEmail] = useState('');

  function addRecipient() {
    if (newEmail && !recipients.includes(newEmail)) {
      const updated = [...recipients, newEmail];
      setRecipients(updated);
      onSave({ recipients: updated });
      setNewEmail('');
    }
  }

  function removeRecipient(email: string) {
    const updated = recipients.filter(r => r !== email);
    setRecipients(updated);
    onSave({ recipients: updated });
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
      <div className="flex gap-2 flex-wrap mb-2">
        {recipients.map(email => (
          <span key={email} className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
            {email}
            <button onClick={() => removeRecipient(email)} className="text-blue-400 hover:text-blue-600">
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
        />
        <button onClick={addRecipient} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function LineConfig({ config, onSave }: { config: any; onSave: (c: any) => void }) {
  const [token, setToken] = useState(config.channel_access_token || '');
  const [userId, setUserId] = useState(config.target_user_id || '');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Channel Access Token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="From LINE Developers Console"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Target User ID</label>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="LINE User ID to receive notifications"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <button
        onClick={() => onSave({ channel_access_token: token, target_user_id: userId })}
        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
      >
        Save LINE Config
      </button>
    </div>
  );
}

function SlackConfig({ config, onSave }: { config: any; onSave: (c: any) => void }) {
  const [url, setUrl] = useState(config.webhook_url || '');

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Webhook URL</label>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button
          onClick={() => onSave({ webhook_url: url })}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function WhatsAppConfig({ config, onSave }: { config: any; onSave: (c: any) => void }) {
  const [phone, setPhone] = useState(config.phone_number || '');
  const [sid, setSid] = useState(config.account_sid || '');
  const [authToken, setAuthToken] = useState(config.auth_token || '');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp Phone Number</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1234567890"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Twilio Account SID</label>
        <input
          value={sid}
          onChange={(e) => setSid(e.target.value)}
          placeholder="ACxxxxx..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Twilio Auth Token</label>
        <input
          type="password"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          placeholder="Auth token"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>
      <button
        onClick={() => onSave({ phone_number: phone, provider: 'twilio', account_sid: sid, auth_token: authToken })}
        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
      >
        Save WhatsApp Config
      </button>
    </div>
  );
}
