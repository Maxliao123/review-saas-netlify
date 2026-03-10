/**
 * generate-articles.ts — DeepSeek V3 Article Generator for reputationmonitor.ai
 *
 * Ported from vancouver-meal-logistics 4-layer prompt architecture:
 *   Layer 1: Anti-AI Detection Protocol (banned words/patterns)
 *   Layer 2: Review Management Expert Persona System
 *   Layer 3: Intent-Aware Prompt Routing (guide/comparison/industry/strategy/technical)
 *   Layer 4: Cross-Domain Product Context (Reputation Monitor CTA)
 *
 * Output: Markdown → BlogPost format for src/lib/blog-data.ts
 *
 * Usage:
 *   npx tsx scripts/generate-articles.ts                    # Generate all pending
 *   npx tsx scripts/generate-articles.ts --batch p0         # P0 only
 *   npx tsx scripts/generate-articles.ts --slug <slug>      # Single article
 *   npx tsx scripts/generate-articles.ts --dry-run          # Preview briefs only
 *   npx tsx scripts/generate-articles.ts --convert          # Generate + convert to BlogPost
 */

import OpenAI from 'openai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

// Load env
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// =====================================================
// DeepSeek V3 Client
// =====================================================
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error('Missing DEEPSEEK_API_KEY in .env.local');
  console.error('Add: DEEPSEEK_API_KEY=sk-... to .env.local');
  process.exit(1);
}

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: DEEPSEEK_API_KEY,
});

// =====================================================
// Output tag delimiters
// =====================================================
const CONTENT_START = '[CONTENT_START]';
const CONTENT_END = '[CONTENT_END]';
const FAQ_START = '[FAQ_START]';
const FAQ_END = '[FAQ_END]';
const META_START = '[META_START]';
const META_END = '[META_END]';

// =====================================================
// Layer 1: Anti-AI Detection Protocol
// =====================================================
const ANTI_AI_DETECTION_PROMPT = `
ANTI-AI DETECTION PROTOCOL (CRITICAL — Google penalizes AI-sounding content):

BANNED PUNCTUATION:
- Em dashes (—) are FORBIDDEN. Use commas, colons, or parentheses instead.

BANNED VERBS (never use these):
delve, leverage, utilize, facilitate, foster, bolster, underscore, unveil, navigate, streamline, endeavour, ascertain, elucidate

BANNED ADJECTIVES (never use these):
robust, comprehensive, pivotal, crucial, vital, transformative, cutting-edge, groundbreaking, innovative, seamless, intricate, nuanced, multifaceted, holistic

BANNED TRANSITIONS (never use these):
furthermore, moreover, notwithstanding, "that being said", "at its core", "it is worth noting", "in the realm of", "in the landscape of", "in today's fast-paced world", "in today's digital age", "in an era of", "in the ever-evolving landscape"

BANNED OPENING PHRASES:
"Let's delve into...", "Imagine a world where...", "It's important to note that..."

BANNED CONCLUDING PHRASES:
"In conclusion...", "To sum up...", "All things considered...", "At the end of the day..."

BANNED STRUCTURAL PATTERNS:
- "Whether you're a [X], [Y], or [Z]..."
- "It's not just [X], it's also [Y]..."
- Starting sentences with "By" + gerund: "By understanding X, you can Y..."

BANNED FILLER WORDS (remove entirely):
absolutely, basically, certainly, clearly, definitely, essentially, extremely, fundamentally, incredibly, interestingly, naturally, obviously, quite, really, significantly, simply, surely, truly, ultimately, undoubtedly, very

INSTEAD: Write like a hands-on business consultant advising a restaurant owner. Short punchy sentences. Real data and specific examples. No padding.
`;

// =====================================================
// Layer 2: Review Management Expert Persona System
// =====================================================
interface AuthorPersona {
  name: string;
  title: string;
  bio: string;
  expertise: string[];
  tone: string;
}

const AUTHOR_PERSONAS: AuthorPersona[] = [
  {
    name: 'Sarah Kim',
    title: 'Local SEO & Review Strategist',
    bio: 'Sarah has spent 8 years helping small businesses dominate local search. She has managed review strategies for over 200 restaurants, clinics, and retail stores across North America. She speaks at SEO conferences and writes for Search Engine Journal.',
    expertise: ['google reviews', 'local seo', 'google business', 'ranking', 'maps', 'search', 'visibility', 'citations', 'google maps', 'local pack', 'gbp', 'profile', 'voice search', 'multi-location', 'franchise', 'checklist'],
    tone: 'data-driven and practical, backs every claim with specific numbers',
  },
  {
    name: 'David Chen',
    title: 'Restaurant Technology Consultant',
    bio: 'David spent 5 years as a restaurant manager before pivoting to tech consulting. He has helped 150+ restaurants implement digital tools including QR code ordering, review collection systems, and AI-powered customer engagement. He knows the daily grind of running a food business.',
    expertise: ['restaurant', 'hotel', 'clinic', 'salon', 'dental', 'spa', 'qr code', 'nfc', 'hospitality', 'food service', 'retail', 'auto repair', 'real estate', 'small business', 'pos'],
    tone: 'empathetic and street-smart, understands the operator perspective',
  },
  {
    name: 'Rachel Torres',
    title: 'Digital Reputation Expert',
    bio: 'Rachel is a former PR director turned online reputation consultant. She has managed crisis communications for businesses hit with viral negative reviews and built proactive review strategies that generate 5x more positive feedback. She is certified in Google Business management.',
    expertise: ['reputation', 'negative reviews', 'complaint', 'response', 'brand', 'crisis', 'sentiment', 'feedback', 'fake reviews', 'policy', 'guidelines', 'removal', 'response templates', 'customer feedback', 'roi'],
    tone: 'calm and authoritative, turns negative situations into opportunities',
  },
  {
    name: 'Marcus Liu',
    title: 'AI & GEO Optimization Specialist',
    bio: 'Marcus is a former Google engineer turned SEO consultant. He specializes in Generative Engine Optimization (GEO), helping businesses appear in AI-generated search results. He reverse-engineers how ChatGPT, Gemini, and Google AI Overviews select and cite sources.',
    expertise: ['ai', 'geo', 'generative', 'chatgpt', 'gemini', 'ai overview', 'automation', 'machine learning', 'nlp', 'schema', 'structured data', 'api', 'technical seo', 'ai review', 'analytics', 'velocity'],
    tone: 'technical but accessible, explains complex concepts with analogies',
  },
];

function selectAuthorPersona(keyword: string): AuthorPersona {
  const kl = keyword.toLowerCase();
  let bestScore = 0;
  let bestPersona = AUTHOR_PERSONAS[0];

  for (const persona of AUTHOR_PERSONAS) {
    let score = 0;
    for (const exp of persona.expertise) {
      if (kl.includes(exp)) score += exp.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPersona = persona;
    }
  }

  return bestPersona;
}

// =====================================================
// Layer 3: Intent-Aware Prompt Routing
// =====================================================
type IntentMode = 'guide' | 'comparison' | 'industry' | 'strategy' | 'technical';

const INTENT_PROMPTS: Record<IntentMode, string> = {
  guide: `MODE: GUIDE (Comprehensive How-To).
Focus: Practical, actionable guide for business owners who want to solve a specific problem.
Structure: Overview + Step-by-Step + Tools + Common Mistakes + Tips.
Voice: Experienced consultant sharing insider knowledge. Every paragraph teaches something actionable.`,

  comparison: `MODE: COMPARISON (Side-by-Side Analysis).
Focus: Honest comparison with specific criteria. Let the data speak.
Structure: Criteria setup + Options breakdown + Pros/Cons table + Verdict per category.
Voice: Neutral analyst who has personally tested everything. Honest about strengths AND weaknesses.`,

  industry: `MODE: INDUSTRY GUIDE (Sector Deep-Dive).
Focus: Everything a specific industry needs to know about review management.
Structure: Industry challenges + Specific strategies + Real examples + Templates.
Voice: Someone who has worked in the industry and understands the daily operations.`,

  strategy: `MODE: STRATEGY (Data-Backed Approach).
Focus: Research-backed strategy with implementation roadmap.
Structure: Problem statement + Data/Research + Strategy framework + Implementation steps + Measurement.
Voice: Strategic advisor who combines data with practical experience.`,

  technical: `MODE: TECHNICAL DEEP-DIVE (How It Works).
Focus: Technical concepts made accessible to business owners.
Structure: Concept explanation + How it works + Why it matters + Implementation + Tools.
Voice: Technical expert who can explain to non-technical audience without dumbing down.`,
};

function getIntentMode(slug: string, targetQuery: string): IntentMode {
  const combined = `${slug} ${targetQuery}`.toLowerCase();

  if (/\b(restaurant|hotel|clinic|salon|dental|auto repair|retail|real estate)\b/.test(combined)
    && /\b(guide|strategy|review|management)\b/.test(combined)) return 'industry';

  if (/\b(vs|versus|compared|comparison|best|top|ranked|tools)\b/.test(combined)) return 'comparison';

  if (/\b(seo|geo|schema|structured data|ranking factor|maps ranking|voice search|ai overview|velocity)\b/.test(combined)) return 'technical';

  if (/\b(strategy|increase|improve|boost|grow|impact|roi|how many)\b/.test(combined)) return 'strategy';

  return 'guide';
}

// =====================================================
// Layer 4: Cross-Domain Product Context
// =====================================================
const CROSS_DOMAIN_CONTEXT = `
CROSS-DOMAIN CONTEXT (Use naturally, do NOT dump as a block):
- reputationmonitor.ai: SaaS tool for Google review management. Customers scan a QR code, select experience tags, and AI generates a personalized 5-star review they can post to Google with one tap. Admin dashboard provides review analytics, sentiment analysis, complaint categorization, and AI-powered reply suggestions.
- Mention Reputation Monitor 1-2 times when naturally relevant (e.g., when discussing QR code review collection, AI review generation, review analytics, or automated responses).
- Never position as the "only" or "best" solution. Present as one option among strategies discussed.
`;

// =====================================================
// Existing articles (for internal linking)
// =====================================================
const EXISTING_ARTICLES: { slug: string; title: string }[] = [
  { slug: 'google-review-management-complete-guide', title: 'The Complete Guide to Google Review Management in 2026' },
  { slug: 'restaurant-review-strategy-2026', title: 'Restaurant Google Review Strategy: From 10 to 500 Reviews in 90 Days' },
  { slug: 'ai-review-reply-best-practices', title: 'AI Review Reply Best Practices: Save Time Without Losing the Personal Touch' },
  { slug: 'negative-review-response-guide', title: 'How to Respond to Negative Reviews: Turn Critics into Loyal Customers' },
  { slug: 'local-seo-reviews-impact-study', title: 'How Google Reviews Impact Local SEO Rankings: 2026 Data Study' },
  { slug: 'qr-code-review-collection-setup', title: 'QR Code Review Collection: Setup Guide for Any Business' },
  { slug: 'review-management-roi-analysis', title: 'Review Management ROI: How Reviews Drive Revenue for Local Businesses' },
];

function findRelatedArticles(targetSlug: string, keyword: string, max = 5): { slug: string; title: string }[] {
  const kl = keyword.toLowerCase();
  return EXISTING_ARTICLES
    .filter(a => a.slug !== targetSlug)
    .map(a => {
      let score = 0;
      const titleLower = a.title.toLowerCase();
      const words = kl.split(/\s+/).filter(w => w.length > 3);
      for (const w of words) {
        if (titleLower.includes(w)) score += w.length;
      }
      return { ...a, score };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

// =====================================================
// Authority External Links
// =====================================================
const SAFE_AUTHORITY_URLS: Record<string, { url: string; anchor: string; topics: string[] }> = {
  googleBusiness: { url: 'https://support.google.com/business/', anchor: 'Google Business Profile Help Center', topics: ['google', 'business', 'profile', 'gbp', 'maps', 'listing'] },
  googleReviewPolicy: { url: 'https://support.google.com/contributionpolicy/answer/7400114', anchor: 'Google Review Policy', topics: ['review', 'policy', 'fake', 'removal', 'guidelines', 'flag'] },
  brightlocal: { url: 'https://www.brightlocal.com/research/local-consumer-review-survey/', anchor: 'BrightLocal Consumer Review Survey', topics: ['review', 'consumer', 'statistics', 'survey', 'trust', 'local'] },
  moz: { url: 'https://moz.com/local-search-ranking-factors', anchor: 'Moz Local Search Ranking Factors', topics: ['seo', 'ranking', 'local', 'search', 'factor', 'citation'] },
  searchEngineJournal: { url: 'https://www.searchenginejournal.com/local-seo/', anchor: 'Search Engine Journal Local SEO Guide', topics: ['seo', 'local', 'search', 'optimization', 'strategy'] },
  schemaOrg: { url: 'https://schema.org/LocalBusiness', anchor: 'Schema.org LocalBusiness markup', topics: ['schema', 'structured data', 'markup', 'technical', 'seo'] },
  googleStructuredData: { url: 'https://developers.google.com/search/docs/appearance/structured-data', anchor: 'Google Structured Data documentation', topics: ['schema', 'structured data', 'google', 'rich results', 'faq'] },
  hubspot: { url: 'https://www.hubspot.com/marketing-statistics', anchor: 'HubSpot Marketing Statistics', topics: ['marketing', 'statistics', 'roi', 'conversion', 'customer'] },
};

function selectAuthorityLinks(keyword: string, count = 3): { url: string; anchor: string }[] {
  const kl = keyword.toLowerCase();
  return Object.values(SAFE_AUTHORITY_URLS)
    .map(link => {
      let score = 0;
      for (const topic of link.topics) {
        if (kl.includes(topic)) score += topic.length;
      }
      return { ...link, score: Math.max(score, 1) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

// =====================================================
// Pre-Verified Reference Pool
// =====================================================
interface VerifiedReference {
  id: string;
  citation: string;
  topics: string[];
}

const VERIFIED_REFERENCES: VerifiedReference[] = [
  { id: 'brightlocal-survey', citation: 'BrightLocal, "Local Consumer Review Survey," 2025. Annual survey on how consumers use online reviews to choose local businesses. https://www.brightlocal.com/research/local-consumer-review-survey/', topics: ['review', 'consumer', 'trust', 'local', 'statistics', 'survey'] },
  { id: 'google-business-help', citation: 'Google, "Google Business Profile Help," 2026. Official documentation for managing your Google Business Profile and reviews. https://support.google.com/business/', topics: ['google', 'business', 'profile', 'reviews', 'maps', 'listing'] },
  { id: 'moz-ranking', citation: 'Moz, "Local Search Ranking Factors," 2025. Annual study of factors that influence local search rankings. https://moz.com/local-search-ranking-factors', topics: ['seo', 'ranking', 'local', 'search', 'factors', 'citation'] },
  { id: 'harvard-review', citation: 'Luca, M., "Reviews, Reputation, and Revenue: The Case of Yelp.com," Harvard Business School, 2016. Landmark study linking review ratings to revenue changes. https://hbswk.hbs.edu/item/the-yelp-factor-are-consumer-reviews-good-for-business', topics: ['review', 'revenue', 'rating', 'impact', 'roi', 'restaurant'] },
  { id: 'spiegel-research', citation: 'Spiegel Research Center, "How Online Reviews Influence Sales," Northwestern University, 2017. Research on review impact on purchase probability. https://spiegel.medill.northwestern.edu/online-reviews/', topics: ['review', 'sales', 'conversion', 'purchase', 'consumer', 'trust'] },
  { id: 'google-review-policy', citation: 'Google, "Maps User Contributed Content Policy," 2026. Official Google review guidelines and prohibited content. https://support.google.com/contributionpolicy/answer/7400114', topics: ['google', 'policy', 'review', 'guidelines', 'fake', 'removal', 'flag'] },
  { id: 'semrush-local', citation: 'Semrush, "Local SEO Guide," 2026. Best practices for local search optimization including review signals. https://www.semrush.com/blog/local-seo/', topics: ['seo', 'local', 'optimization', 'search', 'ranking', 'strategy'] },
  { id: 'reviewtrackers', citation: 'ReviewTrackers, "Online Reviews Statistics and Trends," 2025. Industry report on review volume, response rates, and sentiment trends. https://www.reviewtrackers.com/reports/online-reviews-survey/', topics: ['review', 'statistics', 'response', 'sentiment', 'trends', 'reputation'] },
  { id: 'google-ai-search', citation: 'Google, "How AI Overviews Work in Search," 2026. Google Search blog explaining AI-generated answers and source selection. https://blog.google/products/search/', topics: ['ai', 'overview', 'search', 'google', 'generative', 'geo'] },
  { id: 'schema-local', citation: 'Schema.org, "LocalBusiness Type Documentation," 2026. Structured data specification for local business markup. https://schema.org/LocalBusiness', topics: ['schema', 'structured data', 'local', 'business', 'markup', 'seo'] },
  { id: 'ftc-endorsement', citation: 'Federal Trade Commission, "FTC Endorsement Guides," 2024. Guidelines on endorsements and reviews in advertising. https://www.ftc.gov/legal-library/browse/rules/endorsement-guides', topics: ['policy', 'guidelines', 'fake', 'endorsement', 'legal', 'compliance'] },
  { id: 'whitespark-citations', citation: 'Whitespark, "Local Citation Resources," 2025. Guide to building and managing local citations for SEO. https://whitespark.ca/', topics: ['citation', 'local', 'seo', 'nap', 'directory', 'listing'] },
  { id: 'podium-reviews', citation: 'Podium, "State of Online Reviews," 2025. Annual report on review collection methods and consumer behavior. https://www.podium.com/', topics: ['review', 'collection', 'sms', 'messaging', 'consumer', 'business'] },
];

function selectVerifiedReferences(keyword: string, count = 6): VerifiedReference[] {
  const kl = keyword.toLowerCase();
  return VERIFIED_REFERENCES
    .map(ref => {
      let score = 0;
      for (const topic of ref.topics) {
        if (kl.includes(topic)) score += topic.length;
      }
      return { ...ref, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

function ensureVerifiedReferences(markdown: string, keyword: string): string {
  const refs = selectVerifiedReferences(keyword);
  if (refs.length === 0) return markdown;

  let cleaned = markdown.replace(/\n*## References[\s\S]*$/m, '');
  cleaned = cleaned.replace(/\n*`#[^`]+`\s*$/, '');
  cleaned = cleaned.trimEnd();

  const newRefsContent = '\n\n## References\n\n' + refs.map((r, i) => `${i + 1}: ${r.citation}`).join('\n\n') + '\n';
  const result = cleaned + newRefsContent;

  const footnoteNumbers = [...result.matchAll(/\[\^(\d+)\]/g)].map(m => parseInt(m[1]));
  const maxFootnote = Math.max(0, ...footnoteNumbers);
  if (maxFootnote > refs.length) {
    let remapped = result;
    for (let n = refs.length + 1; n <= maxFootnote; n++) {
      const mapped = ((n - 1) % refs.length) + 1;
      remapped = remapped.replace(new RegExp(`\\[\\^${n}\\]`, 'g'), `[^${mapped}]`);
    }
    return remapped;
  }

  return result;
}

async function validateExternalLinks(markdown: string): Promise<string> {
  const externalLinkRegex = /\[([^\]]+)\]\((https?:\/\/(?!reputationmonitor\.ai)[^\s)]+)\)/g;
  const matches = [...markdown.matchAll(externalLinkRegex)];

  if (matches.length === 0) return markdown;
  console.log(`  [Link Validator] Checking ${matches.length} external links...`);

  const results = await Promise.allSettled(
    matches.map(async (match) => {
      const [fullMatch, anchorText, url] = match;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'User-Agent': 'ReputationMonitor-LinkChecker/1.0' },
          redirect: 'follow',
        });
        clearTimeout(timeout);
        if (response.ok || response.status === 405) {
          return { fullMatch, status: 'alive' as const, url };
        }
        console.warn(`  [Link Validator] Dead (${response.status}): ${url}`);
        return { fullMatch, status: 'dead' as const, url, anchorText };
      } catch {
        console.warn(`  [Link Validator] Unreachable: ${url}`);
        return { fullMatch, status: 'dead' as const, url, anchorText };
      }
    })
  );

  let cleaned = markdown;
  let deadCount = 0;
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.status === 'dead') {
      cleaned = cleaned.replace(result.value.fullMatch, result.value.anchorText!);
      deadCount++;
    }
  }
  console.log(`  [Link Validator] ${matches.length - deadCount} alive, ${deadCount} dead removed`);
  return cleaned;
}

// =====================================================
// Article Brief Definitions (~30 articles)
// =====================================================
interface ArticleBrief {
  slug: string;
  targetQuery: string;
  title: string;
  titleZh: string;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  category: string;
  categoryZh: string;
  tags: string[];
  outline: string;
}

const ARTICLE_BRIEFS: ArticleBrief[] = [
  // ─── P0: Core Pillar Pages (6 articles) ───
  {
    slug: 'how-to-get-more-google-reviews-2026',
    targetQuery: 'how to get more google reviews, increase google reviews, get more reviews',
    title: 'How to Get More Google Reviews in 2026: 12 Proven Strategies',
    titleZh: '2026 年如何獲得更多 Google 評論：12 個實證策略',
    priority: 'p0',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['google reviews', 'review strategy', 'review collection', 'local business'],
    outline: `Cover 12 specific strategies with real data. Include: QR codes at point of sale, SMS follow-ups (timing: 2-4 hours post-visit), email campaigns, staff training scripts, Google review link shortener, NFC tap-to-review, receipt-based prompts, loyalty program integration, social media review asks, review response as incentive, seasonal campaigns, AI-assisted review drafting. Each strategy needs success data. Include implementation difficulty rating.`,
  },
  {
    slug: 'google-review-response-templates-guide',
    targetQuery: 'google review response templates, how to reply to google reviews, review reply examples',
    title: 'Google Review Response Templates: 25+ Copy-Paste Replies That Work',
    titleZh: 'Google 評論回覆範本：25+ 可直接使用的回覆模板',
    priority: 'p0',
    category: 'guides',
    categoryZh: '指南',
    tags: ['review response', 'templates', 'customer service', 'reputation management'],
    outline: `Provide 25+ actual response templates organized by category: 5-star positive, 4-star positive, 3-star mixed, 2-star negative, 1-star negative, no-text reviews, reviews mentioning specific staff, reviews about pricing, reviews about wait time, compliment-focused reviews. Each template with explanation of WHY it works. Include AI-assisted response tips. Response time benchmarks. What NOT to say.`,
  },
  {
    slug: 'negative-google-review-management-guide',
    targetQuery: 'how to handle negative google reviews, respond to bad reviews, negative review strategy',
    title: 'How to Handle Negative Google Reviews: A Complete Business Guide',
    titleZh: '如何處理 Google 負面評論：商家完整指南',
    priority: 'p0',
    category: 'guides',
    categoryZh: '指南',
    tags: ['negative reviews', 'crisis management', 'reputation repair', 'customer complaints'],
    outline: `Cover: The 24-hour response rule. The HEARD framework (Hear, Empathize, Apologize, Resolve, Diagnose). When to take conversations offline. Legal considerations. When you CAN get a review removed (Google policy violations). Turning negative reviewers into repeat customers (case studies). Compensation guidelines by complaint type. Monitoring and alerting setup. Review sentiment analysis for pattern detection.`,
  },
  {
    slug: 'local-seo-google-reviews-ranking-factor',
    targetQuery: 'google reviews seo, do google reviews help seo ranking, reviews local search ranking',
    title: 'How Google Reviews Impact Local SEO Rankings: 2026 Data Study',
    titleZh: 'Google 評論如何影響本地 SEO 排名：2026 數據研究',
    priority: 'p0',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['local SEO', 'google reviews', 'ranking factors', 'search ranking'],
    outline: `Data-driven analysis of reviews as ranking factor. Cover: Moz local ranking factors data (reviews = 17% of local pack ranking). Review signals: quantity, velocity, diversity, recency, rating, keywords in reviews, response rate. How Google AI Overviews use review data. Case study: business that went from page 3 to local pack through reviews. Review vs citation vs GBP signals comparison. Specific metrics to track.`,
  },
  {
    slug: 'ai-review-management-tools-comparison-2026',
    targetQuery: 'ai review management tools, best review management software 2026, review management platform',
    title: 'Best AI Review Management Tools in 2026: Honest Comparison',
    titleZh: '2026 年最佳 AI 評論管理工具：誠實比較',
    priority: 'p0',
    category: 'guides',
    categoryZh: '指南',
    tags: ['review management tools', 'software comparison', 'ai tools', 'reputation software'],
    outline: `Compare 8-10 tools: Reputation Monitor, Birdeye, Podium, ReviewTrackers, Yext, GatherUp, Grade.us, Trustpilot, BrightLocal. Comparison table: price, AI features, review collection methods, multi-platform support, analytics, API access, multi-location. Pros/cons for each. Best for: restaurants, healthcare, multi-location, budget-conscious, enterprise. Include specific pricing tiers where public.`,
  },
  {
    slug: 'qr-code-google-review-collection-guide',
    targetQuery: 'qr code google reviews, review collection qr code, qr code review link',
    title: 'QR Code Review Collection: The Complete Setup Guide for Any Business',
    titleZh: 'QR Code 評論收集：任何商家的完整設定指南',
    priority: 'p0',
    category: 'guides',
    categoryZh: '指南',
    tags: ['qr code', 'review collection', 'google reviews', 'setup guide'],
    outline: `Step-by-step QR code review setup. Cover: Getting your Google review link, creating QR codes (free tools vs branded), placement strategies (table tents, receipts, business cards, packaging, walls), NFC alternative, A/B testing different CTAs, measuring scan-to-review conversion rates. Advanced: AI-assisted review drafting after scan, tag selection for guided reviews. Case study: restaurant that tripled reviews in 60 days with QR placement strategy.`,
  },

  // ─── P1: Industry-Specific Pages (8 articles) ───
  {
    slug: 'restaurant-google-review-strategy',
    targetQuery: 'restaurant google reviews, how to get restaurant reviews, restaurant reputation management',
    title: 'Restaurant Google Review Strategy: From 10 to 500 Reviews in 90 Days',
    titleZh: '餐廳 Google 評論策略：90 天內從 10 則到 500 則評論',
    priority: 'p1',
    category: 'industry',
    categoryZh: '行業',
    tags: ['restaurant', 'google reviews', 'review strategy', 'food service'],
    outline: `Restaurant-specific review strategy. Cover: Table tent QR codes, post-payment ask timing, server training scripts, Google review link on receipts, WiFi landing page with review prompt, delivery bag inserts, online ordering follow-up emails, seasonal review campaigns (Valentine's, Mother's Day), handling food criticism specifically, menu-specific keyword encouragement, photos in reviews strategy. Include: 90-day implementation timeline with weekly targets.`,
  },
  {
    slug: 'hotel-online-reputation-management',
    targetQuery: 'hotel reputation management, hotel google reviews strategy, hotel review management',
    title: 'Hotel Online Reputation Management: Complete Strategy Guide',
    titleZh: '飯店線上聲譽管理：完整策略指南',
    priority: 'p1',
    category: 'industry',
    categoryZh: '行業',
    tags: ['hotel', 'reputation management', 'hospitality', 'google reviews'],
    outline: `Hotel-specific challenges: multi-platform (Google, TripAdvisor, Booking.com, Expedia). Cover: Check-out review request timing, in-room QR codes, post-stay email sequences, front desk scripts, handling OTA reviews vs Google reviews, seasonal review patterns (peak vs off-season), concierge-driven review collection, loyalty program integration. Multi-language review management for international guests. Review response SLA benchmarks for hospitality.`,
  },
  {
    slug: 'clinic-medical-practice-review-guide',
    targetQuery: 'clinic google reviews, medical practice review management, healthcare reviews',
    title: 'Medical Practice Review Management: HIPAA-Compliant Guide for Clinics',
    titleZh: '醫療診所評論管理：符合 HIPAA 規範的指南',
    priority: 'p1',
    category: 'industry',
    categoryZh: '行業',
    tags: ['clinic', 'medical', 'healthcare', 'HIPAA', 'patient reviews'],
    outline: `Healthcare-specific review management with compliance focus. Cover: HIPAA considerations in review responses (never confirm patient relationship), post-appointment review requests (timing: 1-2 hours), patient portal integration, compliant response templates, handling health outcome complaints, doctor-specific vs practice-level reviews, specialist vs general practice differences, telehealth review collection, insurance-related complaint responses.`,
  },
  {
    slug: 'salon-spa-review-management-strategy',
    targetQuery: 'salon reviews, spa google review strategy, beauty salon reputation',
    title: 'Salon & Spa Review Strategy: Get Clients Raving Online',
    titleZh: '美容沙龍與 SPA 評論策略：讓客戶在網上讚不絕口',
    priority: 'p1',
    category: 'industry',
    categoryZh: '行業',
    tags: ['salon', 'spa', 'beauty', 'google reviews', 'customer experience'],
    outline: `Beauty industry review strategy. Cover: Post-service "mirror moment" timing (ask when client sees results), stylist-specific review encouragement, before/after photo reviews, booking system integration (review link in confirmation), handling style preference complaints, responding to pricing complaints in luxury segment, Instagram-to-Google review bridge, loyalty tier review incentives, seasonal promotions tied to reviews.`,
  },
  {
    slug: 'dental-practice-patient-reviews-guide',
    targetQuery: 'dental practice reviews, dentist google review strategy, dental office reputation',
    title: 'Dental Practice Reviews: How to Build Trust and Fill Your Schedule',
    titleZh: '牙醫診所評論：如何建立信任並填滿預約',
    priority: 'p1',
    category: 'industry',
    categoryZh: '行業',
    tags: ['dental', 'dentist', 'patient reviews', 'healthcare', 'google reviews'],
    outline: `Dental-specific review strategy. Cover: Post-treatment review timing (after checkup vs after procedure), HIPAA-compliant responses, handling pain-related complaints, new patient acquisition through reviews, emergency dentist keywords in reviews, family dentistry review approach, cosmetic dentistry before/after, insurance-related complaints, appointment booking through Google, dental anxiety mentions in reviews.`,
  },
  {
    slug: 'real-estate-agent-review-strategy',
    targetQuery: 'real estate agent reviews, realtor google review tips, real estate reputation',
    title: 'Real Estate Agent Review Strategy: Stand Out in a Competitive Market',
    titleZh: '房產經紀人評論策略：在競爭激烈的市場中脫穎而出',
    priority: 'p1',
    category: 'industry',
    categoryZh: '行業',
    tags: ['real estate', 'realtor', 'agent reviews', 'google reviews'],
    outline: `Real estate review strategy. Cover: Post-closing review request (timing: 1-2 days after), personal Google review link setup, video testimonial to written review pipeline, Zillow/Realtor.com vs Google reviews priority, handling deal-that-fell-through reviews, team vs individual agent reviews, neighborhood keyword strategy in reviews, referral + review combination approach, seasonal market condition responses.`,
  },
  {
    slug: 'auto-repair-shop-review-management',
    targetQuery: 'auto repair shop reviews, mechanic google review strategy, auto service reputation',
    title: 'Auto Repair Shop Reviews: Build Trust in an Industry That Needs It',
    titleZh: '汽車修理廠評論管理：在需要信任的行業中建立口碑',
    priority: 'p1',
    category: 'industry',
    categoryZh: '行業',
    tags: ['auto repair', 'mechanic', 'automotive', 'trust', 'google reviews'],
    outline: `Auto repair review strategy (trust-focused industry). Cover: Post-service text message timing, invoice-based review links, handling pricing dispute reviews, explaining technical repairs in responses, before/after photo documentation, warranty-related complaint responses, parts quality mentions, wait time management, pick-up/drop-off convenience reviews, fleet/commercial account review collection.`,
  },
  {
    slug: 'retail-store-google-review-strategy',
    targetQuery: 'retail store reviews, small business google reviews, shop review strategy',
    title: 'Retail Store Google Reviews: Small Business Owner\'s Complete Guide',
    titleZh: '零售商店 Google 評論：小型企業主完整指南',
    priority: 'p1',
    category: 'industry',
    categoryZh: '行業',
    tags: ['retail', 'small business', 'google reviews', 'local business'],
    outline: `Retail-specific review strategy. Cover: Checkout counter QR placement, packaging insert review cards, post-purchase SMS/email timing, product-specific vs store-level reviews, handling product defect complaints, return policy-related responses, price comparison complaints, staff knowledge mentions, store ambiance reviews, online vs in-store purchase review collection, seasonal peak review campaigns.`,
  },

  // ─── P2: SEO & GEO Deep-Dives (10 articles) ───
  {
    slug: 'geo-generative-engine-optimization-guide',
    targetQuery: 'what is geo, generative engine optimization guide, optimize for ai search',
    title: 'GEO: Generative Engine Optimization Guide for Local Businesses',
    titleZh: 'GEO 生成式引擎優化：本地商家指南',
    priority: 'p2',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['GEO', 'generative engine optimization', 'AI search', 'local SEO'],
    outline: `Define GEO and how it differs from traditional SEO. Cover: How ChatGPT, Gemini, and Google AI Overviews select sources. Citation signals (structured data, review quantity, authority mentions). How reviews feed into AI answers. Blockquote summaries for AI extraction. FAQ schema for featured snippets. Entity building for AI recognition. Practical implementation steps for a local business. Measurement: tracking AI citations.`,
  },
  {
    slug: 'google-ai-overview-local-business-seo',
    targetQuery: 'google ai overview local business, ai search local seo, ai overviews seo',
    title: 'Google AI Overviews & Local Business: What You Need to Know',
    titleZh: 'Google AI 概覽與本地商家：你需要知道的一切',
    priority: 'p2',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['AI overview', 'google search', 'local SEO', 'AI search'],
    outline: `How Google AI Overviews affect local businesses. Cover: What triggers local AI Overviews, how review data appears in AI answers, review signals that AI Overviews prioritize, how to get your business cited in AI answers, the relationship between traditional local pack and AI Overview, industries most affected, tracking your visibility in AI results, content optimization for AI extraction.`,
  },
  {
    slug: 'google-business-profile-optimization-2026',
    targetQuery: 'google business profile optimization, gbp seo tips, google my business optimization',
    title: 'Google Business Profile Optimization: 2026 Complete Checklist',
    titleZh: 'Google 商家檔案優化：2026 完整清單',
    priority: 'p2',
    category: 'guides',
    categoryZh: '指南',
    tags: ['google business profile', 'GBP', 'optimization', 'local SEO'],
    outline: `Full GBP optimization checklist. Cover: NAP consistency, category selection (primary + secondary), business description optimization, photos (types, quantity, frequency), Q&A section management, Google Posts strategy, attributes setup, service/menu setup, appointment/booking links, review management within GBP, messaging setup, website link optimization. Each item with impact rating.`,
  },
  {
    slug: 'local-seo-citation-building-guide',
    targetQuery: 'local seo citations, nap consistency guide, local business citations',
    title: 'Local SEO Citation Building: NAP Consistency Guide for 2026',
    titleZh: '本地 SEO 引用建設：2026 NAP 一致性指南',
    priority: 'p2',
    category: 'guides',
    categoryZh: '指南',
    tags: ['citations', 'NAP', 'local SEO', 'directories'],
    outline: `What citations are and why they matter. Cover: Top 50 citation sources by industry, NAP consistency audit process, structured vs unstructured citations, industry-specific directories, aggregator data providers (Data Axle, Localeze, Neustar), cleaning up duplicate listings, citation building tools comparison, measuring citation impact on ranking, citation + review synergy.`,
  },
  {
    slug: 'schema-markup-local-business-seo',
    targetQuery: 'local business schema markup, structured data seo, review schema',
    title: 'Schema Markup for Local Business SEO: Technical Implementation Guide',
    titleZh: '本地商家 Schema 標記：技術實作指南',
    priority: 'p2',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['schema markup', 'structured data', 'technical SEO', 'local business'],
    outline: `Schema markup implementation for local businesses. Cover: LocalBusiness schema, AggregateRating schema, Review schema, FAQPage schema, HowTo schema, Product schema. JSON-LD implementation examples. Testing with Google Rich Results Test. Common mistakes. Review snippet markup. How schema feeds AI Overviews. WordPress/Next.js implementation. Multi-location schema.`,
  },
  {
    slug: 'review-velocity-impact-local-ranking',
    targetQuery: 'review velocity seo, how many reviews per month, review frequency ranking',
    title: 'Review Velocity: How Many Reviews Per Month Do You Need?',
    titleZh: '評論速度：你每月需要多少則評論？',
    priority: 'p2',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['review velocity', 'review frequency', 'local ranking', 'SEO'],
    outline: `Data analysis of review velocity impact. Cover: What review velocity is, benchmark data by industry (restaurants need 15-30/month, doctors need 5-10, etc.), how Google measures review freshness, recency signals in local ranking, the danger of review spikes (looks fake), sustainable review growth strategies, velocity vs total count vs rating, measuring your velocity vs competitors.`,
  },
  {
    slug: 'google-maps-ranking-factors-2026',
    targetQuery: 'google maps ranking factors, local pack ranking, maps seo 2026',
    title: 'Google Maps Ranking Factors in 2026: What Actually Matters',
    titleZh: '2026 Google Maps 排名因素：什麼真正重要',
    priority: 'p2',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['google maps', 'ranking factors', 'local pack', 'local SEO'],
    outline: `Breakdown of current Google Maps/local pack ranking factors. Cover: Relevance (category, keywords), Distance (proximity, service area), Prominence (reviews, citations, authority). Specific weight estimates based on Moz/BrightLocal data. Reviews as strongest controllable factor. GBP completeness impact. Website authority signals. Behavioral signals (clicks, calls, direction requests). Industry-specific differences. Actionable optimization prioritization.`,
  },
  {
    slug: 'voice-search-local-seo-optimization',
    targetQuery: 'voice search local seo, optimize for voice search business, voice search optimization',
    title: 'Voice Search & Local SEO: How to Optimize Your Business',
    titleZh: '語音搜尋與本地 SEO：如何優化你的商家',
    priority: 'p2',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['voice search', 'local SEO', 'Alexa', 'Siri', 'Google Assistant'],
    outline: `Voice search optimization for local businesses. Cover: How voice search queries differ (conversational, question-based, "near me"), voice search market size data, which assistant uses which data source (Google Assistant = GBP, Siri = Apple Maps, Alexa = Yelp/Bing), FAQ optimization for voice, speakable structured data, review keywords in voice results, Google Business Q&A optimization, local content for voice queries.`,
  },
  {
    slug: 'ai-generated-review-responses-seo-impact',
    targetQuery: 'ai review responses seo, automated review replies ranking, ai reply reviews',
    title: 'AI-Generated Review Responses: Do They Help or Hurt Your SEO?',
    titleZh: 'AI 自動回覆評論：對 SEO 是幫助還是傷害？',
    priority: 'p2',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['AI responses', 'review replies', 'SEO impact', 'automation'],
    outline: `Analyze whether AI review responses help or hurt rankings. Cover: Google's stance on AI content in reviews, response rate as ranking signal, keyword insertion in responses, personalization vs template responses, A/B test data (AI vs human responses), customer perception of AI replies, best practices for AI-assisted (not AI-only) responses, tools that do AI review responses, risk of detection, human-in-the-loop approach.`,
  },
  {
    slug: 'multi-location-business-review-management',
    targetQuery: 'multi location review management, franchise reviews strategy, chain store reviews',
    title: 'Multi-Location Review Management: Scale Without Losing Quality',
    titleZh: '多店面評論管理：規模化而不失品質',
    priority: 'p2',
    category: 'guides',
    categoryZh: '指南',
    tags: ['multi-location', 'franchise', 'chain', 'review management', 'scale'],
    outline: `Multi-location review management challenges and solutions. Cover: Centralized vs decentralized review management, brand voice consistency across locations, location-specific response customization, performance benchmarking between locations, roll-up analytics dashboards, manager accountability systems, review collection competitions between locations, multi-location GBP management, template systems with location variables.`,
  },

  // ─── P3: Long-Tail & Conversion Pages (6 articles) ───
  {
    slug: 'review-management-roi-calculator-guide',
    targetQuery: 'review management roi, reviews revenue impact calculator, review value calculation',
    title: 'Review Management ROI: How to Calculate the Revenue Impact',
    titleZh: '評論管理 ROI：如何計算營收影響',
    priority: 'p3',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['ROI', 'revenue', 'review management', 'business case'],
    outline: `How to calculate review management ROI. Cover: Harvard/Northwestern research on review-revenue link, the 1-star revenue impact formula, review volume to lead conversion rates, customer lifetime value in review context, cost of negative reviews (lost revenue calculation), review management tool cost vs revenue gain, building the business case for review management investment, industry-specific ROI benchmarks.`,
  },
  {
    slug: 'fake-google-reviews-detection-removal',
    targetQuery: 'fake google reviews, how to remove fake reviews, flag fake review google',
    title: 'Fake Google Reviews: How to Detect, Report, and Remove Them',
    titleZh: '假 Google 評論：如何偵測、檢舉和移除',
    priority: 'p3',
    category: 'guides',
    categoryZh: '指南',
    tags: ['fake reviews', 'review removal', 'google policy', 'fraud detection'],
    outline: `Complete guide to handling fake reviews. Cover: Red flags for fake reviews (no photo, no other reviews, generic text, competitor patterns), Google's review policy on fake reviews, step-by-step flagging process, escalation to Google Support, legal options (defamation), FTC guidelines on fake reviews, competitor review bombing detection, review gating legality, tools for monitoring fake review patterns.`,
  },
  {
    slug: 'google-review-policy-guidelines-2026',
    targetQuery: 'google review policy, google review guidelines rules, what google allows reviews',
    title: 'Google Review Policy 2026: What\'s Allowed and What Gets Removed',
    titleZh: '2026 Google 評論政策：什麼被允許、什麼會被刪除',
    priority: 'p3',
    category: 'guides',
    categoryZh: '指南',
    tags: ['google policy', 'review guidelines', 'compliance', 'review rules'],
    outline: `Breakdown of Google's review policies. Cover: Prohibited content types (spam, fake, offensive, conflict of interest, off-topic), what CAN be removed, what CANNOT be removed, review solicitation rules (incentivized reviews), employee review policies, the difference between asking for reviews and incentivizing reviews, review gating (illegal per Google), business owner review rights, appeal process for removed legitimate reviews.`,
  },
  {
    slug: 'review-management-checklist-new-business',
    targetQuery: 'review management checklist, new business reviews setup, review strategy starter',
    title: 'Review Management Checklist: New Business Starter Guide',
    titleZh: '評論管理清單：新商家入門指南',
    priority: 'p3',
    category: 'guides',
    categoryZh: '指南',
    tags: ['checklist', 'new business', 'starter guide', 'review management'],
    outline: `Day-by-day checklist for new businesses. Cover: Week 1 (GBP setup, review link creation, QR code design), Week 2 (first 10 reviews from friends/family ethically, response templates), Week 3-4 (staff training, automation setup), Month 2 (review collection system, monitoring alerts), Month 3 (analytics review, strategy adjustment). Include: printable checklist, timeline, tool recommendations at each stage.`,
  },
  {
    slug: 'customer-feedback-loop-review-strategy',
    targetQuery: 'customer feedback loop, feedback to reviews pipeline, customer satisfaction reviews',
    title: 'The Customer Feedback Loop: Turn Internal Feedback Into Public Reviews',
    titleZh: '客戶回饋循環：將內部回饋轉化為公開評論',
    priority: 'p3',
    category: 'strategies',
    categoryZh: '策略',
    tags: ['customer feedback', 'feedback loop', 'customer satisfaction', 'review pipeline'],
    outline: `Build a feedback-to-review pipeline. Cover: Internal feedback collection (post-service surveys, NPS), routing satisfied customers to Google (the ethical way), addressing dissatisfied customers before they post negative reviews, closing the loop (follow-up after feedback), sentiment-based routing, staff performance feedback integration, continuous improvement from review data, measuring feedback loop effectiveness.`,
  },
  {
    slug: 'review-analytics-sentiment-analysis-guide',
    targetQuery: 'review analytics, review sentiment analysis tools, analyze customer reviews',
    title: 'Review Analytics & Sentiment Analysis: Extract Business Insights',
    titleZh: '評論分析與情緒分析：提取商業洞察',
    priority: 'p3',
    category: 'guides',
    categoryZh: '指南',
    tags: ['analytics', 'sentiment analysis', 'review data', 'business intelligence'],
    outline: `How to extract actionable insights from reviews. Cover: Sentiment analysis basics, keyword extraction from reviews, complaint category classification, trend analysis over time, competitor review benchmarking, star distribution analysis, word cloud visualization, topic modeling, AI-powered review summarization, building dashboards, connecting review data to operational improvements, tools comparison for review analytics.`,
  },
];

// =====================================================
// Prompt Builder
// =====================================================
function buildPrompt(brief: ArticleBrief): { system: string; user: string } {
  const intentMode = getIntentMode(brief.slug, brief.targetQuery);
  const author = selectAuthorPersona(brief.targetQuery);
  const relatedArticles = findRelatedArticles(brief.slug, brief.targetQuery);
  const authorityLinks = selectAuthorityLinks(brief.targetQuery);
  const currentYear = new Date().getFullYear();

  const relatedContext = relatedArticles.length > 0
    ? `\nRELATED ARTICLES ON REPUTATIONMONITOR.AI (link to 3-4 of these naturally within the text):
${relatedArticles.map(a => `- [${a.title}](/blog/${a.slug})`).join('\n')}`
    : '';

  const authorityContext = authorityLinks.length > 0
    ? `\nAUTHORITY EXTERNAL LINKS (embed 2-3 of these naturally):
${authorityLinks.map(l => `- [${l.anchor}](${l.url})`).join('\n')}`
    : '';

  const system = `You are ${author.name}, ${author.title}. ${author.bio}
Write in a ${author.tone} voice.
${INTENT_PROMPTS[intentMode]}
${ANTI_AI_DETECTION_PROMPT}`;

  const user = `Write a long-form article for reputationmonitor.ai about "${brief.targetQuery}".

${CROSS_DOMAIN_CONTEXT}
${relatedContext}
${authorityContext}

LANGUAGE: English (this is the source article; translations happen separately)
CURRENT YEAR: ${currentYear}

OUTPUT FORMAT — You MUST output in this exact order:

${META_START}
Write a clear 150-160 character meta description matching the search intent of "${brief.targetQuery}". Include the primary keyword.
${META_END}

${CONTENT_START}

## ${brief.title}

**Meta Description**: [same as above, will be extracted]

## Introduction

**[Opening sentence with a specific, verifiable statistic about the topic.][^1]**

[2-3 paragraphs setting context. Why this matters for a local business owner RIGHT NOW.]

## Quick Answer: [Direct answer to "${brief.targetQuery}"]

**[Bold 1-sentence answer to the core search query.]**

[2-3 paragraphs expanding the quick answer with specific tools, methods, or data.]

[Then write 3-5 main content sections as ## H2 headings based on this outline:]
${brief.outline}

SECTION RULES:
- Every H2 heading MUST contain a word from "${brief.targetQuery}"
- Each section: 400+ words minimum with specific data, examples, tool names
- Use ### H3 sub-headings within each section (2-3 per section)
- Include one comparison table (markdown) in at least one section
- Naturally link to 3-4 related articles from the RELATED ARTICLES list above
- Include 2-3 authority external links from the list above
- Add footnote references [^1], [^2], etc. for statistics and claims

GEO SUMMARY (AI citation optimization):
After EACH H2 section, add a blockquote summary:
> **Summary:** [60-80 word definitive statement that directly answers the section's core question. Include one specific number. End with a forward-looking insight.]

TOTAL WORD COUNT: 3000-3800 words MINIMUM.
Every section heading must have 3+ substantive paragraphs. Do NOT pad with lists. Write real paragraphs.

## Frequently Asked Questions

Write 5-7 FAQ pairs in this exact format:

**Q: [Question matching a real search query]**

A: [Detailed answer, 3-5 sentences. Include specific names/prices where relevant.]

## References

[Write 5-8 numbered references. Format: N: Source, "Title," Year. One-sentence description. URL]
[Use ONLY real source categories - do NOT invent URLs]
[The references will be replaced post-generation with verified URLs. Focus on making the citation DESCRIPTIONS accurate and relevant.]

\`#${brief.tags.map(t => t.replace(/\s+/g, '')).join(' #')}\`

${CONTENT_END}

${FAQ_START}
Output the FAQ as a JSON array: [{"question": "...", "answer": "..."}]
${FAQ_END}

CRITICAL REMINDERS:
1. NO em dashes. Use commas or parentheses.
2. NO banned words from the anti-AI protocol.
3. Every claim needs a footnote reference [^N].
4. Link to 3-4 existing reputationmonitor.ai articles.
5. Mention Reputation Monitor ONLY if naturally relevant (max 1-2 times).
6. Use specific tool names, data points, and real examples. No vague language.
7. Start directly with ${META_START}. No preamble.`;

  return { system, user };
}

// =====================================================
// Content Generation
// =====================================================
interface GeneratedArticle {
  slug: string;
  title: string;
  titleZh: string;
  metaDescription: string;
  markdown: string;
  faqJson: Array<{ question: string; answer: string }>;
  author: string;
  category: string;
  categoryZh: string;
  tags: string[];
}

async function generateArticle(brief: ArticleBrief): Promise<GeneratedArticle> {
  const { system, user } = buildPrompt(brief);
  const author = selectAuthorPersona(brief.targetQuery);

  console.log(`\n[${'='.repeat(50)}]`);
  console.log(`Generating: ${brief.slug}`);
  console.log(`Priority: ${brief.priority.toUpperCase()} | Category: ${brief.category}`);
  console.log(`Query: ${brief.targetQuery}`);
  console.log(`Author: ${author.name}`);

  const startTime = Date.now();

  const completion = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 8192,
    temperature: 0.5,
  });

  const raw = completion.choices[0]?.message?.content || '';
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const tokens = completion.usage;

  console.log(`Done in ${elapsed}s | Tokens: ${tokens?.prompt_tokens || '?'} in / ${tokens?.completion_tokens || '?'} out`);

  // Parse output
  const metaMatch = raw.match(new RegExp(`\\${META_START}\\s*([\\s\\S]*?)\\s*\\${META_END}`));
  const contentMatch = raw.match(new RegExp(`\\${CONTENT_START}\\s*([\\s\\S]*?)\\s*\\${CONTENT_END}`));
  const faqMatch = raw.match(new RegExp(`\\${FAQ_START}\\s*([\\s\\S]*?)\\s*\\${FAQ_END}`));

  const metaDescription = metaMatch?.[1]?.trim() || '';
  let markdown = contentMatch?.[1]?.trim() || raw;
  let faqJson: Array<{ question: string; answer: string }> = [];

  if (faqMatch) {
    try {
      const faqRaw = faqMatch[1].trim().replace(/```json\n?/g, '').replace(/```/g, '').trim();
      faqJson = JSON.parse(faqRaw);
    } catch {
      console.warn('  Warning: FAQ JSON parse failed');
    }
  }

  // Post-process
  markdown = markdown.replace(/\[VERIFY_\w+:.*?\]/g, '');
  markdown = markdown.replace(/### ### /g, '### ');
  markdown = markdown.replace(/^(## [^\n]+?)\s+(\*\*Meta Description\*\*)/m, '$1\n\n$2');
  markdown = markdown.replace(/([^\n])(## )/g, '$1\n\n$2');
  markdown = markdown.replace(/([^\n])(### )/g, '$1\n\n$2');
  markdown = markdown.replace(/([^\n])(> \*\*Summary)/g, '$1\n\n$2');

  // Word count check
  const wordCount = markdown.split(/\s+/).length;
  console.log(`  Word count: ${wordCount}`);

  if (wordCount < 2500) {
    console.log(`  Warning: Below 2500 word minimum. Running expansion pass...`);
    markdown = await expandArticle(markdown, brief);
  }

  // Validate banned words
  const bannedFound = checkBannedWords(markdown);
  if (bannedFound.length > 0) {
    console.log(`  Cleaning ${bannedFound.length} banned words: ${bannedFound.join(', ')}`);
    markdown = cleanBannedWords(markdown);
  }

  // Replace references
  console.log(`  Replacing references with verified sources...`);
  markdown = ensureVerifiedReferences(markdown, brief.targetQuery);

  // Validate external links
  console.log(`  Validating external links...`);
  markdown = await validateExternalLinks(markdown);

  return {
    slug: brief.slug,
    title: brief.title,
    titleZh: brief.titleZh,
    metaDescription,
    markdown,
    faqJson,
    author: author.name,
    category: brief.category,
    categoryZh: brief.categoryZh,
    tags: brief.tags,
  };
}

// =====================================================
// Expansion Pass
// =====================================================
async function expandArticle(markdown: string, brief: ArticleBrief): Promise<string> {
  const sections = markdown.split(/(?=^## )/m).filter(s => s.trim());
  const thinnest = sections
    .filter(s => !/Key Takeaway|Table of Content|Quick Answer|FAQ|Reference/i.test(s.split('\n')[0]))
    .sort((a, b) => a.split(/\s+/).length - b.split(/\s+/).length)
    .slice(0, 2);

  if (thinnest.length === 0) return markdown;

  const author = selectAuthorPersona(brief.targetQuery);
  const deficit = 3000 - markdown.split(/\s+/).length;

  const expansion = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: `You are ${author.name}, ${author.title}. Write about review management and local SEO. No filler words. Specific data, tools, and examples.` },
      {
        role: 'user', content: `Expand these 2 sections by adding ${Math.ceil(deficit / 2)} more words each. Add specific tool names, data points, and practical tips.

${thinnest.map((s, i) => `SECTION ${i + 1}:\n${s.substring(0, 600)}...`).join('\n\n---\n\n')}

Output the expanded sections separated by [SECTION_BREAK]. Keep the ## heading.`,
      },
    ],
    max_tokens: 4096,
    temperature: 0.5,
  });

  const expanded = expansion.choices[0]?.message?.content || '';
  if (expanded.length < 200) return markdown;

  const parts = expanded.split('[SECTION_BREAK]').map(s => s.trim()).filter(Boolean);
  let result = markdown;

  for (let i = 0; i < Math.min(parts.length, thinnest.length); i++) {
    let exp = parts[i];
    if (!exp.startsWith('##')) exp = thinnest[i].split('\n')[0] + '\n\n' + exp;
    result = result.replace(thinnest[i], exp);
  }

  console.log(`  Expanded: ${markdown.split(/\s+/).length} -> ${result.split(/\s+/).length} words`);
  return result;
}

// =====================================================
// Banned Word Detection & Cleanup
// =====================================================
const BANNED_WORDS = new Set([
  'delve', 'leverage', 'utilize', 'facilitate', 'foster', 'bolster', 'underscore',
  'unveil', 'navigate', 'streamline', 'endeavour', 'ascertain', 'elucidate',
  'robust', 'comprehensive', 'pivotal', 'crucial', 'vital', 'transformative',
  'cutting-edge', 'groundbreaking', 'innovative', 'seamless', 'intricate',
  'nuanced', 'multifaceted', 'holistic', 'furthermore', 'moreover',
  'notwithstanding', 'absolutely', 'basically', 'certainly', 'clearly',
  'definitely', 'essentially', 'extremely', 'fundamentally', 'incredibly',
  'interestingly', 'naturally', 'obviously', 'quite', 'really', 'significantly',
  'simply', 'surely', 'truly', 'ultimately', 'undoubtedly', 'very',
]);

const BANNED_REPLACEMENTS: Record<string, string> = {
  delve: 'explore', leverage: 'use', utilize: 'use', facilitate: 'help',
  foster: 'encourage', bolster: 'strengthen', robust: 'strong',
  comprehensive: 'complete', pivotal: 'key', crucial: 'important',
  vital: 'important', seamless: 'smooth', innovative: 'new',
  furthermore: '', moreover: '', notwithstanding: 'despite',
  basically: '', certainly: '', clearly: '', definitely: '',
  essentially: '', extremely: '', fundamentally: '', incredibly: '',
  obviously: '', quite: '', really: '', significantly: '',
  simply: '', surely: '', truly: '', ultimately: '', undoubtedly: '',
  very: '',
};

function checkBannedWords(text: string): string[] {
  const found: string[] = [];
  const words = text.toLowerCase().split(/\s+/);
  for (const w of words) {
    const clean = w.replace(/[^a-z-]/g, '');
    if (BANNED_WORDS.has(clean)) found.push(clean);
  }
  return [...new Set(found)];
}

function cleanBannedWords(text: string): string {
  let result = text;
  result = result.replace(/\s*—\s*/g, ', ');

  for (const [banned, replacement] of Object.entries(BANNED_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${banned}\\b`, 'gi');
    result = result.replace(regex, replacement);
  }
  result = result.replace(/\s{2,}/g, ' ');
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/\.\s*,/g, '.');
  return result;
}

// =====================================================
// File Output
// =====================================================
function saveArticle(article: GeneratedArticle): string {
  const outputDir = path.resolve(__dirname, 'output', article.slug);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'document.md'), article.markdown, 'utf-8');

  if (article.faqJson.length > 0) {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: article.faqJson.map(q => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: { '@type': 'Answer', text: q.answer },
      })),
    };
    fs.writeFileSync(path.join(outputDir, 'faq-schema.json'), JSON.stringify(faqSchema, null, 2), 'utf-8');
  }

  const briefData = ARTICLE_BRIEFS.find(b => b.slug === article.slug);
  fs.writeFileSync(path.join(outputDir, 'brief.json'), JSON.stringify({
    slug: article.slug,
    title: article.title,
    titleZh: article.titleZh,
    targetQuery: briefData?.targetQuery,
    priority: briefData?.priority,
    category: article.category,
    tags: article.tags,
    metaDescription: article.metaDescription,
    author: article.author,
    generatedAt: new Date().toISOString(),
    model: 'deepseek-chat-v3',
  }, null, 2), 'utf-8');

  console.log(`  Saved to: ${outputDir}`);
  return outputDir;
}

// =====================================================
// Main
// =====================================================
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchArg = args.includes('--batch') ? args[args.indexOf('--batch') + 1] : null;
  const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

  let briefs = [...ARTICLE_BRIEFS];

  if (slugArg) {
    briefs = briefs.filter(b => b.slug === slugArg);
    if (briefs.length === 0) {
      console.error(`No article brief found for slug: ${slugArg}`);
      console.error('Available slugs:');
      ARTICLE_BRIEFS.forEach(b => console.error(`  ${b.priority}: ${b.slug}`));
      process.exit(1);
    }
  } else if (batchArg) {
    briefs = briefs.filter(b => b.priority === batchArg.toLowerCase());
    if (briefs.length === 0) {
      console.error(`No articles in batch: ${batchArg}`);
      process.exit(1);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Reputation Monitor Article Generator (DeepSeek V3)`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Articles to generate: ${briefs.length}`);
  console.log(`Estimated cost: ~$${(briefs.length * 0.004).toFixed(3)}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'GENERATE'}`);
  console.log();

  if (dryRun) {
    for (const brief of briefs) {
      const intentMode = getIntentMode(brief.slug, brief.targetQuery);
      const author = selectAuthorPersona(brief.targetQuery);
      const related = findRelatedArticles(brief.slug, brief.targetQuery);

      console.log(`[${brief.priority.toUpperCase()}] ${brief.slug}`);
      console.log(`  Title: ${brief.title}`);
      console.log(`  Query: ${brief.targetQuery}`);
      console.log(`  Intent: ${intentMode} | Author: ${author.name}`);
      console.log(`  Related: ${related.map(r => r.slug).join(', ') || '(none)'}`);
      console.log();
    }
    return;
  }

  const results: GeneratedArticle[] = [];

  for (let i = 0; i < briefs.length; i++) {
    const brief = briefs[i];
    console.log(`\n[${i + 1}/${briefs.length}] Generating ${brief.slug}...`);

    try {
      const article = await generateArticle(brief);
      saveArticle(article);
      results.push(article);

      if (i < briefs.length - 1) {
        console.log(`  Cooling down 3s...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: ${errMsg}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`GENERATION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Generated: ${results.length}/${briefs.length}`);
  console.log(`Estimated cost: ~$${(results.length * 0.004).toFixed(3)}`);
  console.log(`Output: scripts/output/`);

  if (results.length > 0) {
    console.log(`\nNext steps:`);
    console.log(`  1. Review: scripts/output/{slug}/document.md`);
    console.log(`  2. Generate images: npx tsx scripts/generate-article-images.ts`);
    console.log(`  3. Convert to BlogPost: npx tsx scripts/generate-articles.ts --convert`);
  }
}

main().catch(console.error);
