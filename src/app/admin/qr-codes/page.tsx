import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import QRCodeManager from './QRCodeManager';

export const metadata = {
  title: 'QR Codes — ReplyWise AI',
};

export default async function QRCodesPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/admin/onboarding');

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">QR Codes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Download and print QR codes for your stores. Customers scan to leave a review.
        </p>
      </div>

      <QRCodeManager stores={ctx.stores} />
    </div>
  );
}
