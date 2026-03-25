import type { Metadata } from 'next';
import Link from 'next/link';
import { Star, ArrowRight } from 'lucide-react';
import { ROICalculator } from './ROICalculator';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.replywiseai.com';

export const metadata: Metadata = {
  title: 'Google Review ROI Calculator — See Your Revenue Impact',
  description:
    'Calculate how much revenue you could gain by increasing your Google reviews. Free interactive tool for restaurants, hotels, clinics, and local businesses.',
  openGraph: {
    title: 'Google Review ROI Calculator — ReplyWise AI',
    description:
      'See how more Google reviews translate into real revenue. Free interactive calculator for local businesses.',
    type: 'website',
    siteName: 'ReplyWise AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Google Review ROI Calculator',
    description:
      'Calculate your revenue impact from more Google reviews.',
  },
  alternates: {
    canonical: '/tools/roi-calculator',
  },
};

export default function ROICalculatorPage() {
  // JSON-LD for the tool
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Google Review ROI Calculator',
    description:
      'Calculate how much revenue you could gain by increasing your Google reviews.',
    url: `${BASE_URL}/tools/roi-calculator`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    creator: {
      '@type': 'Organization',
      name: 'ReplyWise AI',
      url: BASE_URL,
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                Reputation<span className="text-blue-600">Monitor</span>
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Blog
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Start Free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-4 text-center bg-gradient-to-b from-blue-50/50 to-white">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Google Review
            <br />
            <span className="text-blue-600">ROI Calculator</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            See exactly how much revenue your business could gain by growing your Google reviews.
            Based on real industry data and research.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ROICalculator />
        </div>
      </section>

      {/* Methodology & SEO content */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-6">
            How We Calculate Your Review ROI
          </h2>

          <div className="space-y-6 text-gray-700 text-[15px] leading-relaxed">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">
                The Review-Revenue Connection
              </h3>
              <p>
                Research consistently shows a direct link between Google reviews and business revenue.
                A study by Harvard Business School found that each additional star rating leads to a
                5-9% increase in revenue. Businesses appearing in the Google Local Pack (top 3 map
                results) receive 44% of all clicks — and review count is the #1 factor for Local
                Pack ranking.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">
                Key Assumptions in Our Model
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Each new Google review contributes to improved local search visibility</li>
                <li>Higher visibility leads to more profile views (we estimate 3-5% increase per 10 reviews)</li>
                <li>Profile-to-visit conversion rates vary by industry (typically 2-8%)</li>
                <li>Average transaction values are industry-specific inputs you provide</li>
                <li>AI-assisted review collection achieves 15-25% scan-to-review conversion (vs. 1-2% traditional methods)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">
                Why More Reviews = More Revenue
              </h3>
              <p>
                Beyond ranking benefits, review volume acts as social proof. Consumers read an average
                of 10 reviews before trusting a local business. Businesses with 50+ reviews are perceived
                as significantly more trustworthy than those with fewer than 10. This trust translates
                directly into higher conversion rates and willingness to pay premium prices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Related Resources */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8">
            Learn More About Review Management
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/blog/google-review-management-complete-guide"
              className="rounded-xl ring-1 ring-gray-200 p-5 text-left hover:shadow-md hover:ring-blue-200 transition-all"
            >
              <h3 className="font-semibold text-gray-900 text-sm">
                The Complete Guide to Google Review Management
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Everything you need to know about managing, responding to, and growing reviews.
              </p>
            </Link>
            <Link
              href="/blog/restaurant-review-strategy-2026"
              className="rounded-xl ring-1 ring-gray-200 p-5 text-left hover:shadow-md hover:ring-blue-200 transition-all"
            >
              <h3 className="font-semibold text-gray-900 text-sm">
                Restaurant Review Strategy: 10 to 500 Reviews
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                A step-by-step playbook for restaurant owners to grow reviews rapidly.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-900 text-center">
        <h2 className="text-2xl font-extrabold text-white">
          Start Growing Your Reviews Today
        </h2>
        <p className="mt-2 text-gray-400">
          See these results in your own business. Free plan available.
        </p>
        <Link
          href="/auth/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-8 py-3 text-base font-semibold text-white hover:from-blue-600 hover:to-indigo-600 transition-all"
        >
          Start Free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
