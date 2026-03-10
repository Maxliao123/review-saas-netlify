/**
 * Cross-domain CTA configuration for reputationmonitor.ai blog articles.
 *
 * Only articles with a natural content-to-product connection get a cross-domain CTA.
 * This prevents the site from looking like a link farm / PBN to Google.
 *
 * Rules (from DarkSEOKing guidelines):
 * - NOT every article should have a cross-domain link
 * - Each article shows at most 1 cross-domain CTA (not 2)
 * - The link must match user intent (review collection → product, SEO → tool)
 * - Pure informational/educational articles get NO cross-domain CTA
 * - Industry vertical articles may get a soft product mention (not a hard CTA)
 *
 * Current strategy for Reputation Monitor:
 * - Most articles funnel to internal Boss pages (see article-guide-map.ts)
 * - Only a select few articles get a direct product signup CTA
 * - This avoids over-optimization and keeps content feeling editorial
 */

export type CrossDomainCtaType = 'signup' | 'demo' | null;

/**
 * Map of article slugs → which cross-domain CTA to show.
 * - 'signup' → /auth/signup CTA (free trial conversion)
 * - 'demo' → contact/demo request CTA (enterprise leads)
 * - null or absent → no direct product CTA (show Boss page link instead)
 *
 * IMPORTANT: Keep this list SHORT. Per DarkSEOKing rules, only ~20-30% of
 * articles should have a direct product CTA. The rest should use internal
 * Boss page links for a more natural link profile.
 */
export const CROSS_DOMAIN_CTA: Record<string, CrossDomainCtaType> = {
  // ── Direct signup CTA (high purchase intent articles) ──────────────────
  'how-to-get-more-google-reviews-2026': 'signup',
  'qr-code-google-review-collection-guide': 'signup',
  'review-management-checklist-new-business': 'signup',
  'ai-review-management-tools-comparison-2026': 'signup',
  'customer-feedback-loop-review-strategy': 'signup',
  'review-management-roi-calculator-guide': 'signup',

  // ── Demo/enterprise CTA (multi-location / large business articles) ─────
  'multi-location-business-review-management': 'demo',
};

// Total: 7/30 articles get direct CTA (~23%) — within DarkSEOKing's recommended range

/**
 * Get the CTA type for a given article slug.
 * Returns null for articles that should NOT show any direct product CTA.
 */
export function getCrossDomainCta(slug: string): CrossDomainCtaType {
  return CROSS_DOMAIN_CTA[slug] ?? null;
}
