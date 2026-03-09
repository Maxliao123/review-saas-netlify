'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Mail, Phone, CheckCircle, XCircle, Clock, Eye, Upload, FileText, AlertTriangle } from 'lucide-react';
import { getPlanLimits } from '@/lib/plan-limits';
import { parseCSV, type CsvRow } from '@/lib/csv-parser';

interface Store {
  id: number;
  name: string;
}

interface Invite {
  id: number;
  channel: string;
  recipient: string;
  recipient_name: string | null;
  status: string;
  sent_at: string;
  opened_at: string | null;
  completed_at: string | null;
}

interface Props {
  stores: Store[];
  tenantId: string;
  plan: string;
}

export default function InviteDashboard({ stores, tenantId, plan }: Props) {
  const limits = getPlanLimits(plan);
  const [selectedStore, setSelectedStore] = useState<number>(stores[0]?.id || 0);
  const [channel, setChannel] = useState<'sms' | 'email'>('email');
  const [recipients, setRecipients] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputMode, setInputMode] = useState<'text' | 'csv'>('text');
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch invite history
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedStore) params.set('store_id', selectedStore.toString());

    fetch(`/api/admin/invites?${params}`)
      .then(r => r.json())
      .then(data => setInvites(data.invites || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStore, result]);

  if (!limits.features.reviewInvites) {
    return (
      <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
        <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">Upgrade to Pro</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
          Review invites are available on Pro and Enterprise plans.
          Send SMS or email invitations to collect more reviews.
        </p>
        <a
          href="/admin/settings/billing"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium"
        >
          Upgrade Plan
        </a>
      </div>
    );
  }

  const handleSend = async () => {
    if (!recipients.trim() || !selectedStore || sending) return;
    setSending(true);
    setResult(null);

    // Parse recipients (one per line, format: "recipient" or "name, recipient")
    const parsed = recipients
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          return { channel, recipientName: parts[0], recipient: parts[1] };
        }
        return { channel, recipient: parts[0] };
      });

    try {
      const resp = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStore, recipients: parsed }),
      });
      const data = await resp.json();

      if (resp.ok) {
        setResult({ sent: data.sent, failed: data.failed });
        setRecipients('');
      } else {
        setResult({ sent: 0, failed: parsed.length });
        alert(data.error || 'Failed to send invites');
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('Please upload a .csv or .txt file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const { rows, errors } = parseCSV(text);
      setCsvRows(rows);
      setCsvErrors(errors);
      setCsvFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleCSVSend = async () => {
    const validRows = csvRows.filter(r => r.valid);
    if (!validRows.length || !selectedStore || sending) return;
    setSending(true);
    setResult(null);
    setSendProgress({ current: 0, total: validRows.length });

    const batchSize = 20;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      const recipients = batch.map(row => ({
        channel: row.channel,
        recipient: row.channel === 'email' ? row.email : row.phone,
        recipientName: row.name || undefined,
      }));

      try {
        const resp = await fetch('/api/admin/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: selectedStore, recipients }),
        });
        const data = await resp.json();
        if (resp.ok) {
          totalSent += data.sent || 0;
          totalFailed += data.failed || 0;
        } else {
          totalFailed += batch.length;
        }
      } catch {
        totalFailed += batch.length;
      }
      setSendProgress({ current: Math.min(i + batchSize, validRows.length), total: validRows.length });
    }

    setResult({ sent: totalSent, failed: totalFailed });
    setSendProgress(null);
    setCsvRows([]);
    setCsvFileName('');
    setCsvErrors([]);
    setSending(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'opened': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'delivered': return <CheckCircle className="w-4 h-4 text-gray-400" />;
      case 'failed': case 'bounced': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const stats = {
    total: invites.length,
    delivered: invites.filter(i => ['delivered', 'opened', 'completed'].includes(i.status)).length,
    opened: invites.filter(i => ['opened', 'completed'].includes(i.status)).length,
    completed: invites.filter(i => i.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Store selector */}
      {stores.length > 1 && (
        <div className="flex gap-2">
          {stores.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStore(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedStore === s.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Sent</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
          <p className="text-xs text-gray-500">Delivered</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.opened}</p>
          <p className="text-xs text-gray-500">Opened</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-gray-500">Reviews Left</p>
        </div>
      </div>

      {/* Send Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Send Invites</h3>
          {/* Input mode toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Manual
            </button>
            <button
              onClick={() => setInputMode('csv')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                inputMode === 'csv' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> CSV Import
            </button>
          </div>
        </div>

        {inputMode === 'text' ? (
          <>
            {/* Channel selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setChannel('email')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  channel === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
              <button
                onClick={() => setChannel('sms')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  channel === 'sms' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Phone className="w-4 h-4" /> SMS
              </button>
            </div>

            {/* Recipients input */}
            <textarea
              value={recipients}
              onChange={e => setRecipients(e.target.value)}
              placeholder={channel === 'email'
                ? 'One per line:\njohn@example.com\nJane Doe, jane@example.com'
                : 'One per line:\n+1234567890\nJohn, +1234567890'}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm h-32 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Monthly limit: {limits.maxInvitesPerMonth === Infinity ? 'Unlimited' : limits.maxInvitesPerMonth}
              </p>
              <button
                onClick={handleSend}
                disabled={sending || !recipients.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send Invites'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* CSV Import */}
            {csvRows.length === 0 ? (
              <>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Drop a CSV file here or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Columns: name, email, phone (auto-detected)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium mb-1">CSV Format Example:</p>
                  <code className="text-xs text-gray-600 font-mono">
                    name,email,phone<br />
                    John Doe,john@example.com,+1234567890<br />
                    Jane Smith,jane@example.com,
                  </code>
                </div>
              </>
            ) : (
              <>
                {/* CSV Preview */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 font-medium">{csvFileName}</span>
                    <span className="text-xs text-gray-400">
                      ({csvRows.length} rows, {csvRows.filter(r => r.valid).length} valid)
                    </span>
                  </div>
                  <button
                    onClick={() => { setCsvRows([]); setCsvFileName(''); setCsvErrors([]); }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Clear
                  </button>
                </div>

                {csvErrors.length > 0 && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-800">{csvErrors.length} issue(s)</span>
                    </div>
                    {csvErrors.slice(0, 5).map((err, i) => (
                      <p key={i} className="text-xs text-yellow-700">{err}</p>
                    ))}
                    {csvErrors.length > 5 && (
                      <p className="text-xs text-yellow-600 mt-1">...and {csvErrors.length - 5} more</p>
                    )}
                  </div>
                )}

                <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Contact</th>
                        <th className="px-3 py-2 font-medium">Channel</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className={row.valid ? '' : 'bg-red-50'}>
                          <td className="px-3 py-1.5 text-gray-800">{row.name || '-'}</td>
                          <td className="px-3 py-1.5 text-gray-600">{row.email || row.phone}</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                              row.channel === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {row.channel === 'email' ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                              {row.channel}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            {row.valid ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <span className="text-xs text-red-500">{row.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 50 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      Showing first 50 of {csvRows.length} rows
                    </p>
                  )}
                </div>

                {sendProgress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Sending invites...</span>
                      <span className="text-xs text-gray-500">{sendProgress.current} / {sendProgress.total}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {csvRows.filter(r => r.valid).length} valid recipients |
                    Monthly limit: {limits.maxInvitesPerMonth === Infinity ? 'Unlimited' : limits.maxInvitesPerMonth}
                  </p>
                  <button
                    onClick={handleCSVSend}
                    disabled={sending || csvRows.filter(r => r.valid).length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending...' : `Send ${csvRows.filter(r => r.valid).length} Invites`}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {result && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            result.failed === 0 ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'
          }`}>
            Sent: {result.sent} | Failed: {result.failed}
          </div>
        )}
      </div>

      {/* Invite History */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Invites</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-gray-400">No invites sent yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {invites.slice(0, 20).map(invite => (
              <div key={invite.id} className="py-3 flex items-center gap-3">
                {invite.channel === 'email' ? (
                  <Mail className="w-4 h-4 text-gray-400" />
                ) : (
                  <Phone className="w-4 h-4 text-gray-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {invite.recipient_name && <span className="font-medium">{invite.recipient_name} — </span>}
                    {invite.recipient}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(invite.sent_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {statusIcon(invite.status)}
                  <span className="text-xs text-gray-500 capitalize">{invite.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
