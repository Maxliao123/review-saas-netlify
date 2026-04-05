'use client';

import { useState, useTransition } from 'react';
import {
  Search,
  Plus,
  Send,
  Package,
  X,
  Loader2,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { createMember, sendMemberLink } from './actions';

interface Member {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  points_balance: number;
  total_visits: number;
  last_visit_at: string | null;
  status: string;
  tags: string[];
  created_at: string;
  store_id: number;
  packages: { remaining: number; total: number };
}

interface Store {
  id: number;
  name: string;
  slug: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-yellow-100 text-yellow-700',
  churned: 'bg-red-100 text-red-700',
};

const FILTER_TABS = ['all', 'active', 'inactive', 'churned'] as const;

export default function MembersClient({
  members,
  stores,
  tenantId,
}: {
  members: Member[];
  stores: Store[];
  tenantId: number;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTER_TABS)[number]>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sendingLink, setSendingLink] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const filtered = members.filter((m) => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: members.length,
    active: members.filter((m) => m.status === 'active').length,
    inactive: members.filter((m) => m.status === 'inactive').length,
    churned: members.filter((m) => m.status === 'churned').length,
  };

  async function handleCreate(formData: FormData) {
    setFormError(null);
    setFormSuccess(false);
    startTransition(async () => {
      const result = await createMember(formData);
      if (result.error) {
        setFormError(result.error);
      } else {
        setFormSuccess(true);
        setTimeout(() => {
          setShowAddForm(false);
          setFormSuccess(false);
        }, 1500);
      }
    });
  }

  async function handleSendLink(memberId: string) {
    setSendingLink(memberId);
    const result = await sendMemberLink(memberId);
    setSendingLink(null);
    if (result.error) {
      alert(result.error);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <>
      {/* Search + Add */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8654A] text-white rounded-lg text-sm font-medium hover:bg-[#D55A40] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <div className="mb-6 rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New Member</h3>
            <button onClick={() => setShowAddForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {formSuccess ? (
            <div className="flex items-center gap-2 text-green-600 py-4">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Member created successfully!</span>
            </div>
          ) : (
            <form action={handleCreate} className="grid sm:grid-cols-4 gap-3">
              <input
                name="name"
                placeholder="Name *"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <input
                name="phone"
                placeholder="Phone *"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <input
                name="email"
                type="email"
                placeholder="Email (optional)"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <div className="flex gap-2">
                <select
                  name="store_id"
                  required
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-[#E8654A] text-white rounded-lg text-sm font-medium hover:bg-[#D55A40] disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </button>
              </div>
              {formError && (
                <p className="sm:col-span-4 text-sm text-red-600">{formError}</p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab} ({counts[tab]})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Packages</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Points</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Last Visit</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No members found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{m.name}</div>
                      {m.email && <div className="text-xs text-gray-400">{m.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.phone}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {m.packages.total > 0 ? (
                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Package className="h-3.5 w-3.5 text-[#E8654A]" />
                          {m.packages.remaining}/{m.packages.total}
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{m.points_balance}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{formatDate(m.last_visit_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_COLORS[m.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSendLink(m.id)}
                        disabled={sendingLink === m.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#E8654A] bg-[#FFF7ED] rounded-lg hover:bg-[#FEE2D5] transition-colors disabled:opacity-50"
                        title="Send member portal link"
                      >
                        {sendingLink === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Send Link
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
