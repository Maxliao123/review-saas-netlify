import { Suspense } from 'react';
import { MainFlow } from '@/components/MainFlow';
import { LandingPage } from '@/components/LandingPage';

export const metadata = {
  title: 'ReplyWise AI — 讓每一位客人都成為你的神秘客 | Turn Every Customer Into Your Mystery Shopper',
  description:
    'AI collects real feedback, alerts you to issues instantly, and helps you improve continuously — great reputation follows naturally. Trusted by 500+ businesses.',
  openGraph: {
    title: 'ReplyWise AI — Turn Every Customer Into Your Mystery Shopper',
    description:
      'AI collects real feedback, alerts you to issues instantly, and helps you improve continuously. Trusted by 500+ businesses.',
    type: 'website',
    siteName: 'ReplyWise AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReplyWise AI — Turn Every Customer Into Your Mystery Shopper',
    description:
      'AI collects real feedback, alerts you to issues instantly, and helps you improve continuously.',
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
