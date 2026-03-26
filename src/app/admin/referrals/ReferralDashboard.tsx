'use client';

import { useState, useEffect } from 'react';
import { Copy, Mail, MessageCircle, Gift, MousePointerClick, UserPlus, CreditCard, Trophy } from 'lucide-react';

interface ReferralStats {
  clicks: number;
  signups: number;
  paid: number;
  rewards: number;
}

interface Referral {
  id: number;
  referred_email: string | null;
  referred_name: string | null;
  status: string;
  reward_type: string | null;
  reward_amount: number | null;
  created_at: string;
  converted_at: string | null;
}

interface ReferralData {
  referral_code: string | null;
  stats: ReferralStats;
  referrals: Referral[];
}

const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
  signed_up: { label: 'Signed Up', classes: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Paid', classes: 'bg-green-100 text-green-700' },
  rewarded: { label: 'Rewarded', classes: 'bg-purple-100 text-purple-700' },
  churned: { label: 'Churned', classes: 'bg-gray-100 text-gray-500' },
};

export default function ReferralDashboard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/referrals');
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch referral data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton loading */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-10 bg-gray-100 rounded w-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.referral_code) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Referral Program</h3>
        <p className="text-gray-500">Your referral code is being set up. Please check back soon.</p>
      </div>
    );
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const referralUrl = `${baseUrl}/auth/signup?ref=${data.referral_code}`;

  function handleCopy() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleEmailShare() {
    const subject = encodeURIComponent('Try ReplyWise AI - AI-powered review management');
    const body = encodeURIComponent(
      `Hey! I've been using ReplyWise AI to manage my Google reviews and it's been great. You can sign up with my referral link and get 50% off your first month:\n\n${referralUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(
      `Check out ReplyWise AI for managing Google reviews! Sign up with my link and get 50% off: ${referralUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  const kpis = [
    { label: 'Clicks', value: data.stats.clicks, icon: MousePointerClick, color: 'text-blue-600' },
    { label: 'Signups', value: data.stats.signups, icon: UserPlus, color: 'text-green-600' },
    { label: 'Paid Conversions', value: data.stats.paid, icon: CreditCard, color: 'text-indigo-600' },
    { label: 'Rewards Earned', value: data.stats.rewards, icon: Trophy, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Referral Link Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Referral Link</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-mono truncate">
            {referralUrl}
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Code: <span className="font-mono font-medium text-gray-600">{data.referral_code}</span> — Share this link and earn rewards when referrals upgrade.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Share Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Share Your Link</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy Link
          </button>
          <button
            onClick={handleEmailShare}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-2 px-4 py-2 border border-green-300 text-green-700 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Referral History</h3>
        </div>
        {data.referrals.length === 0 ? (
          <div className="p-8 text-center">
            <Gift className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No referrals yet. Share your link to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Email / Name</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.referrals.map((ref) => {
                  const badge = STATUS_BADGES[ref.status] || { label: ref.status, classes: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={ref.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{ref.referred_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{ref.referred_email || '—'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {ref.status === 'rewarded' ? (
                          <span className="text-purple-600 font-medium">{ref.reward_type || 'Free Month'}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
