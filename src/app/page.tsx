import { Suspense } from 'react';
import { MainFlow } from '@/components/MainFlow';
import { LandingPage } from '@/components/LandingPage';

export const metadata = {
  title: 'ReplyWise AI — Turn Every Customer Into Your Mystery Shopper',
  description:
    'Auto-monitor Google reviews, get instant alerts, and let AI handle replies. Plus QR codes to actively collect 5-star reviews. Trusted by 500+ businesses.',
  openGraph: {
    title: 'ReplyWise AI — Turn Every Customer Into Your Mystery Shopper',
    description:
      'Auto-monitor Google reviews, get instant alerts, and let AI handle replies. Plus QR codes to collect 5-star reviews. Trusted by 500+ businesses.',
    type: 'website',
    siteName: 'ReplyWise AI',
    locale: 'en_US',
    alternateLocale: 'zh_TW',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReplyWise AI — Turn Every Customer Into Your Mystery Shopper',
    description:
      'Auto-monitor Google reviews, get instant alerts, and let AI handle replies. Plus QR codes to collect 5-star reviews.',
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

  return (
    <Suspense fallback={<div />}>
      <LandingPage />
    </Suspense>
  );
}
