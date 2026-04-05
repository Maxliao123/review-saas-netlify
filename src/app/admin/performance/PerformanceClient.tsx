'use client';

import { useState } from 'react';
import {
  Users,
  Package,
  BadgeCheck,
  DollarSign,
  Trophy,
  Star,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  Activity,
} from 'lucide-react';

interface StaffRank {
  id: string;
  name: string;
  total_checkins: number;
  avg_rating: number;
  review_count: number;
  commission: number;
}

interface DormantMember {
  id: string;
  name: string;
  phone: string;
  last_visit_at: string;
  days_since: number;
}

interface ExpiringCredit {
  id: string;
  package_name: string;
  remaining: number;
  total: number;
  expires_at: string;
  days_until: number;
  member_name: string;
  member_phone: string;
}

interface Stats {
  totalMembers: number;
  activePackages: number;
  todayCheckins: number;
  monthRevenue: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function PerformanceClient({
  stats,
  staffRanking,
  dormantMembers,
  expiringCredits,
}: {
  stats: Stats;
  staffRanking: StaffRank[];
  dormantMembers: DormantMember[];
  expiringCredits: ExpiringCredit[];
}) {
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  async function handleSendReminder(memberId: string) {
    setSendingReminder(memberId);
    try {
      await fetch('/api/admin/members/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, type: 'dormant_reminder' }),
      });
    } catch {
      // silently fail
    }
    setSendingReminder(null);
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Staff rankings, alerts, and key metrics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Members"
          value={stats.totalMembers}
          icon={Users}
          color="bg-[#FFF7ED] text-[#E8654A]"
        />
        <StatCard
          label="Active Packages"
          value={stats.activePackages}
          icon={Package}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Today's Check-ins"
          value={stats.todayCheckins}
          icon={BadgeCheck}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="This Month Revenue"
          value={`$${stats.monthRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Staff Ranking */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#E8654A]" />
          Staff Ranking (This Month)
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-8">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Check-ins</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Avg Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffRanking.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      <Activity className="h-7 w-7 mx-auto mb-2 opacity-50" />
                      <p>No staff data yet</p>
                    </td>
                  </tr>
                ) : (
                  staffRanking.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        {i < 3 ? (
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-amber-100 text-amber-700' :
                            i === 1 ? 'bg-gray-100 text-gray-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {i + 1}
                          </span>
                        ) : (
                          <span className="text-gray-400 pl-1.5">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{s.total_checkins}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {s.avg_rating > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-gray-700">{s.avg_rating}</span>
                            <span className="text-gray-400 text-xs">({s.review_count})</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {s.commission > 0 ? `$${s.commission.toFixed(2)}` : '--'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Two-column layout for alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dormant Members */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Dormant Members
            {dormantMembers.length > 0 && (
              <span className="ml-auto text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {dormantMembers.length} members
              </span>
            )}
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {dormantMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users className="h-7 w-7 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No dormant members</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {dormantMembers.map((m) => (
                  <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm">{m.name}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {m.days_since} days since last visit
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendReminder(m.id)}
                      disabled={sendingReminder === m.id}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#E8654A] bg-[#FFF7ED] rounded-lg hover:bg-[#FEE2D5] transition-colors disabled:opacity-50"
                    >
                      {sendingReminder === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Remind
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expiring Packages */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-500" />
            Expiring Packages (30 days)
            {expiringCredits.length > 0 && (
              <span className="ml-auto text-xs font-normal bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {expiringCredits.length} packages
              </span>
            )}
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {expiringCredits.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Package className="h-7 w-7 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No packages expiring soon</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {expiringCredits.map((c) => (
                  <div key={c.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm">{c.member_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{c.package_name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-gray-700">
                          {c.remaining}/{c.total} left
                        </div>
                        <div className={`text-xs font-medium ${
                          c.days_until <= 7 ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {c.days_until}d remaining
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
