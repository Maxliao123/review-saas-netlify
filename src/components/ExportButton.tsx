'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadCSV } from '@/lib/csv-export';

export interface ExportButtonProps {
  type: 'reviews' | 'scans' | 'analytics';
  storeId?: number;
  dateRange?: { from: string; to: string };
  /** Current tenant plan — used for client-side gate messaging */
  plan?: string;
}

export default function ExportButton({ type, storeId, dateRange, plan }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFreePlan = !plan || plan === 'free';

  const handleExport = async () => {
    if (isFreePlan) return;
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ type });
      if (storeId) params.set('store_id', storeId.toString());
      if (dateRange?.from) params.set('from', dateRange.from);
      if (dateRange?.to) params.set('to', dateRange.to);

      const res = await fetch(`/api/admin/export?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(data.error || `Export failed (${res.status})`);
      }

      const csvContent = await res.text();
      const disposition = res.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || `${type}-export.csv`;

      downloadCSV(filename, csvContent);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isFreePlan) {
    return (
      <a
        href="/pricing"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded border border-gray-200 cursor-pointer hover:text-blue-600 hover:border-blue-200 transition-colors"
        title="Upgrade to export data"
      >
        <Download size={14} />
        Upgrade to Export
      </a>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        title={`Export ${type} as CSV`}
      >
        <Download size={14} className={loading ? 'animate-bounce' : ''} />
        {loading ? 'Exporting...' : 'Export CSV'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
