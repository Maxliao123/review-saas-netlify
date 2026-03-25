import { Suspense } from 'react';
import { MainFlow } from '@/components/MainFlow';
import { LandingPage } from '@/components/LandingPage';

export const metadata = {
  title: 'ReplyWise AI — AI-Powered Google Review Management',
  description:
    'Turn every customer visit into a 5-star Google review. AI generates reviews, auto-drafts replies, and grows your reputation on autopilot.',
  openGraph: {
    title: 'ReplyWise AI — AI-Powered Google Review Management',
    description:
      'Turn every customer visit into a 5-star Google review with AI. Trusted by 500+ businesses.',
    type: 'website',
    siteName: 'ReplyWise AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReplyWise AI — AI-Powered Review Management',
    description:
      'Turn every customer visit into a 5-star Google review with AI.',
  },
};

/**
 * Root page:
 *  - With ?store=<slug> → customer survey flow (MainFlow)
 *  - Without → SaaS marketing landing page
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; storeid?: string }>;
}) {
  const params = await searchParams;
  const hasStore = params.store || params.storeid;

  if (hasStore) {
    return (
      <Suspense fallback={<div />}>
        <MainFlow />
      </Suspense>
    );
  }

  return <LandingPage />;
}
