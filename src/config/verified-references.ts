/**
 * Verified References Pool for SEO Articles
 *
 * Per DarkSEOKing guidelines, AI-generated articles should use VERIFIED external
 * references instead of hallucinated URLs. This pool contains real, validated
 * sources organized by topic category.
 *
 * Usage in generate-articles.ts:
 *   import { selectVerifiedReferences } from '@/config/verified-references';
 *   const refs = selectVerifiedReferences(keyword, 6);
 *
 * Maintenance:
 *   - Verify URLs quarterly (check for 404s)
 *   - Add new authoritative sources as discovered
 *   - Remove deprecated/moved resources
 */

export interface VerifiedReference {
  url: string;
  title: string;
  publisher: string;
  category: string;
}

// ── Reference Pool ──────────────────────────────────────────────────────────

export const VERIFIED_REFERENCES: VerifiedReference[] = [
  // ── Google Official ────────────────────────────────────────────────────
  {
    url: 'https://support.google.com/business/answer/3474122',
    title: 'Google Business Profile Help: Reviews',
    publisher: 'Google',
    category: 'google-official',
  },
  {
    url: 'https://support.google.com/business/answer/7091',
    title: 'Google Business Profile: Edit Your Profile',
    publisher: 'Google',
    category: 'google-official',
  },
  {
    url: 'https://developers.google.com/search/docs/appearance/structured-data/local-business',
    title: 'Local Business Structured Data',
    publisher: 'Google Developers',
    category: 'google-official',
  },
  {
    url: 'https://developers.google.com/search/docs/appearance/structured-data/review-snippet',
    title: 'Review Snippet Structured Data',
    publisher: 'Google Developers',
    category: 'google-official',
  },
  {
    url: 'https://support.google.com/business/answer/2721884',
    title: 'Google Reviews Policy',
    publisher: 'Google',
    category: 'google-official',
  },
  {
    url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    title: 'Creating Helpful, Reliable, People-First Content',
    publisher: 'Google Search Central',
    category: 'google-official',
  },
  {
    url: 'https://blog.google/products/maps/google-maps-101-how-ai-helps-predict-traffic-and-determine-routes/',
    title: 'Google Maps 101: AI and Traffic',
    publisher: 'Google Blog',
    category: 'google-official',
  },

  // ── SEO Industry Research ──────────────────────────────────────────────
  {
    url: 'https://moz.com/local-search-ranking-factors',
    title: 'Local Search Ranking Factors',
    publisher: 'Moz',
    category: 'seo-research',
  },
  {
    url: 'https://www.brightlocal.com/research/local-consumer-review-survey/',
    title: 'Local Consumer Review Survey',
    publisher: 'BrightLocal',
    category: 'seo-research',
  },
  {
    url: 'https://www.brightlocal.com/research/google-reviews-study/',
    title: 'Google Reviews Study',
    publisher: 'BrightLocal',
    category: 'seo-research',
  },
  {
    url: 'https://whitespark.ca/local-search-ranking-factors/',
    title: 'Local Search Ranking Factors Survey',
    publisher: 'Whitespark',
    category: 'seo-research',
  },
  {
    url: 'https://www.semrush.com/blog/local-seo/',
    title: 'Local SEO Guide',
    publisher: 'Semrush',
    category: 'seo-research',
  },
  {
    url: 'https://ahrefs.com/blog/local-seo/',
    title: 'Local SEO: The Definitive Guide',
    publisher: 'Ahrefs',
    category: 'seo-research',
  },
  {
    url: 'https://searchengineland.com/guide/what-is-seo',
    title: 'What Is SEO?',
    publisher: 'Search Engine Land',
    category: 'seo-research',
  },

  // ── Review & Reputation Management ─────────────────────────────────────
  {
    url: 'https://www.reviewtrackers.com/reports/online-reviews-survey/',
    title: 'Online Reviews Statistics and Trends',
    publisher: 'ReviewTrackers',
    category: 'reputation',
  },
  {
    url: 'https://www.podium.com/article/online-review-statistics/',
    title: 'Online Review Statistics',
    publisher: 'Podium',
    category: 'reputation',
  },
  {
    url: 'https://www.qualtrics.com/blog/online-review-stats/',
    title: 'Online Review Statistics You Need to Know',
    publisher: 'Qualtrics',
    category: 'reputation',
  },
  {
    url: 'https://birdeye.com/blog/online-reviews-statistics/',
    title: 'Online Reviews Statistics',
    publisher: 'Birdeye',
    category: 'reputation',
  },

  // ── Industry-Specific ─────────────────────────────────────────────────
  {
    url: 'https://www.nrn.com/technology',
    title: 'Restaurant Technology News',
    publisher: 'Nation\'s Restaurant News',
    category: 'restaurant',
  },
  {
    url: 'https://restaurant.org/research-and-media/research/research-reports/',
    title: 'Restaurant Industry Research',
    publisher: 'National Restaurant Association',
    category: 'restaurant',
  },
  {
    url: 'https://www.ahla.com/research',
    title: 'Hotel Industry Research',
    publisher: 'American Hotel & Lodging Association',
    category: 'hotel',
  },
  {
    url: 'https://str.com/data-insights',
    title: 'Hotel Performance Data',
    publisher: 'STR',
    category: 'hotel',
  },
  {
    url: 'https://www.ada.org/resources/practice/practice-management',
    title: 'Dental Practice Management',
    publisher: 'American Dental Association',
    category: 'dental',
  },
  {
    url: 'https://www.nar.realtor/research-and-statistics',
    title: 'Real Estate Statistics',
    publisher: 'National Association of Realtors',
    category: 'real-estate',
  },
  {
    url: 'https://www.professionalbeauty.com.au/',
    title: 'Salon & Spa Industry',
    publisher: 'Professional Beauty',
    category: 'salon',
  },

  // ── Business & Marketing ──────────────────────────────────────────────
  {
    url: 'https://www.sba.gov/business-guide',
    title: 'Small Business Guide',
    publisher: 'U.S. Small Business Administration',
    category: 'business',
  },
  {
    url: 'https://www.hubspot.com/marketing-statistics',
    title: 'Marketing Statistics',
    publisher: 'HubSpot',
    category: 'business',
  },
  {
    url: 'https://www.forbes.com/advisor/business/software/online-reputation-management/',
    title: 'Online Reputation Management Guide',
    publisher: 'Forbes Advisor',
    category: 'business',
  },
  {
    url: 'https://www.mckinsey.com/industries/retail/our-insights',
    title: 'Retail Industry Insights',
    publisher: 'McKinsey',
    category: 'business',
  },
  {
    url: 'https://www.gartner.com/en/digital-markets/insights',
    title: 'Digital Markets Insights',
    publisher: 'Gartner',
    category: 'business',
  },

  // ── Technical / Schema / Structured Data ──────────────────────────────
  {
    url: 'https://schema.org/LocalBusiness',
    title: 'LocalBusiness Schema Type',
    publisher: 'Schema.org',
    category: 'technical',
  },
  {
    url: 'https://schema.org/Review',
    title: 'Review Schema Type',
    publisher: 'Schema.org',
    category: 'technical',
  },
  {
    url: 'https://search.google.com/test/rich-results',
    title: 'Rich Results Test',
    publisher: 'Google',
    category: 'technical',
  },
  {
    url: 'https://web.dev/articles/vitals',
    title: 'Web Vitals',
    publisher: 'web.dev',
    category: 'technical',
  },

  // ── AI & Automation ───────────────────────────────────────────────────
  {
    url: 'https://openai.com/index/chatgpt/',
    title: 'ChatGPT Overview',
    publisher: 'OpenAI',
    category: 'ai',
  },
  {
    url: 'https://blog.google/technology/ai/google-gemini-ai/',
    title: 'Google Gemini AI',
    publisher: 'Google Blog',
    category: 'ai',
  },

  // ── Consumer Behavior ─────────────────────────────────────────────────
  {
    url: 'https://www.pwc.com/gx/en/industries/consumer-markets/consumer-insights-survey.html',
    title: 'Global Consumer Insights Survey',
    publisher: 'PwC',
    category: 'consumer',
  },
  {
    url: 'https://www.nielsen.com/insights/',
    title: 'Consumer Insights',
    publisher: 'Nielsen',
    category: 'consumer',
  },
  {
    url: 'https://www.bain.com/insights/topics/customer-experience-and-loyalty/',
    title: 'Customer Experience & Loyalty',
    publisher: 'Bain & Company',
    category: 'consumer',
  },
];

// ── Topic → Category Mapping ─────────────────────────────────────────────

const TOPIC_CATEGORIES: Record<string, string[]> = {
  'google-official': [
    'google', 'gbp', 'business profile', 'maps', 'review policy', 'structured data',
    'schema', 'rich results', 'helpful content',
  ],
  'seo-research': [
    'seo', 'ranking', 'local search', 'citation', 'backlink', 'keyword',
    'geo', 'generative engine', 'voice search', 'ai overview',
  ],
  'reputation': [
    'review', 'reputation', 'feedback', 'star rating', 'response', 'sentiment',
    'nps', 'customer satisfaction', 'online review',
  ],
  'restaurant': ['restaurant', 'dining', 'food', 'menu', 'chef'],
  'hotel': ['hotel', 'hospitality', 'booking', 'guest', 'lodging', 'accommodation'],
  'dental': ['dental', 'dentist', 'clinic', 'patient', 'medical', 'healthcare'],
  'real-estate': ['real estate', 'realtor', 'property', 'agent', 'housing'],
  'salon': ['salon', 'spa', 'beauty', 'hair', 'wellness'],
  'business': [
    'business', 'marketing', 'roi', 'revenue', 'growth', 'small business',
    'startup', 'entrepreneur', 'checklist',
  ],
  'technical': [
    'schema', 'markup', 'structured data', 'json-ld', 'api', 'code',
    'implementation', 'technical',
  ],
  'ai': ['ai', 'artificial intelligence', 'automation', 'chatgpt', 'machine learning'],
  'consumer': ['consumer', 'customer', 'buyer', 'shopping', 'behavior', 'loyalty'],
};

// ── Selection Function ───────────────────────────────────────────────────

/**
 * Select the most relevant verified references for a given keyword/topic.
 *
 * @param keyword - Article keyword or topic string
 * @param count - Number of references to return (default: 6)
 * @returns Array of verified references, sorted by relevance
 */
export function selectVerifiedReferences(
  keyword: string,
  count: number = 6,
): VerifiedReference[] {
  const kw = keyword.toLowerCase();

  // Score each reference by topic match
  const scored = VERIFIED_REFERENCES.map((ref) => {
    let score = 0;

    // Check direct keyword match in reference title/publisher
    if (ref.title.toLowerCase().includes(kw)) score += 3;
    if (ref.publisher.toLowerCase().includes(kw)) score += 2;

    // Check category keyword matches
    const categoryKeywords = TOPIC_CATEGORIES[ref.category] || [];
    for (const ck of categoryKeywords) {
      if (kw.includes(ck)) score += 2;
      // Check individual words from keyword
      const kwWords = kw.split(/[\s-]+/);
      for (const word of kwWords) {
        if (word.length > 3 && ck.includes(word)) score += 1;
      }
    }

    // Always include Google official sources with base score
    if (ref.category === 'google-official') score += 1;

    return { ref, score };
  });

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);

  // Ensure diversity: max 2 per category
  const result: VerifiedReference[] = [];
  const categoryCounts: Record<string, number> = {};

  for (const { ref, score } of scored) {
    if (result.length >= count) break;
    if (score === 0) continue;

    const catCount = categoryCounts[ref.category] || 0;
    if (catCount >= 2) continue;

    result.push(ref);
    categoryCounts[ref.category] = catCount + 1;
  }

  // If we don't have enough, pad with highest-scored remaining
  if (result.length < count) {
    for (const { ref, score } of scored) {
      if (result.length >= count) break;
      if (result.includes(ref)) continue;
      if (score > 0) result.push(ref);
    }
  }

  return result;
}

/**
 * Format references as markdown footnotes for article insertion.
 */
export function formatReferencesMarkdown(refs: VerifiedReference[]): string {
  return refs
    .map((ref, i) => `[^${i + 1}]: [${ref.title}](${ref.url}) — ${ref.publisher}`)
    .join('\n');
}
