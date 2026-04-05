import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import VerifyClient from './VerifyClient';

export const metadata = {
  title: 'Check-in — ReplyWise AI',
};

function VerifyLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-[#E8654A]" />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyLoading />}>
      <VerifyClient />
    </Suspense>
  );
}
