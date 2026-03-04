import { Suspense } from 'react';
import { getAuthUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingWizard from './OnboardingWizard';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect('/auth/login');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
        <OnboardingWizard userId={user.id} userEmail={user.email || ''} />
      </Suspense>
    </div>
  );
}
