'use client';

import { useState, useTransition } from 'react';
import {
  Package,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Users,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface CreditPackage {
  id: string;
  store_id: number;
  name: string;
  description: string | null;
  package_type: string;
  total_units: number;
  price: number;
  valid_days: number;
  is_active: boolean;
  member_count: number;
}

interface Store {
  id: number;
  name: string;
  slug: string;
}

const TYPE_LABELS: Record<string, string> = {
  sessions: 'Sessions',
  credits: 'Credits',
  amount: 'Amount ($)',
};

const TYPE_COLORS: Record<string, string> = {
  sessions: 'bg-blue-100 text-blue-700',
  credits: 'bg-purple-100 text-purple-700',
  amount: 'bg-green-100 text-green-700',
};

export default function PackagesClient({
  packages,
  stores,
  tenantId,
}: {
  packages: CreditPackage[];
  stores: Store[];
  tenantId: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setFormError(null);
    setFormSuccess(false);
    startTransition(async () => {
      const body = {
        name: formData.get('name'),
        package_type: formData.get('package_type'),
        total_units: Number(formData.get('total_units')),
        price: Number(formData.get('price')),
        valid_days: Number(formData.get('valid_days')) || 365,
        store_id: Number(formData.get('store_id')),
        tenant_id: tenantId,
      };

      const res = await fetch('/api/admin/credit-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || 'Failed to create package.');
      } else {
        setFormSuccess(true);
        setTimeout(() => {
          setShowForm(false);
          setFormSuccess(false);
          window.location.reload();
        }, 1000);
      }
    });
  }

  async function handleToggle(pkgId: string, currentActive: boolean) {
    setTogglingId(pkgId);
    await fetch('/api/admin/credit-packages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pkgId, is_active: !currentActive }),
    });
    setTogglingId(null);
    window.location.reload();
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
          <p className="mt-1 text-sm text-gray-500">
            {packages.length} package{packages.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8654A] text-white rounded-lg text-sm font-medium hover:bg-[#D55A40] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Package
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New Package</h3>
            <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {formSuccess ? (
            <div className="flex items-center gap-2 text-green-600 py-4">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Package created!</span>
            </div>
          ) : (
            <form action={handleCreate} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                name="name"
                placeholder="Package name *"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <select
                name="package_type"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              >
                <option value="sessions">Sessions</option>
                <option value="credits">Credits</option>
                <option value="amount">Amount</option>
              </select>
              <input
                name="total_units"
                type="number"
                min="1"
                placeholder="Total units *"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Price ($) *"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <input
                name="valid_days"
                type="number"
                min="1"
                placeholder="Valid days (default: 365)"
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
                  Create
                </button>
              </div>
              {formError && (
                <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-600">{formError}</p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Packages Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Units</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Price</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Valid Days</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Members</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No packages created yet</p>
                  </td>
                </tr>
              ) : (
                packages.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      {p.description && <div className="text-xs text-gray-400 mt-0.5">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[p.package_type] || 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABELS[p.package_type] || p.package_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.total_units}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">${Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.valid_days}d</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {p.member_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggle(p.id, p.is_active)}
                        disabled={togglingId === p.id}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        title={p.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {togglingId === p.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : p.is_active ? (
                          <ToggleRight className="h-6 w-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-gray-300" />
                        )}
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
