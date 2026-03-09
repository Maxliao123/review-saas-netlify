import { getUserTenantContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SentimentDashboard from './SentimentDashboard';

export const dynamic = 'force-dynamic';

export default async function SentimentAnalyticsPage() {
  const ctx = await getUserTenantContext();
  if (!ctx || !ctx.tenant) redirect('/auth/login');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sentiment Analysis</h1>
      <p className="text-gray-500 mb-8">
        AI-powered sentiment insights across all your reviews.
      </p>

      <SentimentDashboard stores={ctx.stores || []} />
    </div>
  );
}
