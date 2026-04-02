import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Check,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Headphones,
} from 'lucide-react';
import UpgradeButton from './UpgradeButton';

export const metadata: Metadata = {
  title: 'Pricing — AI-Powered Google Review Management Plans',
  description:
    'Simple, transparent pricing for AI-powered Google review management. Free plan with 50 AI reviews/month. Starter $29/mo. Pro $79/mo. No credit card required.',
  openGraph: {
    title: 'Pricing — ReplyWise AI',
    description:
      'Start free with 50 AI reviews/month. Upgrade to Starter ($29/mo) or Pro ($79/mo) as you grow.',
    type: 'website',
    siteName: 'ReplyWise AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReplyWise AI Pricing',
    description:
      'Start free. Upgrade as you grow. AI-powered Google review management plans.',
  },
  alternates: {
    canonical: '/pricing',
  },
};

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying it out',
    features: [
      '1 store location',
      '50 AI-generated reviews / month',
      'QR code review collection',
      'Basic scan analytics',
      'Email notifications',
      'Community support',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'For growing businesses',
    features: [
      'Up to 3 store locations',
      '500 AI-generated reviews / month',
      'Review monitoring & alerts',
      'AI reply draft generation',
      'Sentiment analysis & insights',
      'Email + Slack notifications',
      'Weekly performance reports',
      'Google Business sync',
    ],
    cta: 'Start 14-Day Free Trial',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$79',
    period: '/month',
    description: 'For serious reputation growth',
    features: [
      'Up to 10 store locations',
      'Unlimited AI-generated reviews',
      'Google Maps analytics dashboard',
      'Competitor tracking & comparison',
      'Auto-publish AI replies to Google',
      'All notifications (Email, Slack, LINE, WhatsApp)',
      'Custom AI tone & handbook',
      'White-label branding',
      'Team roles (owner, manager, staff)',
    ],
    cta: 'Start 14-Day Free Trial',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    description: 'For chains & franchises',
    features: [
      'Unlimited store locations',
      'Unlimited AI-generated reviews',
      'Everything in Pro',
      'API access & webhooks',
      'SSO / SAML authentication',
      'Dedicated account manager',
      'Priority support & SLA',
      'Custom AI model training',
    ],
    cta: 'Start 14-Day Free Trial',
    highlighted: false,
  },
];

const FAQ = [
  {
    q: 'Can I change plans anytime?',
    a: 'Yes. Upgrade or downgrade at any time. Changes take effect immediately, and we prorate billing automatically.',
  },
  {
    q: 'What counts as an "AI-generated review"?',
    a: 'Each time a customer uses your QR/NFC link and generates a review through the AI, it counts as one. Regenerating the same review does not count again.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: 'No. The Free plan requires no credit card. Paid plans include a 14-day free trial before billing begins.',
  },
  {
    q: 'What happens when I reach my review limit?',
    a: 'Customers can still visit your review page, but AI generation will be paused until the next billing cycle. You can upgrade anytime to increase your limit.',
  },
  {
    q: 'Can I use this for non-restaurant businesses?',
    a: 'Absolutely. While we started with restaurants, ReplyWise AI works for any business with a Google Business listing — clinics, hotels, salons, auto shops, and more.',
  },
];

// Detect auth state server-side (optional — graceful if not logged in)
async function getAuthContext() {
  try {
    const { getUserTenantContext } = await import('@/lib/supabase/server');
    const ctx = await getUserTenantContext();
    return ctx?.tenant ? { isAuthenticated: true, currentPlan: ctx.tenant.plan || 'free' } : null;
  } catch {
    return null;
  }
}

export default async function PricingPage() {
  const auth = await getAuthContext();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8654A] to-[#FFBF00]">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                Reputation<span className="text-[#E8654A]">Monitor</span>
              </span>
            </Link>
            <div className="flex items-center gap-4">
              {auth ? (
                <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                    Log in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8654A] to-[#FFBF00] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Start Free <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-4 sm:pt-24 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
          Start free with no credit card. Upgrade as your business grows. Cancel anytime.
        </p>
      </section>

      {/* Plans */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-4 md:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-b from-[#E8654A] to-[#C94D35] text-white shadow-xl shadow-[#E8654A]/20 ring-2 ring-[#E8654A] lg:scale-105'
                    : 'bg-white ring-1 ring-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-amber-900">
                    MOST POPULAR
                  </div>
                )}

                <div>
                  <h3 className={`text-lg font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-1 text-sm ${plan.highlighted ? 'text-[#F09A88]' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.period && (
                    <span className={`text-sm ${plan.highlighted ? 'text-[#F09A88]' : 'text-gray-500'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="mt-8 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className={`h-4 w-4 mt-0.5 shrink-0 ${
                          plan.highlighted ? 'text-[#F09A88]' : 'text-[#E8654A]'
                        }`}
                      />
                      <span className={`text-sm ${plan.highlighted ? 'text-[#FEE2D5]' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <UpgradeButton
                  planId={plan.id}
                  label={plan.cta}
                  highlighted={plan.highlighted}
                  isAuthenticated={!!auth}
                  currentPlan={auth?.currentPlan || null}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="py-16 bg-[#FDF6EC] border-y border-gray-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-12">
            Why Businesses Choose ReplyWise AI
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#E8654A]">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900">10x More Reviews</h3>
              <p className="mt-2 text-sm text-gray-600">
                Businesses see an average 10x increase in Google reviews within the first 30 days.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#E8654A]">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900">100% Authentic</h3>
              <p className="mt-2 text-sm text-gray-600">
                Every review is written by AI based on real customer experiences and posted by real customers.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF7ED] text-[#E8654A]">
                <Headphones className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900">Save 10+ Hours/Week</h3>
              <p className="mt-2 text-sm text-gray-600">
                Automated replies, reports, and alerts mean you spend less time managing reviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="border-b border-gray-100 pb-6">
                <h3 className="text-base font-semibold text-gray-900">{q}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-gray-900 text-center">
        <h2 className="text-2xl font-extrabold text-white">Ready to get started?</h2>
        <p className="mt-2 text-gray-400">Start free today. No credit card required.</p>
        <Link
          href="/auth/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8654A] to-[#FFBF00] px-8 py-3 text-base font-semibold text-white hover:from-[#C94D35] hover:to-[#E8654A] transition-all"
        >
          Start Free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
