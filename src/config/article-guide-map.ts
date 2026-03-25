/**
 * Maps replywiseai.com blog article slugs to their parent Guide ("Boss page").
 *
 * Purpose: Every blog article should funnel authority back to its parent guide
 * via an internal CTA. This is the core of the "semantic cluster → Boss page"
 * strategy from DarkSEOKing's SEO framework.
 *
 * Boss pages:
 *   /tools/roi-calculator                                   — ROI Calculator (functional tool)
 *   /blog/google-review-management-complete-guide            — Core review management guide
 *   /blog/local-seo-google-reviews-ranking-factor            — Local SEO ranking hub
 *   /pricing                                                 — Industry solutions + conversion
 */

export interface GuideInfo {
  slug: string;
  title: string;
  titleZh: string;
  description: string;
  path: string;
  ctaText: string;
  ctaTextZh: string;
}

export const GUIDES: Record<string, GuideInfo> = {
  'roi-calculator': {
    slug: 'roi-calculator',
    title: 'Review Management ROI Calculator',
    titleZh: '評論管理 ROI 計算器',
    description: 'Calculate how much revenue better reviews could bring your business',
    path: '/tools/roi-calculator',
    ctaText: 'Calculate Your Review ROI',
    ctaTextZh: '計算你的評論 ROI',
  },
  'review-management-guide': {
    slug: 'review-management-guide',
    title: 'The Complete Guide to Google Review Management',
    titleZh: 'Google 評論管理完全指南',
    description: 'Everything you need to know about managing Google reviews in 2026',
    path: '/blog/google-review-management-complete-guide',
    ctaText: 'Read the Complete Guide',
    ctaTextZh: '閱讀完整指南',
  },
  'local-seo-hub': {
    slug: 'local-seo-hub',
    title: 'How Reviews Impact Local SEO Rankings',
    titleZh: '評論如何影響本地 SEO 排名',
    description: 'Data-driven analysis of review signals in Google local search',
    path: '/blog/local-seo-google-reviews-ranking-factor',
    ctaText: 'Explore Local SEO Factors',
    ctaTextZh: '探索本地 SEO 因素',
  },
  'industry-solutions': {
    slug: 'industry-solutions',
    title: 'ReplyWise AI Plans & Pricing',
    titleZh: 'ReplyWise AI 方案與定價',
    description: 'Find the right plan for your business size and industry',
    path: '/pricing',
    ctaText: 'View Plans & Pricing',
    ctaTextZh: '查看方案與定價',
  },
};

/**
 * Map of article slug → parent guide (Boss page) slug.
 * Articles not listed here won't show a guide CTA.
 */
const ARTICLE_TO_GUIDE: Record<string, string> = {
  // ── ROI Calculator cluster (P0 core pillar) ───────────────────────────
  // These articles discuss business impact, revenue, ROI → funnel to calculator
  'how-to-get-more-google-reviews-2026': 'roi-calculator',
  'review-management-roi-calculator-guide': 'roi-calculator',
  'review-velocity-impact-local-ranking': 'roi-calculator',
  'customer-feedback-loop-review-strategy': 'roi-calculator',
  'review-management-checklist-new-business': 'roi-calculator',
  'ai-review-management-tools-comparison-2026': 'roi-calculator',

  // ── Review Management Guide cluster ───────────────────────────────────
  // These articles cover review strategies, responses, policies → funnel to core guide
  'google-review-response-templates-guide': 'review-management-guide',
  'negative-google-review-management-guide': 'review-management-guide',
  'fake-google-reviews-detection-removal': 'review-management-guide',
  'google-review-policy-guidelines-2026': 'review-management-guide',
  'qr-code-google-review-collection-guide': 'review-management-guide',
  'ai-generated-review-responses-seo-impact': 'review-management-guide',
  'review-analytics-sentiment-analysis-guide': 'review-management-guide',
  'multi-location-business-review-management': 'review-management-guide',

  // ── Local SEO Hub cluster ─────────────────────────────────────────────
  // These articles cover SEO/GEO technical topics → funnel to ranking factor page
  'local-seo-google-reviews-ranking-factor': 'local-seo-hub',
  'geo-generative-engine-optimization-guide': 'local-seo-hub',
  'google-ai-overview-local-business-seo': 'local-seo-hub',
  'google-business-profile-optimization-2026': 'local-seo-hub',
  'google-maps-ranking-factors-2026': 'local-seo-hub',
  'local-seo-citation-building-guide': 'local-seo-hub',
  'schema-markup-local-business-seo': 'local-seo-hub',
  'voice-search-local-seo-optimization': 'local-seo-hub',

  // ── Industry Solutions cluster ────────────────────────────────────────
  // Industry-specific articles → funnel to pricing/signup
  'restaurant-google-review-strategy': 'industry-solutions',
  'hotel-online-reputation-management': 'industry-solutions',
  'clinic-medical-practice-review-guide': 'industry-solutions',
  'dental-practice-patient-reviews-guide': 'industry-solutions',
  'salon-spa-review-management-strategy': 'industry-solutions',
  'auto-repair-shop-review-management': 'industry-solutions',
  'real-estate-agent-review-strategy': 'industry-solutions',
  'retail-store-google-review-strategy': 'industry-solutions',
};

/**
 * Get the parent guide (Boss page) for a given article slug.
 * Returns null if the article doesn't belong to any guide cluster.
 */
export function getArticleGuide(slug: string): GuideInfo | null {
  const guideSlug = ARTICLE_TO_GUIDE[slug];
  if (!guideSlug) return null;
  return GUIDES[guideSlug] ?? null;
}

/**
 * Get all article slugs that belong to a specific guide cluster.
 */
export function getGuideArticles(guideSlug: string): string[] {
  return Object.entries(ARTICLE_TO_GUIDE)
    .filter(([, g]) => g === guideSlug)
    .map(([slug]) => slug);
}

/**
 * Get the guide slug for a given article slug.
 */
export function getArticleGuideSlug(slug: string): string | null {
  return ARTICLE_TO_GUIDE[slug] ?? null;
}
