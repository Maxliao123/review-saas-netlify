'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch {
      alert('Failed to open billing portal. Please try again.');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Loading...' : (
        <>Manage Subscription <ExternalLink className="h-3.5 w-3.5" /></>
      )}
    </button>
  );
}

export function CheckoutButton({ planId, label }: { planId: string; label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
      }
    } catch {
      alert('Checkout failed. Please try again.');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Loading...' : label}
    </button>
  );
}
