'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { detectBrowserLocale } from '@/lib/locale-utils';
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
  Reply,
  Target,
  MapPin,
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8654A] to-[#FFBF00]">
              <Star className="h-4 w-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-[#3D3D3D]">
              Reply<span className="text-[#E8654A]">Wise AI</span>
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
              onClick={() => {
                const newLang = lang === 'en' ? 'zh' : 'en';
                setLang(newLang);
                localStorage.setItem('preferredLang', newLang);
              }}
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8654A] to-[#FFBF00] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-[#C94D35] hover:to-[#E8654A] transition-all"
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
                onClick={() => {
                  const newLang = lang === 'en' ? 'zh' : 'en';
                  setLang(newLang);
                  localStorage.setItem('preferredLang', newLang);
                }}
                className="text-sm font-medium text-gray-500 px-2 py-2 text-left"
              >
                {lang === 'en' ? '切換中文' : 'Switch to EN'}
              </button>
              <Link href="/auth/login" className="text-sm font-medium text-gray-600 px-2 py-2">
                {lang === 'zh' ? '登入' : 'Log in'}
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8654A] to-[#FFBF00] px-4 py-2.5 text-sm font-semibold text-white"
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
    badge: 'AI 智慧經營助手',
    title1: '讓每一位客人都成為',
    titleHighlight: '你的神秘客',
    sub: '自動監控 Google 評論、AI 即時回覆差評、QR Code 收集好評——讓好口碑自然發生。',
    ctaPrimary: '免費開始',
    ctaSecondary: '了解運作方式',
  } : {
    badge: 'AI-Powered Business Intelligence',
    title1: 'Turn Every Customer Into',
    titleHighlight: 'Your Mystery Shopper',
    sub: 'Auto-monitor Google reviews, AI responds to bad reviews instantly, QR codes collect good ones — great reputation follows naturally.',
    ctaPrimary: 'Start Free Today',
    ctaSecondary: 'See How It Works',
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF7ED]/50 via-[#FDF6EC] to-white pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#FEE2D5]/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#FFBF00]/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FFF7ED] px-4 py-1.5 text-sm font-medium text-[#E8654A] ring-1 ring-[#FEE2D5]">
          <Sparkles className="h-3.5 w-3.5" />
          {t.badge}
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          {t.title1}{' '}
          <span className="bg-gradient-to-r from-[#E8654A] to-[#FFBF00] bg-clip-text text-transparent">
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
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8654A] to-[#FFBF00] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#E8654A]/25 hover:shadow-[#E8654A]/40 hover:from-[#C94D35] hover:to-[#E8654A] transition-all"
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
            <div className="mt-1 text-sm text-gray-500">{lang === 'zh' ? '已收集回饋' : 'Feedback Collected'}</div>
          </div>
          <div className="border-x border-gray-200 px-4">
            <div className="text-3xl font-extrabold text-gray-900">4.9</div>
            <div className="mt-1 text-sm text-gray-500">{lang === 'zh' ? '平均提升評分' : 'Avg Rating Improvement'}</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-gray-900">500+</div>
            <div className="mt-1 text-sm text-gray-500">{lang === 'zh' ? '合作店家' : 'Businesses Trust Us'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── How It Works ────────────────────────── */

const FLOW_A_EN = [
  { step: '01', icon: Globe, title: 'Connect Google Business', description: 'Link your Google Business Profile in 30 seconds. This enables review monitoring and AI reply.' },
  { step: '02', icon: Bell, title: 'Get Notified Instantly', description: 'New review comes in? You get an alert within minutes — via Email, LINE, Slack, or WhatsApp.' },
  { step: '03', icon: Sparkles, title: 'AI Drafts the Perfect Reply', description: 'AI reads the review, understands the context, and drafts a professional reply — positive or negative.' },
  { step: '04', icon: Reply, title: 'One-Click Publish', description: 'Review the AI draft, tweak if you want, and publish directly to Google with one click.' },
];

const FLOW_B_EN = [
  { step: '01', icon: QrCode, title: 'Download QR Code', description: 'Print the QR code and place it at your counter, tables, or receipts — customers scan to start.' },
  { step: '02', icon: Sparkles, title: 'Customer Scans & Selects Feelings', description: 'Customers choose tags that reflect their genuine experience — what they loved and what could be better.' },
  { step: '03', icon: MessageSquare, title: 'AI Helps Express', description: 'AI helps customers articulate their experience into a well-written, authentic review they can post with one tap.' },
  { step: '04', icon: TrendingUp, title: 'Real Review Goes Live', description: 'Genuine reviews go live on Google. Your rating climbs naturally with authentic 5-star reviews.' },
];

const FLOW_A_ZH = [
  { step: '01', icon: Globe, title: '連接 Google 商家', description: '30 秒連結你的 Google 商家檔案，即可啟用評論監控與 AI 回覆。' },
  { step: '02', icon: Bell, title: '新評論即時通知', description: '有新評論？幾分鐘內收到通知 — 支援 Email、LINE、Slack、WhatsApp。' },
  { step: '03', icon: Sparkles, title: 'AI 自動擬稿回覆', description: 'AI 閱讀評論、理解情境，自動撰寫專業回覆 — 無論好評或差評。' },
  { step: '04', icon: Reply, title: '一鍵發布', description: '檢視 AI 草稿、自由修改，一鍵直接發布到 Google。' },
];

const FLOW_B_ZH = [
  { step: '01', icon: QrCode, title: '下載 QR Code', description: '印出 QR Code 放在櫃台、桌面或收據上，客人掃碼即可開始。' },
  { step: '02', icon: Sparkles, title: '客人掃碼選感受', description: '客人選擇最能反映真實體驗的標籤 — 喜歡什麼、哪裡可以更好。' },
  { step: '03', icon: MessageSquare, title: 'AI 幫助表達', description: 'AI 幫助客人將體驗轉化為一則寫得好的、真實的評論，一鍵即可發布。' },
  { step: '04', icon: TrendingUp, title: '真實好評上線', description: '真實評論在 Google 上線，你的評分自然提升。' },
];

function HowItWorksFlow({ steps, flowTitle, flowBadge }: { steps: typeof FLOW_A_EN; flowTitle: string; flowBadge: string }) {
  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-8">
        <span className="inline-flex items-center rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-bold text-[#E8654A] ring-1 ring-[#FEE2D5]">
          {flowBadge}
        </span>
        <h3 className="text-xl font-bold text-gray-900">{flowTitle}</h3>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.step}
              className="relative rounded-2xl bg-[#FDF6EC] p-8 hover:bg-[#FFF7ED] transition-colors group"
            >
              <div className="text-5xl font-extrabold text-gray-100 group-hover:text-[#FEE2D5] transition-colors absolute top-6 right-6">
                {step.step}
              </div>
              <div className="relative">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8654A] to-[#FFBF00] text-white">
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
  );
}

function HowItWorks({ lang }: { lang: 'en' | 'zh' }) {
  const flowA = lang === 'zh' ? FLOW_A_ZH : FLOW_A_EN;
  const flowB = lang === 'zh' ? FLOW_B_ZH : FLOW_B_EN;
  const flowATitle = lang === 'zh' ? '自動守護你的聲譽' : 'Auto-Protect Your Reputation';
  const flowBTitle = lang === 'zh' ? '主動收集好評' : 'Actively Collect Good Reviews';

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {lang === 'zh' ? '運作方式' : 'How It Works'}
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {lang === 'zh' ? '兩大流程，全方位守護並提升你的線上聲譽' : 'Two powerful flows to protect and grow your online reputation'}
          </p>
        </div>

        <HowItWorksFlow steps={flowA} flowTitle={flowATitle} flowBadge={lang === 'zh' ? '核心功能' : 'PRIMARY'} />
        <HowItWorksFlow steps={flowB} flowTitle={flowBTitle} flowBadge={lang === 'zh' ? '進階功能' : 'SECONDARY'} />
      </div>
    </section>
  );
}

/* ────────────────────────── Features ────────────────────────── */

const FEATURES = [
  {
    icon: Bell,
    title: 'Instant Issue Alerts',
    description:
      'Unhappy customer? Get notified in 2 minutes. Discover and fix issues the same day, before they become bad reviews.',
  },
  {
    icon: Reply,
    title: 'Smart Reply Management',
    description:
      'AI drafts replies for every review — thank positive ones, address negative ones. Show customers you care, on autopilot.',
  },
  {
    icon: MessageSquare,
    title: 'Collect Real Feedback',
    description:
      'Customers scan, share their experience in 30 seconds — more natural than surveys, more frequent than mystery shoppers.',
  },
  {
    icon: BarChart3,
    title: 'AI Insight Analytics',
    description:
      'AI analyzes hundreds of reviews to surface key issues: slow service? taste changed? cleanliness? See it all at a glance.',
  },
  {
    icon: Target,
    title: 'Competitor Intelligence',
    description:
      'Track competitor review trends, understand what customers care about, find your competitive edge.',
  },
  {
    icon: MapPin,
    title: 'Google Maps Analytics',
    description:
      'Track direction requests, phone calls, website clicks — make data-driven business decisions.',
  },
];

function Features({ lang }: { lang: 'en' | 'zh' }) {
  const features = lang === 'zh' ? [
    { icon: Bell, title: '即時問題警報', description: '客人不滿意？2 分鐘內收到通知。當天發現、當天改善，不讓小問題變成差評。' },
    { icon: Reply, title: '智慧回覆管理', description: 'AI 幫你回覆每一則評論，展現你對客人的重視。好評感謝、差評化解，全自動。' },
    { icon: MessageSquare, title: '收集真實回饋', description: '客人掃碼 30 秒分享真實體驗，比問卷更自然，比神秘客更頻繁。' },
    { icon: BarChart3, title: 'AI 洞察分析', description: '從上百則回饋中自動找出關鍵問題：服務太慢？味道變了？環境不夠乾淨？一目瞭然。' },
    { icon: Target, title: '競爭對手洞察', description: '了解同業的評論趨勢、客人在意什麼，找到你的差異化優勢。' },
    { icon: MapPin, title: 'Google Maps 營運報告', description: '追蹤路線搜尋、電話撥打、網站點擊等關鍵指標，用數據驅動經營決策。' },
  ] : FEATURES;

  return (
    <section id="features" className="py-20 sm:py-28 bg-[#FDF6EC]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {lang === 'zh' ? '你的 AI 經營智囊團' : 'Your AI-Powered Business Intelligence'}
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {lang === 'zh' ? '從收集回饋到洞察分析，全方位幫你持續改善經營' : 'From collecting feedback to actionable insights — continuously improve your business'}
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 hover:shadow-md hover:ring-[#FEE2D5] transition-all"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#E8654A]">
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
                  ? 'bg-gradient-to-b from-[#E8654A] to-[#C94D35] text-white shadow-xl shadow-[#E8654A]/20 ring-2 ring-[#E8654A] scale-105'
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
                  plan.highlighted ? 'text-[#F09A88]' : 'text-gray-500'
                }`}
              >
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span
                  className={`text-sm ${
                    plan.highlighted ? 'text-[#F09A88]' : 'text-gray-500'
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
                        plan.highlighted ? 'text-[#F09A88]' : 'text-[#E8654A]'
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.highlighted ? 'text-[#FEE2D5]' : 'text-gray-600'
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
                    ? 'bg-white text-[#E8654A] hover:bg-[#FFF7ED]'
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
          <a href="mailto:hello@replywiseai.com" className="text-[#E8654A] font-medium hover:underline">
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
    <section className="py-20 sm:py-28 bg-[#FDF6EC]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-[#3D3D3D] sm:text-4xl">
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

/* ────────────────────────── Mystery Shopper Comparison ────────────────────────── */

function ComparisonSection({ lang }: { lang: 'en' | 'zh' }) {
  const t = lang === 'zh' ? {
    heading: '為什麼傳統神秘客花費太高？',
    sub: '比較傳統神秘客服務與 ReplyWise AI 的差異',
    col1: '傳統神秘客',
    col2: 'ReplyWise AI',
    costLabel: '每月成本',
    cost1: '$3,000–5,000',
    cost2: '$29 起',
    freqLabel: '回饋頻率',
    freq1: '每月 1–2 次',
    freq2: '每天',
    volLabel: '回饋數量',
    vol1: '1–2 份報告',
    vol2: '數十則真實回饋',
    speedLabel: '回饋速度',
    speed1: '2–4 週',
    speed2: '即時',
    replyLabel: '差評回覆速度',
    reply1: '數小時至數天',
    reply2: 'AI 即時擬稿',
  } : {
    heading: 'Why Mystery Shoppers Cost Too Much',
    sub: 'See how ReplyWise AI compares to traditional mystery shopping services',
    col1: 'Traditional Mystery Shoppers',
    col2: 'ReplyWise AI',
    costLabel: 'Monthly Cost',
    cost1: '$3,000–5,000',
    cost2: 'From $29',
    freqLabel: 'Feedback Frequency',
    freq1: '1–2 times / month',
    freq2: 'Every day',
    volLabel: 'Feedback Volume',
    vol1: '1–2 reports',
    vol2: 'Dozens of real reviews',
    speedLabel: 'Feedback Speed',
    speed1: '2–4 weeks',
    speed2: 'Real-time',
    replyLabel: 'Bad Review Response',
    reply1: 'Hours to days',
    reply2: 'AI drafts instantly',
  };

  const rows = [
    { label: t.costLabel, old: t.cost1, new_: t.cost2 },
    { label: t.freqLabel, old: t.freq1, new_: t.freq2 },
    { label: t.volLabel, old: t.vol1, new_: t.vol2 },
    { label: t.speedLabel, old: t.speed1, new_: t.speed2 },
    { label: t.replyLabel, old: t.reply1, new_: t.reply2 },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {t.heading}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t.sub}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl ring-1 ring-gray-200">
          {/* Header */}
          <div className="grid grid-cols-3 bg-gray-50 text-sm font-semibold text-gray-500">
            <div className="px-6 py-4" />
            <div className="px-6 py-4 text-center">{t.col1}</div>
            <div className="px-6 py-4 text-center bg-[#FFF7ED] text-[#E8654A]">{t.col2}</div>
          </div>
          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 text-sm ${i < rows.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="px-6 py-4 font-medium text-gray-700">{row.label}</div>
              <div className="px-6 py-4 text-center text-gray-500">{row.old}</div>
              <div className="px-6 py-4 text-center bg-[#FFF7ED]/50 font-semibold text-[#E8654A]">{row.new_}</div>
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
    <section className="py-16 bg-[#FDF6EC]/50 border-y border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <Shield className="h-8 w-8 text-[#E8654A]" />
            <h3 className="font-bold text-gray-900">{lang === 'zh' ? '資料安全' : 'Secure & Private'}</h3>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '端到端加密，HTTPS 傳輸' : 'End-to-end encryption, HTTPS only'}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap className="h-8 w-8 text-[#E8654A]" />
            <h3 className="font-bold text-gray-900">{lang === 'zh' ? '5 分鐘啟用' : '5-Min Setup'}</h3>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '連結 Google 商家即可開始' : 'Connect Google Business and go'}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Globe className="h-8 w-8 text-[#E8654A]" />
            <h3 className="font-bold text-gray-900">{lang === 'zh' ? '支援 6 種語言' : '6 Languages'}</h3>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '用顧客的語言生成評論' : 'Generate reviews in your customers\' language'}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Star className="h-8 w-8 text-[#E8654A]" />
            <h3 className="font-bold text-gray-900">{lang === 'zh' ? 'Google 整合' : 'Google Integrated'}</h3>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '官方 API 直連，即時同步' : 'Official API, real-time sync'}</p>
          </div>
        </div>

        {/* Industry badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#2D6A4F]" />{lang === 'zh' ? '餐廳' : 'Restaurants'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#2D6A4F]" />{lang === 'zh' ? '飯店' : 'Hotels'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#2D6A4F]" />{lang === 'zh' ? '診所' : 'Clinics'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#2D6A4F]" />{lang === 'zh' ? '美容院' : 'Salons'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#2D6A4F]" />{lang === 'zh' ? '汽修廠' : 'Auto Repair'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#2D6A4F]" />{lang === 'zh' ? '健身房' : 'Gyms'}</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#2D6A4F]" />{lang === 'zh' ? '零售' : 'Retail'}</span>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Case Study / Before-After ────────────────────────── */

function CaseStudy({ lang }: { lang: 'en' | 'zh' }) {
  const t = lang === 'zh' ? {
    heading: '真實案例：90 天見證轉變',
    sub: '一家溫哥華拉麵店使用 ReplyWise AI 後的真實數據',
    before: '使用前',
    after: '90 天後',
    metric1: ['Google 評論數', '47', '156'],
    metric2: ['平均評分', '4.2', '4.8'],
    metric3: ['差評回覆率', '15%', '100%'],
    metric4: ['每月新客人', '~120', '~280'],
    quote: '"以前差評都不知道怎麼回，現在 AI 幫我 3 分鐘搞定。客人真的感受到我們在意。"',
    attribution: '溫哥華拉麵店老闆',
  } : {
    heading: 'Real Results: 90-Day Transformation',
    sub: 'Actual data from a Vancouver ramen restaurant using ReplyWise AI',
    before: 'Before',
    after: 'After 90 Days',
    metric1: ['Google Reviews', '47', '156'],
    metric2: ['Average Rating', '4.2', '4.8'],
    metric3: ['Negative Reply Rate', '15%', '100%'],
    metric4: ['Monthly New Customers', '~120', '~280'],
    quote: '"We used to ignore bad reviews because we didn\'t know how to respond. Now AI handles it in 3 minutes. Customers actually feel heard."',
    attribution: 'Vancouver Restaurant Owner',
  };

  const metrics = [t.metric1, t.metric2, t.metric3, t.metric4];

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-[#3D3D3D] sm:text-4xl">
            {t.heading}
          </h2>
          <p className="mt-4 text-lg text-gray-500">{t.sub}</p>
        </div>

        {/* Before / After table */}
        <div className="rounded-2xl overflow-hidden ring-1 ring-gray-200">
          <div className="grid grid-cols-3">
            <div className="bg-gray-50 px-6 py-4 font-semibold text-gray-500 text-sm" />
            <div className="bg-gray-100 px-6 py-4 text-center font-semibold text-gray-500 text-sm">{t.before}</div>
            <div className="bg-[#FFF7ED] px-6 py-4 text-center font-semibold text-[#E8654A] text-sm">{t.after}</div>
          </div>
          {metrics.map(([label, before, after], i) => (
            <div key={i} className={`grid grid-cols-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              <div className="px-6 py-4 text-sm font-medium text-gray-700">{label}</div>
              <div className="px-6 py-4 text-center text-sm text-gray-500">{before}</div>
              <div className="px-6 py-4 text-center text-sm font-bold text-[#E8654A]">{after}</div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="mt-10 rounded-2xl bg-[#FFF7ED] p-8 text-center">
          <p className="text-gray-700 italic leading-relaxed">{t.quote}</p>
          <p className="mt-3 text-sm font-semibold text-[#E8654A]">— {t.attribution}</p>
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
        <div className="rounded-3xl bg-gradient-to-r from-[#E8654A] to-[#C94D35] px-8 py-16 sm:px-16 sm:py-20 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {lang === 'zh' ? '準備好讓每位客人都成為你的神秘客了嗎？' : 'Ready to Turn Every Customer Into Your Mystery Shopper?'}
          </h2>
          <p className="mt-4 text-lg text-[#FEE2D5] max-w-xl mx-auto">
            {lang === 'zh' ? '加入數百家已經在用 AI 收集真實回饋、持續改善經營的企業。' : 'Join hundreds of businesses already using AI to collect real feedback and improve continuously.'}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-[#E8654A] shadow-lg hover:bg-[#FFF7ED] transition-all"
            >
              {lang === 'zh' ? '免費開始' : 'Start Free Today'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-[#F09A88]">
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
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8654A] to-[#FFBF00]">
                <Star className="h-3.5 w-3.5 text-white fill-white" />
              </div>
              <span className="text-base font-bold text-white">ReplyWise AI</span>
            </div>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">
              {lang === 'zh' ? 'AI 智慧經營助手，讓每位客人都成為你的神秘客，幫你持續改善、建立好口碑。' : 'AI-powered business intelligence that turns every customer into your mystery shopper — collect real feedback and grow your reputation naturally.'}
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
  const searchParams = useSearchParams();

  const [lang, setLang] = useState<'en' | 'zh'>(() => {
    // 1. URL param takes priority
    const urlLang = searchParams.get('lang');
    if (urlLang === 'zh' || urlLang === 'en') return urlLang;

    // 2. localStorage preference (set when user toggles language)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('preferredLang');
      if (stored === 'zh' || stored === 'en') return stored;
    }

    // 3. Browser locale detection
    const detected = detectBrowserLocale();
    if (detected === 'zh') return 'zh';

    // 4. Default to English (SaaS targets North American businesses)
    return 'en';
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ReplyWise AI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'AI-powered business intelligence platform. Turn every customer into your mystery shopper — collect real feedback, get instant alerts, and improve continuously.',
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
    <div className="min-h-screen bg-[#FDF6EC]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar lang={lang} setLang={setLang} />
      <Hero lang={lang} />
      <HowItWorks lang={lang} />
      <Features lang={lang} />
      <Testimonials lang={lang} />
      <ComparisonSection lang={lang} />
      <TrustSection lang={lang} />
      <Pricing lang={lang} />
      <CaseStudy lang={lang} />
      <FinalCTA lang={lang} />
      <Footer lang={lang} />
    </div>
  );
}
