'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Sparkles,
  BarChart3,
  MessageSquare,
  Bell,
  Globe,
  QrCode,
  ArrowRight,
  Check,
  Menu,
  X,
  Zap,
  Shield,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

/* ────────────────────────── Navbar ────────────────────────── */

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Star className="h-4 w-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              Reputation<span className="text-blue-600">Monitor</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Start Free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-600"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-3">
            <a href="#features" className="block px-2 py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
              Features
            </a>
            <a href="#how-it-works" className="block px-2 py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
              How It Works
            </a>
            <a href="#pricing" className="block px-2 py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
              Pricing
            </a>
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <Link href="/auth/login" className="text-sm font-medium text-gray-600 px-2 py-2">
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Start Free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ────────────────────────── Hero ────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-white pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-100">
          <Sparkles className="h-3.5 w-3.5" />
          AI-Powered Review Management
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Turn Every Visit Into a{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            5-Star Google Review
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
          Customers scan your QR code, AI crafts a personalized review, and they
          post it in one tap. Monitor, reply, and grow your reputation — all on autopilot.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Start Free Today
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 transition-all"
          >
            See How It Works
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div>
            <div className="text-3xl font-extrabold text-gray-900">50K+</div>
            <div className="mt-1 text-sm text-gray-500">Reviews Generated</div>
          </div>
          <div className="border-x border-gray-200 px-4">
            <div className="text-3xl font-extrabold text-gray-900">4.9</div>
            <div className="mt-1 text-sm text-gray-500">Average Rating</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-gray-900">500+</div>
            <div className="mt-1 text-sm text-gray-500">Businesses Served</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── How It Works ────────────────────────── */

const STEPS = [
  {
    step: '01',
    icon: QrCode,
    title: 'Customer Scans',
    description:
      'Place a QR code or NFC tag at your location. Customers scan it with their phone — no app needed.',
  },
  {
    step: '02',
    icon: Sparkles,
    title: 'AI Generates Review',
    description:
      'They select what they loved, and our AI crafts a personalized, authentic 5-star Google review in seconds.',
  },
  {
    step: '03',
    icon: TrendingUp,
    title: 'You Grow on Autopilot',
    description:
      'Reviews flow in automatically. AI drafts replies, sends alerts, and generates weekly reports for you.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Three simple steps to transform your Google reputation
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="relative rounded-2xl bg-gray-50 p-8 hover:bg-blue-50/50 transition-colors group"
              >
                <div className="text-5xl font-extrabold text-gray-100 group-hover:text-blue-100 transition-colors absolute top-6 right-6">
                  {step.step}
                </div>
                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Features ────────────────────────── */

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Review Generation',
    description:
      'GPT-4 crafts authentic, personalized reviews based on what customers actually experienced. Every review is unique.',
  },
  {
    icon: MessageSquare,
    title: 'Smart Reply Drafts',
    description:
      'AI auto-drafts thoughtful replies to every Google review. Approve with one click, or customize before publishing.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description:
      'Track scan volume, review generation rates, rating trends, and conversion funnels in real-time.',
  },
  {
    icon: Bell,
    title: 'Multi-Channel Alerts',
    description:
      'Get notified via Email, Slack, LINE, or WhatsApp the moment a new review comes in — especially negative ones.',
  },
  {
    icon: Globe,
    title: '6 Languages',
    description:
      'Generate reviews in English, Chinese, Korean, Japanese, French, and Spanish. Perfect for international locations.',
  },
  {
    icon: QrCode,
    title: 'QR & NFC Ready',
    description:
      'Generate custom QR codes and configure NFC tags. Track every scan with device, location, and source analytics.',
  },
];

function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Everything You Need to Dominate Reviews
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            A complete AI-powered reputation management platform built for modern businesses
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 hover:shadow-md hover:ring-blue-100 transition-all"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Pricing ────────────────────────── */

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying it out',
    features: [
      '1 store location',
      '50 AI reviews / month',
      'Basic scan analytics',
      'Email notifications',
    ],
    cta: 'Start Free',
    href: '/auth/signup',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'For growing restaurants',
    features: [
      'Up to 3 store locations',
      '500 AI reviews / month',
      'Full analytics dashboard',
      'Email + Slack notifications',
      'AI reply drafts',
      'Weekly reports',
    ],
    cta: 'Start Free Trial',
    href: '/auth/signup?plan=starter',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/month',
    description: 'For multi-location businesses',
    features: [
      'Up to 10 store locations',
      'Unlimited AI reviews',
      'Advanced analytics & reports',
      'All notification channels',
      'Auto-publish AI replies',
      'Priority support',
      'Custom AI tone & handbook',
    ],
    cta: 'Start Free Trial',
    href: '/auth/signup?plan=pro',
    highlighted: true,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20 ring-2 ring-blue-600 scale-105'
                  : 'bg-white ring-1 ring-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-amber-900">
                  MOST POPULAR
                </div>
              )}

              <h3
                className={`text-lg font-bold ${
                  plan.highlighted ? 'text-white' : 'text-gray-900'
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  plan.highlighted ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span
                  className={`text-sm ${
                    plan.highlighted ? 'text-blue-200' : 'text-gray-500'
                  }`}
                >
                  {plan.period}
                </span>
              </div>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        plan.highlighted ? 'text-blue-200' : 'text-blue-600'
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.highlighted ? 'text-blue-50' : 'text-gray-600'
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-white text-blue-700 hover:bg-blue-50'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          Need more than 10 locations?{' '}
          <a href="mailto:hello@reputationmonitor.ai" className="text-blue-600 font-medium hover:underline">
            Contact us for Enterprise pricing
          </a>
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────── Trust / Social Proof ────────────────────────── */

function TrustSection() {
  return (
    <section className="py-16 bg-gray-50/50 border-y border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3 text-center">
          <div className="flex flex-col items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-gray-900">SOC 2 Compliant</h3>
            <p className="text-sm text-gray-500">Enterprise-grade security for your data</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-gray-900">2-Minute Setup</h3>
            <p className="text-sm text-gray-500">Connect Google Business and start in minutes</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Globe className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-gray-900">6 Languages</h3>
            <p className="text-sm text-gray-500">Generate reviews in your customers&apos; language</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Final CTA ────────────────────────── */

function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-16 sm:px-16 sm:py-20 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to Transform Your Google Reputation?
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-xl mx-auto">
            Join hundreds of businesses already using AI to generate more 5-star reviews, automatically.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-all"
            >
              Start Free Today
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-200">
            No credit card required. Free plan available forever.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Footer ────────────────────────── */

function Footer() {
  return (
    <footer className="bg-gray-900 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                <Star className="h-3.5 w-3.5 text-white fill-white" />
              </div>
              <span className="text-base font-bold text-white">ReputationMonitor</span>
            </div>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">
              AI-powered review management platform that helps businesses grow their Google reputation on autopilot.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white">Product</h4>
            <ul className="mt-3 space-y-2">
              <li><a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="mt-3 space-y-2">
              <li><a href="mailto:hello@reputationmonitor.ai" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white">Legal</h4>
            <ul className="mt-3 space-y-2">
              <li><a href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800">
          <p className="text-sm text-gray-500 text-center">
            &copy; {new Date().getFullYear()} Reputation Monitor. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────── Main Landing Page ────────────────────────── */

export function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Reputation Monitor',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'AI-powered Google review management platform. Generate reviews, auto-draft replies, and grow your reputation on autopilot.',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '79',
      priceCurrency: 'USD',
      offerCount: '3',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '500',
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <TrustSection />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
