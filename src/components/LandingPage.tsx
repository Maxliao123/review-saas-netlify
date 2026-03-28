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

function Navbar({ lang, setLang }: { lang: 'en' | 'zh'; setLang: (l: 'en' | 'zh') => void }) {
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
              Reply<span className="text-blue-600">Wise AI</span>
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
            <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Blog
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 px-2 py-1 rounded border border-gray-200 transition-colors"
            >
              {lang === 'en' ? '中文' : 'EN'}
            </button>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {lang === 'zh' ? '登入' : 'Log in'}
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              {lang === 'zh' ? '免費開始' : 'Start Free'}
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
            <Link href="/blog" className="block px-2 py-2 text-sm text-gray-600" onClick={() => setMobileOpen(false)}>
              Blog
            </Link>
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
                className="text-sm font-medium text-gray-500 px-2 py-2 text-left"
              >
                {lang === 'en' ? '切換中文' : 'Switch to EN'}
              </button>
              <Link href="/auth/login" className="text-sm font-medium text-gray-600 px-2 py-2">
                {lang === 'zh' ? '登入' : 'Log in'}
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                {lang === 'zh' ? '免費開始' : 'Start Free'} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ────────────────────────── Hero ────────────────────────── */

function Hero({ lang }: { lang: 'en' | 'zh' }) {
  const t = lang === 'zh' ? {
    badge: 'AI 智慧評論管理',
    title1: '把每一次來店消費變成',
    titleHighlight: '五星 Google 評論',
    sub: '顧客掃描 QR Code，AI 自動生成個人化評論，一鍵發布。監控、回覆、成長 — 全自動運行。',
    ctaPrimary: '免費開始',
    ctaSecondary: '了解運作方式',
  } : {
    badge: 'AI-Powered Review Management',
    title1: 'Turn Every Visit Into a',
    titleHighlight: '5-Star Google Review',
    sub: 'Customers scan your QR code, AI crafts a personalized review, and they post it in one tap. Monitor, reply, and grow your reputation — all on autopilot.',
    ctaPrimary: 'Start Free Today',
    ctaSecondary: 'See How It Works',
  };

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
          {t.badge}
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          {t.title1}{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t.titleHighlight}
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
          {t.sub}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            {t.ctaPrimary}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 transition-all"
          >
            {t.ctaSecondary}
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div>
            <div className="text-3xl font-extrabold text-gray-900">50K+</div>
            <div className="mt-1 text-sm text-gray-500">{lang === 'zh' ? '已產生評論' : 'Reviews Generated'}</div>
          </div>
          <div className="border-x border-gray-200 px-4">
            <div className="text-3xl font-extrabold text-gray-900">4.9</div>
            <div className="mt-1 text-sm text-gray-500">{lang === 'zh' ? '平均評分' : 'Average Rating'}</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-gray-900">500+</div>
            <div className="mt-1 text-sm text-gray-500">{lang === 'zh' ? '服務店家' : 'Businesses Served'}</div>
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

function HowItWorks({ lang }: { lang: 'en' | 'zh' }) {
  const steps = lang === 'zh' ? [
    { step: '01', icon: QrCode, title: '顧客掃描', description: '在你的店內放置 QR Code 或 NFC 標籤，顧客用手機掃描即可 — 不需要下載 App。' },
    { step: '02', icon: Sparkles, title: 'AI 生成評論', description: '顧客選擇他們喜歡的項目，AI 立即產生個人化、真實的 5 星 Google 評論。' },
    { step: '03', icon: TrendingUp, title: '自動成長', description: '評論自動湧入。AI 撰寫回覆、發送提醒、生成每週報告，全程自動化。' },
  ] : STEPS;

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {lang === 'zh' ? '運作方式' : 'How It Works'}
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {lang === 'zh' ? '三個簡單步驟，改變你的 Google 評價' : 'Three simple steps to transform your Google reputation'}
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step) => {
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

function Features({ lang }: { lang: 'en' | 'zh' }) {
  const features = lang === 'zh' ? [
    { icon: Sparkles, title: 'AI 評論生成', description: 'GPT-4 根據顧客真實體驗撰寫個人化、自然的評論。每一則都獨一無二。' },
    { icon: MessageSquare, title: '智慧回覆草稿', description: 'AI 自動為每則 Google 評論撰寫用心的回覆。一鍵核准，或自訂後再發佈。' },
    { icon: BarChart3, title: '分析儀表板', description: '即時追蹤掃描量、評論生成率、評分趨勢和轉換漏斗。' },
    { icon: Bell, title: '多管道通知', description: '新評論一進來就透過 Email、Slack、LINE 或 WhatsApp 通知你 — 尤其是負面評論。' },
    { icon: Globe, title: '支援 6 種語言', description: '支援英文、中文、韓文、日文、法文、西班牙文生成評論。適合國際化門市。' },
    { icon: QrCode, title: 'QR & NFC 就緒', description: '生成自訂 QR Code 和設定 NFC 標籤。追蹤每次掃描的裝置、位置和來源分析。' },
  ] : FEATURES;

  return (
    <section id="features" className="py-20 sm:py-28 bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {lang === 'zh' ? '全方位評論管理工具' : 'Everything You Need to Dominate Reviews'}
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {lang === 'zh' ? 'AI 驅動的聲譽管理平台，為現代企業打造' : 'A complete AI-powered reputation management platform built for modern businesses'}
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
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
      '1 store location',
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
      'Up to 3 store locations',
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

function Pricing({ lang }: { lang: 'en' | 'zh' }) {
  const plans = lang === 'zh' ? [
    { name: 'Free', price: '$0', period: '永久免費', description: '適合體驗試用', features: ['1 個店面', '每月 50 則 AI 評論', '基本掃描分析', 'Email 通知'], cta: '免費開始', href: '/auth/signup', highlighted: false },
    { name: 'Starter', price: '$29', period: '/月', description: '適合成長中的餐廳', features: ['1 個店面', '每月 500 則 AI 評論', '完整分析儀表板', 'Email + Slack 通知', 'AI 回覆草稿', '每週報告'], cta: '免費試用', href: '/auth/signup?plan=starter', highlighted: false },
    { name: 'Pro', price: '$79', period: '/月', description: '適合多店面企業', features: ['最多 3 個店面', '無限 AI 評論', '進階分析與報告', '所有通知管道', '自動發佈 AI 回覆', '優先支援', '自訂 AI 語調'], cta: '免費試用', href: '/auth/signup?plan=pro', highlighted: true },
  ] : PLANS;

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {lang === 'zh' ? '簡單透明的定價' : 'Simple, Transparent Pricing'}
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {lang === 'zh' ? '免費開始，準備好再升級。無隱藏費用，隨時取消。' : 'Start free. Upgrade when you\'re ready. No hidden fees, cancel anytime.'}
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => (
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
                  {lang === 'zh' ? '最受歡迎' : 'MOST POPULAR'}
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
          {lang === 'zh' ? '需要超過 10 個據點？' : 'Need more than 10 locations?'}{' '}
          <a href="mailto:hello@replywiseai.com" className="text-blue-600 font-medium hover:underline">
            {lang === 'zh' ? '聯繫我們取得企業方案' : 'Contact us for Enterprise pricing'}
          </a>
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────── Testimonials ────────────────────────── */

const TESTIMONIALS = [
  {
    quote: 'Our Google reviews went from 50 to over 300 in just two months. The AI-generated reviews sound incredibly natural.',
    name: 'Sarah Chen',
    role: 'Owner',
    business: 'Sakura Ramen House',
  },
  {
    quote: 'The negative review alerts saved us multiple times. We can respond within minutes instead of discovering bad reviews days later.',
    name: 'Michael Torres',
    role: 'General Manager',
    business: 'Coastal Hotel & Spa',
  },
  {
    quote: 'Setup took literally 2 minutes. Print the QR code, put it on the table, and reviews start flowing in. Best ROI of any tool we use.',
    name: 'Dr. Lisa Park',
    role: 'Director',
    business: 'Bright Smile Dental Clinic',
  },
];

function Testimonials({ lang }: { lang: 'en' | 'zh' }) {
  const testimonials = lang === 'zh' ? [
    { quote: '我們的 Google 評論在兩個月內從 50 則增加到超過 300 則。AI 生成的評論聽起來非常自然。', name: 'Sarah Chen', role: '老闆', business: 'Sakura Ramen House' },
    { quote: '負面評論警報救了我們好幾次。我們可以在幾分鐘內回應，而不是幾天後才發現差評。', name: 'Michael Torres', role: '總經理', business: 'Coastal Hotel & Spa' },
    { quote: '設定只花了 2 分鐘。印出 QR Code、放在桌上，評論就開始湧入。我們用過 ROI 最高的工具。', name: 'Dr. Lisa Park', role: '院長', business: 'Bright Smile Dental Clinic' },
  ] : TESTIMONIALS;

  return (
    <section className="py-20 sm:py-28 bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {lang === 'zh' ? '深受商家信賴' : 'Loved by Business Owners'}
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            {lang === 'zh' ? '看看為什麼數百家企業選擇 ReplyWise AI' : 'See why hundreds of businesses trust ReplyWise AI.'}
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                <div className="text-xs text-gray-500">{t.role}, {t.business}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Trust / Social Proof ────────────────────────── */

function TrustSection({ lang }: { lang: 'en' | 'zh' }) {
  return (
    <section className="py-16 bg-gray-50/50 border-y border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-gray-900">{lang === 'zh' ? '資料安全' : 'Secure & Private'}</h3>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '端到端加密，HTTPS 傳輸' : 'End-to-end encryption, HTTPS only'}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-gray-900">{lang === 'zh' ? '5 分鐘啟用' : '5-Min Setup'}</h3>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '連結 Google 商家即可開始' : 'Connect Google Business and go'}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Globe className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-gray-900">{lang === 'zh' ? '支援 6 種語言' : '6 Languages'}</h3>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '用顧客的語言生成評論' : 'Generate reviews in your customers\' language'}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Star className="h-8 w-8 text-blue-600" />
            <h3 className="font-bold text-gray-900">{lang === 'zh' ? 'Google 整合' : 'Google Integrated'}</h3>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '官方 API 直連，即時同步' : 'Official API, real-time sync'}</p>
          </div>
        </div>

        {/* Industry badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />{lang === 'zh' ? '餐廳' : 'Restaurants'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />{lang === 'zh' ? '飯店' : 'Hotels'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />{lang === 'zh' ? '診所' : 'Clinics'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />{lang === 'zh' ? '美容院' : 'Salons'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />{lang === 'zh' ? '汽修廠' : 'Auto Repair'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />{lang === 'zh' ? '健身房' : 'Gyms'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green-500" />{lang === 'zh' ? '零售' : 'Retail'}</span>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Final CTA ────────────────────────── */

function FinalCTA({ lang }: { lang: 'en' | 'zh' }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-16 sm:px-16 sm:py-20 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {lang === 'zh' ? '準備好改變你的 Google 聲譽了嗎？' : 'Ready to Transform Your Google Reputation?'}
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-xl mx-auto">
            {lang === 'zh' ? '加入數百家已經在用 AI 自動產生更多五星評論的企業。' : 'Join hundreds of businesses already using AI to generate more 5-star reviews, automatically.'}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-all"
            >
              {lang === 'zh' ? '免費開始' : 'Start Free Today'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-blue-200">
            {lang === 'zh' ? '無需信用卡。免費方案永久可用。' : 'No credit card required. Free plan available forever.'}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Footer ────────────────────────── */

function Footer({ lang }: { lang: 'en' | 'zh' }) {
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
              <span className="text-base font-bold text-white">ReplyWise AI</span>
            </div>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">
              {lang === 'zh' ? 'AI 驅動的評論管理平台，幫助企業自動提升 Google 聲譽。' : 'AI-powered review management platform that helps businesses grow their Google reputation on autopilot.'}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white">{lang === 'zh' ? '產品' : 'Product'}</h4>
            <ul className="mt-3 space-y-2">
              <li><a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">{lang === 'zh' ? '功能' : 'Features'}</a></li>
              <li><a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">{lang === 'zh' ? '定價' : 'Pricing'}</a></li>
              <li><a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">{lang === 'zh' ? '運作方式' : 'How It Works'}</a></li>
              <li><Link href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">{lang === 'zh' ? '部落格' : 'Blog'}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white">{lang === 'zh' ? '公司' : 'Company'}</h4>
            <ul className="mt-3 space-y-2">
              <li><a href="mailto:hello@replywiseai.com" className="text-sm text-gray-400 hover:text-white transition-colors">{lang === 'zh' ? '聯絡我們' : 'Contact'}</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white">{lang === 'zh' ? '法律' : 'Legal'}</h4>
            <ul className="mt-3 space-y-2">
              <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">{lang === 'zh' ? '隱私政策' : 'Privacy Policy'}</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">{lang === 'zh' ? '服務條款' : 'Terms of Service'}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800">
          <p className="text-sm text-gray-500 text-center">
            &copy; {new Date().getFullYear()} ReplyWise AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────── Main Landing Page ────────────────────────── */

export function LandingPage() {
  const [lang, setLang] = useState<'en' | 'zh'>(() => {
    if (typeof navigator === 'undefined') return 'en';
    return navigator.language?.startsWith('zh') ? 'zh' : 'en';
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ReplyWise AI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'AI-powered Google review management platform. Generate reviews, auto-draft replies, and grow your reputation on autopilot.',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '199',
      priceCurrency: 'USD',
      offerCount: '4',
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
      <Navbar lang={lang} setLang={setLang} />
      <Hero lang={lang} />
      <HowItWorks lang={lang} />
      <Features lang={lang} />
      <Testimonials lang={lang} />
      <TrustSection lang={lang} />
      <Pricing lang={lang} />
      <FinalCTA lang={lang} />
      <Footer lang={lang} />
    </div>
  );
}
