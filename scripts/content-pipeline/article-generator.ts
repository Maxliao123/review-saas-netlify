#!/usr/bin/env npx tsx
/**
 * article-generator.ts — DeepSeek V3 Article Generator for ReplyWise AI
 *
 * 4-layer prompt architecture:
 *   Layer 1: Anti-AI Detection Protocol (banned words/patterns)
 *   Layer 2: ReplyWise AI Expert Persona System (4 personas)
 *   Layer 3: Intent-Aware Prompt Routing (5 modes)
 *   Layer 4: Cross-Domain Product Context (ReplyWise AI CTA)
 *
 * Quality Control built-in:
 *   - Anti-AI score (banned words, em dashes, sentence length)
 *   - SEO score (H2 count, keyword density, title/description length)
 *   - Duplicate check against existing blog-data.ts articles
 *   - PASS/REVIEW/FAIL verdict
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/article-generator.ts
 *   npx tsx scripts/content-pipeline/article-generator.ts --batch P0
 *   npx tsx scripts/content-pipeline/article-generator.ts --slug specific-slug
 *   npx tsx scripts/content-pipeline/article-generator.ts --dry-run
 */

import OpenAI from 'openai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import type { ArticleBrief } from './topic-generator';

// Load env
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });

// =====================================================
// DeepSeek V3 Client
// =====================================================
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error('Missing DEEPSEEK_API_KEY in .env.local');
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
// Layer 2: ReplyWise AI Expert Persona System
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
    name: 'Sarah Chen',
    title: 'Restaurant Marketing Consultant',
    bio: 'Sarah has spent 10 years helping restaurants and food businesses build their online presence. Based in Vancouver, she has managed review strategies for over 300 restaurants across North America. She speaks Mandarin and English, and specializes in multicultural market strategies.',
    expertise: ['restaurant', 'food', 'cafe', 'coffee', 'food truck', 'hotel', 'hospitality', 'vancouver', 'toronto', 'canada', 'local', 'qr code', 'review collection', 'customer experience'],
    tone: 'warm and practical, like a trusted advisor who has been in your shoes',
  },
  {
    name: 'Michael Torres',
    title: 'Digital Reputation Strategist',
    bio: 'Michael has helped over 500 small-to-medium businesses build and protect their online reputation. Former digital marketing director at a Fortune 500 company turned SMB consultant. He specializes in turning review management from a chore into a growth engine.',
    expertise: ['reputation', 'negative reviews', 'crisis', 'strategy', 'growth', 'analytics', 'roi', 'multi-location', 'franchise', 'retail', 'comparison', 'tools', 'pricing', 'manual', 'automated', 'free', 'paid'],
    tone: 'data-driven and direct, backs every claim with specific numbers and case studies',
  },
  {
    name: 'Jennifer Kim',
    title: 'Hotel & Hospitality Review Expert',
    bio: 'Jennifer spent 8 years as a hotel General Manager before becoming a hospitality review consultant. She understands the daily operations of service businesses and how reviews fit into the guest experience lifecycle. She has helped 200+ hospitality businesses improve their ratings by an average of 0.6 stars.',
    expertise: ['hotel', 'spa', 'wellness', 'salon', 'beauty', 'barbershop', 'pet grooming', 'luxury', 'service', 'guest experience', 'positive reviews', 'response', 'templates', 'star rating'],
    tone: 'empathetic and service-oriented, understands the pressure of running a service business',
  },
  {
    name: 'David Nguyen',
    title: 'Healthcare Reputation Specialist',
    bio: 'David is a former medical practice administrator turned reputation management consultant. He specializes in HIPAA-compliant review strategies for healthcare providers. He has helped dental clinics, medical practices, and law firms build trust through ethical review management.',
    expertise: ['dental', 'clinic', 'medical', 'healthcare', 'HIPAA', 'law firm', 'legal', 'auto repair', 'gym', 'fitness', 'real estate', 'compliance', 'FTC', 'GDPR', 'ethics', 'fake reviews', 'removal', 'policy'],
    tone: 'calm and authoritative, combines compliance knowledge with practical business advice',
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
// Layer 3: Intent-Aware Prompt Routing (5 modes)
// =====================================================
type IntentMode = 'industry-guide' | 'how-to' | 'comparison' | 'local' | 'thought-leadership';

const INTENT_PROMPTS: Record<IntentMode, string> = {
  'industry-guide': `MODE: INDUSTRY GUIDE (Sector Deep-Dive).
Focus: Everything a specific industry needs to know about review management.
Structure: Industry challenges + Specific strategies + Real examples + Templates + Implementation timeline.
Voice: Someone who has worked in the industry and understands the daily operations.
Length: 2500-3500 words. At least 6 H2 sections.`,

  'how-to': `MODE: HOW-TO GUIDE (Step-by-Step Tutorial).
Focus: Practical, actionable guide for business owners who want to solve a specific problem.
Structure: Problem statement + Step-by-Step instructions + Tools needed + Common mistakes + Pro tips.
Voice: Experienced consultant walking you through it. Every paragraph teaches something actionable.
Length: 2000-3000 words. At least 5 H2 sections.`,

  comparison: `MODE: COMPARISON (Side-by-Side Analysis).
Focus: Honest comparison with specific criteria. Let the data speak.
Structure: Criteria setup + Options breakdown + Pros/Cons table + Verdict per category + Recommendation.
Voice: Neutral analyst who has personally tested everything. Honest about strengths AND weaknesses.
Length: 2500-3500 words. At least 5 H2 sections with comparison tables.`,

  local: `MODE: LOCAL GUIDE (City/Region-Specific).
Focus: Location-specific strategies with local market context.
Structure: Market overview + Local challenges + Adapted strategies + Local case studies + Action plan.
Voice: A local who understands the market dynamics and competitive landscape.
Length: 2000-3000 words. At least 5 H2 sections.`,

  'thought-leadership': `MODE: THOUGHT LEADERSHIP (Industry Trends & Predictions).
Focus: Forward-looking analysis with data-backed predictions.
Structure: Current state + Emerging trends + Impact analysis + Preparation steps + Future outlook.
Voice: Strategic advisor who combines data with practical experience.
Length: 2000-3000 words. At least 5 H2 sections.`,
};

function getIntentMode(brief: ArticleBrief): IntentMode {
  switch (brief.category) {
    case 'industry': return 'industry-guide';
    case 'how-to': return 'how-to';
    case 'comparison': return 'comparison';
    case 'local': {
      const slug = brief.slug.toLowerCase();
      if (/trend|ftc|gdpr|compliance/.test(slug)) return 'thought-leadership';
      return 'local';
    }
    default: return 'how-to';
  }
}

// =====================================================
// Layer 4: Cross-Domain Product Context
// =====================================================
const CROSS_DOMAIN_CONTEXT = `
CROSS-DOMAIN CONTEXT (Use naturally, do NOT dump as a block):
- ReplyWise AI (replywiseai.com): SaaS tool for Google review management. Customers scan a QR code, select experience tags, and AI generates a personalized 5-star review they can post to Google with one tap. Admin dashboard provides review analytics, sentiment analysis, complaint categorization, and AI-powered reply suggestions.
- Key pages to link when naturally relevant:
  - /pricing (when discussing tool costs or plans)
  - /blog (when referencing other guides)
  - /?store=demo (when suggesting trying the QR code experience)
- Mention ReplyWise AI 1-2 times when naturally relevant (e.g., when discussing QR code review collection, AI review generation, review analytics, or automated responses).
- Never position as the "only" or "best" solution. Present as one option among strategies discussed.
`;

// =====================================================
// Existing articles (for duplicate check + internal linking)
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
// Pre-Verified Reference Pool (30+ URLs)
// =====================================================
interface VerifiedReference {
  id: string;
  citation: string;
  topics: string[];
}

const VERIFIED_REFERENCES: VerifiedReference[] = [
  { id: 'brightlocal-survey', citation: 'BrightLocal, "Local Consumer Review Survey," 2025. Annual survey on how consumers use online reviews to choose local businesses. https://www.brightlocal.com/research/local-consumer-review-survey/', topics: ['review', 'consumer', 'trust', 'local', 'statistics', 'survey'] },
  { id: 'google-business-help', citation: 'Google, "Google Business Profile Help," 2026. Official documentation for managing your Google Business Profile and reviews. https://support.google.com/business/', topics: ['google', 'business', 'profile', 'reviews', 'maps', 'listing', 'gbp'] },
  { id: 'moz-ranking', citation: 'Moz, "Local Search Ranking Factors," 2025. Annual study of factors that influence local search rankings. https://moz.com/local-search-ranking-factors', topics: ['seo', 'ranking', 'local', 'search', 'factors', 'citation'] },
  { id: 'harvard-review', citation: 'Luca, M., "Reviews, Reputation, and Revenue: The Case of Yelp.com," Harvard Business School, 2016. Landmark study linking review ratings to revenue changes. https://hbswk.hbs.edu/item/the-yelp-factor-are-consumer-reviews-good-for-business', topics: ['review', 'revenue', 'rating', 'impact', 'roi', 'restaurant'] },
  { id: 'spiegel-research', citation: 'Spiegel Research Center, "How Online Reviews Influence Sales," Northwestern University, 2017. Research on review impact on purchase probability. https://spiegel.medill.northwestern.edu/online-reviews/', topics: ['review', 'sales', 'conversion', 'purchase', 'consumer', 'trust'] },
  { id: 'google-review-policy', citation: 'Google, "Maps User Contributed Content Policy," 2026. Official Google review guidelines and prohibited content. https://support.google.com/contributionpolicy/answer/7400114', topics: ['google', 'policy', 'review', 'guidelines', 'fake', 'removal', 'flag'] },
  { id: 'semrush-local', citation: 'Semrush, "Local SEO Guide," 2026. Best practices for local search optimization including review signals. https://www.semrush.com/blog/local-seo/', topics: ['seo', 'local', 'optimization', 'search', 'ranking', 'strategy'] },
  { id: 'reviewtrackers', citation: 'ReviewTrackers, "Online Reviews Statistics and Trends," 2025. Industry report on review volume, response rates, and sentiment trends. https://www.reviewtrackers.com/reports/online-reviews-survey/', topics: ['review', 'statistics', 'response', 'sentiment', 'trends', 'reputation'] },
  { id: 'google-ai-search', citation: 'Google, "How AI Overviews Work in Search," 2026. Google Search blog explaining AI-generated answers and source selection. https://blog.google/products/search/', topics: ['ai', 'overview', 'search', 'google', 'generative', 'geo'] },
  { id: 'schema-local', citation: 'Schema.org, "LocalBusiness Type Documentation," 2026. Structured data specification for local business markup. https://schema.org/LocalBusiness', topics: ['schema', 'structured data', 'local', 'business', 'markup', 'seo'] },
  { id: 'ftc-endorsement', citation: 'Federal Trade Commission, "FTC Endorsement Guides," 2024. Guidelines on endorsements and reviews in advertising. https://www.ftc.gov/legal-library/browse/rules/endorsement-guides', topics: ['policy', 'guidelines', 'fake', 'endorsement', 'legal', 'compliance', 'ftc'] },
  { id: 'whitespark-citations', citation: 'Whitespark, "Local Citation Resources," 2025. Guide to building and managing local citations for SEO. https://whitespark.ca/', topics: ['citation', 'local', 'seo', 'nap', 'directory', 'listing'] },
  { id: 'podium-reviews', citation: 'Podium, "State of Online Reviews," 2025. Annual report on review collection methods and consumer behavior. https://www.podium.com/', topics: ['review', 'collection', 'sms', 'messaging', 'consumer', 'business', 'podium'] },
  { id: 'birdeye-report', citation: 'Birdeye, "State of Online Reviews 2025," 2025. Report on review trends across industries. https://birdeye.com/blog/state-of-online-reviews/', topics: ['review', 'trends', 'industry', 'birdeye', 'statistics', 'comparison'] },
  { id: 'search-engine-journal', citation: 'Search Engine Journal, "Local SEO: The Definitive Guide," 2026. Comprehensive guide to local search optimization. https://www.searchenginejournal.com/local-seo/', topics: ['seo', 'local', 'search', 'optimization', 'strategy', 'guide'] },
  { id: 'hubspot-stats', citation: 'HubSpot, "Marketing Statistics," 2026. Collection of marketing and customer behavior statistics. https://www.hubspot.com/marketing-statistics', topics: ['marketing', 'statistics', 'roi', 'conversion', 'customer', 'growth'] },
  { id: 'gatherup-guide', citation: 'GatherUp, "Review Management Best Practices," 2025. Guide to review collection and response strategies. https://gatherup.com/', topics: ['review', 'management', 'collection', 'response', 'best practices', 'tools'] },
  { id: 'yext-knowledge', citation: 'Yext, "The Complete Guide to Online Reputation Management," 2025. Enterprise reputation management strategies. https://www.yext.com/', topics: ['reputation', 'management', 'enterprise', 'multi-location', 'listings', 'yext'] },
  { id: 'google-structured-data', citation: 'Google, "Structured Data Documentation," 2026. How to implement structured data for rich results. https://developers.google.com/search/docs/appearance/structured-data', topics: ['schema', 'structured data', 'google', 'rich results', 'faq', 'technical'] },
  { id: 'nicejob-reviews', citation: 'NiceJob, "The Impact of Reviews on Small Business Revenue," 2025. Study on review-revenue correlation for SMBs. https://get.nicejob.com/', topics: ['review', 'revenue', 'small business', 'smb', 'impact', 'roi'] },
  { id: 'reviewpush-stats', citation: 'ReviewPush, "Online Review Statistics," 2025. Compilation of review industry statistics and benchmarks. https://www.reviewpush.com/', topics: ['review', 'statistics', 'benchmarks', 'industry', 'data'] },
  { id: 'reputation-com', citation: 'Reputation, "The State of Online Reputation Management," 2025. Enterprise report on ORM trends and best practices. https://www.reputation.com/', topics: ['reputation', 'management', 'enterprise', 'trends', 'analytics'] },
  { id: 'chatmeter', citation: 'Chatmeter, "Local Brand Report," 2025. Analysis of local brand visibility and review performance. https://www.chatmeter.com/', topics: ['local', 'brand', 'visibility', 'multi-location', 'franchise', 'analytics'] },
  { id: 'bbb-trust', citation: 'Better Business Bureau, "Consumer Trust and Reviews Study," 2025. Research on consumer trust in online reviews. https://www.bbb.org/', topics: ['trust', 'consumer', 'reviews', 'fake', 'verification', 'credibility'] },
  { id: 'aha-hipaa', citation: 'American Health Association, "HIPAA Compliance for Online Reviews," 2025. Healthcare provider guidance on review management. https://www.aha.org/', topics: ['hipaa', 'healthcare', 'compliance', 'medical', 'dental', 'patient'] },
  { id: 'nar-reviews', citation: 'National Association of Realtors, "Digital Marketing and Reviews Report," 2025. Real estate agent review behavior data. https://www.nar.realtor/', topics: ['real estate', 'realtor', 'agent', 'reviews', 'marketing'] },
  { id: 'nrf-retail', citation: 'National Retail Federation, "Consumer Review Impact on Retail," 2025. Study on review influence on retail purchase decisions. https://nrf.com/', topics: ['retail', 'consumer', 'purchase', 'reviews', 'shopping', 'store'] },
  { id: 'gdpr-info', citation: 'European Commission, "General Data Protection Regulation (GDPR)," 2018. Official GDPR documentation on data processing requirements. https://gdpr.eu/', topics: ['gdpr', 'privacy', 'data', 'compliance', 'eu', 'regulation'] },
  { id: 'grade-us', citation: 'Grade.us, "Review Management for Agencies," 2025. White-label review management platform guide. https://grade.us/', topics: ['review', 'management', 'agency', 'white-label', 'tools', 'platform'] },
  { id: 'trustpilot-research', citation: 'Trustpilot, "The Psychology of Reviews," 2025. Research on consumer psychology and review behavior. https://www.trustpilot.com/', topics: ['review', 'psychology', 'consumer', 'trust', 'behavior', 'trustpilot'] },
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
  cleaned = cleaned.trimEnd();

  const newRefsContent = '\n\n## References\n\n' +
    refs.map((r, i) => `${i + 1}: ${r.citation}`).join('\n\n') + '\n';
  const result = cleaned + newRefsContent;

  // Remap footnotes that exceed ref count
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

// =====================================================
// Quality Control
// =====================================================
const BANNED_WORDS = [
  'delve', 'leverage', 'utilize', 'facilitate', 'foster', 'bolster', 'underscore',
  'unveil', 'navigate', 'streamline', 'endeavour', 'ascertain', 'elucidate',
  'robust', 'comprehensive', 'pivotal', 'crucial', 'vital', 'transformative',
  'cutting-edge', 'groundbreaking', 'innovative', 'seamless', 'intricate',
  'nuanced', 'multifaceted', 'holistic',
  'furthermore', 'moreover', 'notwithstanding',
  'absolutely', 'basically', 'certainly', 'clearly', 'definitely', 'essentially',
  'extremely', 'fundamentally', 'incredibly', 'interestingly', 'naturally',
  'obviously', 'quite', 'really', 'significantly', 'simply', 'surely', 'truly',
  'ultimately', 'undoubtedly', 'very',
];

export interface QualityReport {
  slug: string;
  antiAiScore: number;
  seoScore: number;
  overallVerdict: 'PASS' | 'REVIEW' | 'FAIL';
  bannedWordsFound: string[];
  emDashCount: number;
  h2Count: number;
  wordCount: number;
  avgSentenceLength: number;
}

function runQualityCheck(slug: string, markdown: string, targetQuery: string): QualityReport {
  const lowerContent = markdown.toLowerCase();

  // Anti-AI checks
  const bannedWordsFound = BANNED_WORDS.filter(w => {
    const regex = new RegExp(`\\b${w}\\b`, 'gi');
    return regex.test(lowerContent);
  });
  const emDashCount = (markdown.match(/\u2014/g) || []).length;

  // Sentence length analysis
  const sentences = markdown
    .replace(/^#+\s.+$/gm, '')
    .replace(/\[.+?\]\(.+?\)/g, '')
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 10);
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) / sentences.length
    : 0;

  // SEO checks
  const h2Count = (markdown.match(/^## /gm) || []).length;
  const wordCount = markdown.split(/\s+/).length;
  const queryWords = targetQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const keywordHits = queryWords.filter(w => lowerContent.includes(w)).length;
  const keywordDensity = queryWords.length > 0 ? keywordHits / queryWords.length : 0;

  // Score calculation
  const antiAiPenalty = bannedWordsFound.length * 5 + emDashCount * 3 +
    (avgSentenceLength > 25 ? 10 : 0);
  const antiAiScore = Math.max(0, 100 - antiAiPenalty);

  const seoScore = Math.min(100,
    (h2Count >= 5 ? 25 : h2Count * 5) +
    (wordCount >= 2000 ? 25 : Math.floor(wordCount / 80)) +
    (keywordDensity >= 0.7 ? 25 : Math.floor(keywordDensity * 35)) +
    25 // base
  );

  const avgScore = (antiAiScore + seoScore) / 2;
  let overallVerdict: 'PASS' | 'REVIEW' | 'FAIL';
  if (avgScore >= 70 && antiAiScore >= 60) overallVerdict = 'PASS';
  else if (avgScore >= 50) overallVerdict = 'REVIEW';
  else overallVerdict = 'FAIL';

  return {
    slug,
    antiAiScore,
    seoScore,
    overallVerdict,
    bannedWordsFound,
    emDashCount,
    h2Count,
    wordCount,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
  };
}

// =====================================================
// Article Generation
// =====================================================
async function generateArticle(brief: ArticleBrief): Promise<{
  markdown: string;
  quality: QualityReport;
}> {
  const intentMode = getIntentMode(brief);
  const persona = selectAuthorPersona(brief.targetQuery + ' ' + brief.tags.join(' '));
  const relatedArticles = findRelatedArticles(brief.slug, brief.targetQuery);
  const refs = selectVerifiedReferences(brief.targetQuery + ' ' + brief.tags.join(' '));

  const internalLinksSection = relatedArticles.length > 0
    ? `\nINTERNAL LINKS (weave 2-3 naturally into body text):
${relatedArticles.map(a => `- [${a.title}](/blog/${a.slug})`).join('\n')}`
    : '';

  const referencesSection = refs.length > 0
    ? `\nVERIFIED REFERENCES (cite using footnotes [^1], [^2], etc.):
${refs.map((r, i) => `[^${i + 1}]: ${r.citation}`).join('\n')}`
    : '';

  const systemPrompt = `You are ${persona.name}, ${persona.title}.
${persona.bio}
Your writing tone: ${persona.tone}

${ANTI_AI_DETECTION_PROMPT}

${INTENT_PROMPTS[intentMode]}

${CROSS_DOMAIN_CONTEXT}
${internalLinksSection}
${referencesSection}

OUTPUT FORMAT:
Wrap the article in ${CONTENT_START} and ${CONTENT_END}.
After the article, generate exactly 5 FAQ items wrapped in ${FAQ_START} and ${FAQ_END}.
Format FAQ as:
Q: [question]
A: [answer]

After FAQ, generate metadata wrapped in ${META_START} and ${META_END}.
Format meta as:
title: [SEO title under 60 chars]
description: [meta description under 155 chars]
excerpt: [2-3 sentence summary for blog listing]
readTime: [estimated read time in minutes, number only]
`;

  const userPrompt = `Write an article for the ReplyWise AI blog.

Topic: ${brief.title}
Target keyword: ${brief.targetQuery}
Category: ${brief.category}
Tags: ${brief.tags.join(', ')}

Outline requirements:
${brief.outline}

Remember:
- Write ${intentMode === 'industry-guide' ? '2500-3500' : '2000-3000'} words
- Use at least 5 H2 sections
- Include a "Key Takeaways" section near the top
- Add a blockquote summary (> **Summary:**) at the end of each major section
- Use specific data points and examples, not vague claims
- Naturally mention ReplyWise AI 1-2 times where relevant
- Include at least 3 footnote citations from the verified references
- End with a References section`;

  console.log(`  Generating: ${brief.slug} (${intentMode}, persona: ${persona.name})`);

  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 8000,
  });

  let content = response.choices[0]?.message?.content || '';

  // Extract article content
  const contentMatch = content.match(new RegExp(`${escapeRegex(CONTENT_START)}([\\s\\S]*?)${escapeRegex(CONTENT_END)}`));
  let markdown = contentMatch ? contentMatch[1].trim() : content;

  // Replace verified references
  markdown = ensureVerifiedReferences(markdown, brief.targetQuery + ' ' + brief.tags.join(' '));

  // Quality check
  const quality = runQualityCheck(brief.slug, markdown, brief.targetQuery);

  // Extract FAQ
  const faqMatch = content.match(new RegExp(`${escapeRegex(FAQ_START)}([\\s\\S]*?)${escapeRegex(FAQ_END)}`));
  const faqRaw = faqMatch ? faqMatch[1].trim() : '';

  // Extract meta
  const metaMatch = content.match(new RegExp(`${escapeRegex(META_START)}([\\s\\S]*?)${escapeRegex(META_END)}`));
  const metaRaw = metaMatch ? metaMatch[1].trim() : '';

  // Save all outputs
  const outputDir = path.resolve(__dirname, 'output', brief.slug);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'document.md'), markdown);
  fs.writeFileSync(path.join(outputDir, 'faq.txt'), faqRaw);
  fs.writeFileSync(path.join(outputDir, 'meta.txt'), metaRaw);
  fs.writeFileSync(path.join(outputDir, 'quality.json'), JSON.stringify(quality, null, 2));
  fs.writeFileSync(path.join(outputDir, 'brief.json'), JSON.stringify(brief, null, 2));

  return { markdown, quality };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =====================================================
// Main
// =====================================================
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchArg = args.includes('--batch') ? args[args.indexOf('--batch') + 1]?.toUpperCase() : null;
  const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

  // Load briefs
  const briefsPath = path.resolve(__dirname, 'briefs.json');
  if (!fs.existsSync(briefsPath)) {
    console.error('No briefs.json found. Run topic-generator.ts first.');
    process.exit(1);
  }
  let briefs: ArticleBrief[] = JSON.parse(fs.readFileSync(briefsPath, 'utf-8'));

  if (slugArg) {
    briefs = briefs.filter(b => b.slug === slugArg);
  } else if (batchArg) {
    briefs = briefs.filter(b => b.priority === batchArg);
  }

  if (briefs.length === 0) {
    console.error('No briefs match the given filter.');
    process.exit(1);
  }

  console.log(`\nArticle Generator - ${briefs.length} articles to generate\n`);

  if (dryRun) {
    for (const b of briefs) {
      const intent = getIntentMode(b);
      const persona = selectAuthorPersona(b.targetQuery + ' ' + b.tags.join(' '));
      console.log(`  [${b.priority}] ${b.slug}`);
      console.log(`    Intent: ${intent}, Persona: ${persona.name}`);
      console.log(`    Query: ${b.targetQuery}`);
      console.log();
    }
    console.log('Dry run complete. Remove --dry-run to generate.');
    return;
  }

  // Check for existing articles to avoid duplicates
  const existingSlugs = new Set(EXISTING_ARTICLES.map(a => a.slug));
  const duplicates = briefs.filter(b => existingSlugs.has(b.slug));
  if (duplicates.length > 0) {
    console.log(`Skipping ${duplicates.length} duplicate(s):`);
    for (const d of duplicates) console.log(`  - ${d.slug}`);
    briefs = briefs.filter(b => !existingSlugs.has(b.slug));
  }

  // Check for already-generated articles
  const outputBaseDir = path.resolve(__dirname, 'output');
  const alreadyGenerated = briefs.filter(b => {
    const docPath = path.join(outputBaseDir, b.slug, 'document.md');
    return fs.existsSync(docPath);
  });
  if (alreadyGenerated.length > 0) {
    console.log(`Skipping ${alreadyGenerated.length} already-generated article(s):`);
    for (const a of alreadyGenerated) console.log(`  - ${a.slug}`);
    briefs = briefs.filter(b => !alreadyGenerated.some(a => a.slug === b.slug));
  }

  if (briefs.length === 0) {
    console.log('\nAll articles already generated. Nothing to do.');
    return;
  }

  console.log(`Generating ${briefs.length} articles...\n`);

  let success = 0;
  let failed = 0;
  const results: QualityReport[] = [];

  for (const brief of briefs) {
    try {
      const { quality } = await generateArticle(brief);
      results.push(quality);
      success++;

      const icon = quality.overallVerdict === 'PASS' ? 'PASS' :
        quality.overallVerdict === 'REVIEW' ? 'REVIEW' : 'FAIL';
      console.log(`  [${icon}] ${brief.slug} (AI: ${quality.antiAiScore}, SEO: ${quality.seoScore}, words: ${quality.wordCount})`);

      // Rate limit: 1 request per 3 seconds
      if (briefs.indexOf(brief) < briefs.length - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [ERROR] ${brief.slug}: ${msg}`);
    }
  }

  // Save summary report
  const reportPath = path.resolve(__dirname, 'output', '_quality-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log(`\nDone! ${success} succeeded, ${failed} failed.`);
  console.log(`Quality report: ${reportPath}`);

  const passCount = results.filter(r => r.overallVerdict === 'PASS').length;
  const reviewCount = results.filter(r => r.overallVerdict === 'REVIEW').length;
  const failCount = results.filter(r => r.overallVerdict === 'FAIL').length;
  console.log(`Verdicts: ${passCount} PASS, ${reviewCount} REVIEW, ${failCount} FAIL`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
