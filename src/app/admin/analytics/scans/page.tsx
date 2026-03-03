import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ScanDashboard from './ScanDashboard';

export const dynamic = 'force-dynamic';

export default async function ScanAnalyticsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan Analytics</h1>
      <p className="text-gray-500 mb-8">
        Track QR code and NFC scan activity across your stores.
      </p>

      <ScanDashboard stores={ctx.stores || []} />
    </div>
  );
}
