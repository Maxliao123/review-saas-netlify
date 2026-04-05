'use client';

import { useState, useTransition } from 'react';
import {
  Scissors,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Zap,
} from 'lucide-react';

interface Service {
  id: string;
  store_id: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  credits_required: number;
  category: string | null;
  is_active: boolean;
}

interface Store {
  id: number;
  name: string;
  slug: string;
}

export default function ServicesClient({
  services,
  stores,
  tenantId,
}: {
  services: Service[];
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
        duration_minutes: Number(formData.get('duration_minutes')) || 60,
        price: Number(formData.get('price')) || 0,
        credits_required: Number(formData.get('credits_required')) || 1,
        category: formData.get('category') || null,
        store_id: Number(formData.get('store_id')),
        tenant_id: tenantId,
      };

      const res = await fetch('/api/admin/services-mgmt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || 'Failed to create service.');
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

  async function handleToggle(serviceId: string, currentActive: boolean) {
    setTogglingId(serviceId);
    await fetch('/api/admin/services-mgmt', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: serviceId, is_active: !currentActive }),
    });
    setTogglingId(null);
    window.location.reload();
  }

  // Group by category
  const categories = Array.from(new Set(services.map((s) => s.category || 'Uncategorized')));

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="mt-1 text-sm text-gray-500">
            {services.length} service{services.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8654A] text-white rounded-lg text-sm font-medium hover:bg-[#D55A40] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New Service</h3>
            <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {formSuccess ? (
            <div className="flex items-center gap-2 text-green-600 py-4">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Service created!</span>
            </div>
          ) : (
            <form action={handleCreate} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                name="name"
                placeholder="Service name *"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <input
                name="duration_minutes"
                type="number"
                min="5"
                step="5"
                placeholder="Duration (minutes) *"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Price ($)"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <input
                name="credits_required"
                type="number"
                min="0"
                placeholder="Credits required (default: 1)"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E8654A]/20 focus:border-[#E8654A]"
              />
              <input
                name="category"
                placeholder="Category (e.g. Massage, Facial)"
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
                <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-600">{formError}</p>
              )}
            </form>
          )}
        </div>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Duration</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Price</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Credits</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No services created yet</p>
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.name}</div>
                      {s.description && <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {s.duration_minutes}min
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {s.price ? (
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                          {Number(s.price).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Zap className="h-3.5 w-3.5 text-[#E8654A]" />
                        {s.credits_required}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {s.category ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {s.category}
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggle(s.id, s.is_active)}
                        disabled={togglingId === s.id}
                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        title={s.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {togglingId === s.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : s.is_active ? (
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
