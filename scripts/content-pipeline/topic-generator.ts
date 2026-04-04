#!/usr/bin/env npx tsx
/**
 * topic-generator.ts — Generate 50 SEO article briefs for ReplyWise AI
 *
 * Intent-User Matrix organized into 4 clusters:
 *   A: Industry Guides (15)
 *   B: How-to Guides (15)
 *   C: Comparison & Best-of (10)
 *   D: City/Local & Trends (10)
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/topic-generator.ts
 *   npx tsx scripts/content-pipeline/topic-generator.ts --batch P0
 *   npx tsx scripts/content-pipeline/topic-generator.ts --category industry
 *
 * Output: scripts/content-pipeline/briefs.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ArticleBrief {
  slug: string;
  title: string;
  titleZh: string;
  targetQuery: string;
  outline: string;
  priority: 'P0' | 'P1' | 'P2';
  category: 'industry' | 'how-to' | 'comparison' | 'local';
  tags: string[];
}

// GSC-derived brief (from gsc-analyze.ts output)
interface GscBrief {
  slug: string;
  target_keyword: string;
  related_queries: string[];
  total_impressions: number;
  total_clicks: number;
  avg_position: number;
  intent_type: string;
  priority: 'P0' | 'P1' | 'P2';
}

// ── Cluster A: Industry Guides (15 articles) ───────────────────────────────

const INDUSTRY_GUIDES: ArticleBrief[] = [
  {
    slug: 'google-review-management-restaurants-complete-guide',
    title: 'Google Review Management for Restaurants: Complete Guide',
    titleZh: '餐廳 Google 評論管理完全指南',
    targetQuery: 'google review management for restaurants complete guide',
    outline: 'Cover: table tent QR codes, post-payment timing, server training scripts, Google review link on receipts, WiFi landing page, delivery bag inserts, handling food criticism, menu-specific keyword encouragement, photos in reviews strategy. Include 90-day implementation timeline.',
    priority: 'P0',
    category: 'industry',
    tags: ['restaurant', 'google reviews', 'review management', 'food service', 'local business'],
  },
  {
    slug: 'how-to-get-more-google-reviews-hotels',
    title: 'How to Get More Google Reviews for Hotels',
    titleZh: '飯店如何獲得更多 Google 評論',
    targetQuery: 'how to get more google reviews for hotels',
    outline: 'Cover: check-out review request timing, in-room QR codes, post-stay email sequences, front desk scripts, handling OTA reviews vs Google reviews, concierge-driven collection, loyalty program integration, multi-language review management.',
    priority: 'P0',
    category: 'industry',
    tags: ['hotel', 'hospitality', 'google reviews', 'review collection', 'reputation management'],
  },
  {
    slug: 'dental-clinic-reputation-management-guide',
    title: 'Dental Clinic Reputation Management Guide',
    titleZh: '牙醫診所聲譽管理指南',
    targetQuery: 'dental clinic reputation management guide',
    outline: 'Cover: HIPAA-compliant responses, post-appointment timing (1-2 hours), patient portal integration, handling pain-related complaints, new patient acquisition through reviews, emergency dentist keywords, family dentistry approach, dental anxiety mentions.',
    priority: 'P0',
    category: 'industry',
    tags: ['dental', 'clinic', 'reputation management', 'healthcare', 'patient reviews'],
  },
  {
    slug: 'auto-repair-shop-google-reviews-strategy',
    title: 'Auto Repair Shop Google Reviews Strategy',
    titleZh: '汽車修理廠 Google 評論策略',
    targetQuery: 'auto repair shop google reviews strategy',
    outline: 'Cover: post-service text message timing, invoice-based review links, handling pricing dispute reviews, explaining technical repairs in responses, before/after photo documentation, warranty-related complaints, parts quality mentions, fleet account collection.',
    priority: 'P1',
    category: 'industry',
    tags: ['auto repair', 'mechanic', 'automotive', 'google reviews', 'trust'],
  },
  {
    slug: 'beauty-salon-review-management',
    title: 'Beauty Salon Review Management',
    titleZh: '美容沙龍評論管理',
    targetQuery: 'beauty salon review management',
    outline: 'Cover: post-service mirror moment timing, stylist-specific review encouragement, before/after photo reviews, booking system integration, handling style preference complaints, Instagram-to-Google review bridge, loyalty tier review incentives.',
    priority: 'P1',
    category: 'industry',
    tags: ['beauty salon', 'hair salon', 'reviews', 'customer experience', 'local business'],
  },
  {
    slug: 'real-estate-agent-google-reviews',
    title: 'Real Estate Agent Google Reviews',
    titleZh: '房產經紀人 Google 評論指南',
    targetQuery: 'real estate agent google reviews',
    outline: 'Cover: post-closing review request timing, personal Google review link setup, video testimonial to written review pipeline, Zillow vs Google reviews priority, handling deal-fell-through reviews, neighborhood keyword strategy, referral + review combination.',
    priority: 'P1',
    category: 'industry',
    tags: ['real estate', 'realtor', 'agent reviews', 'google reviews', 'local SEO'],
  },
  {
    slug: 'gym-fitness-center-review-strategy',
    title: 'Gym & Fitness Center Review Strategy',
    titleZh: '健身房評論策略指南',
    targetQuery: 'gym fitness center review strategy',
    outline: 'Cover: membership onboarding review asks, post-class feedback loops, personal trainer review encouragement, handling cancellation-related reviews, facility cleanliness mentions, class variety keywords, new year resolution seasonal campaigns.',
    priority: 'P1',
    category: 'industry',
    tags: ['gym', 'fitness', 'review strategy', 'membership', 'local business'],
  },
  {
    slug: 'medical-practice-online-reputation',
    title: 'Medical Practice Online Reputation',
    titleZh: '醫療診所線上聲譽管理',
    targetQuery: 'medical practice online reputation',
    outline: 'Cover: HIPAA considerations in review responses, post-appointment timing, telehealth review collection, specialist vs general practice differences, insurance-related complaint responses, doctor-specific vs practice-level reviews, patient portal integration.',
    priority: 'P1',
    category: 'industry',
    tags: ['medical', 'healthcare', 'HIPAA', 'reputation', 'patient reviews'],
  },
  {
    slug: 'law-firm-google-reviews-guide',
    title: 'Law Firm Google Reviews Guide',
    titleZh: '律師事務所 Google 評論指南',
    targetQuery: 'law firm google reviews guide',
    outline: 'Cover: ethical considerations for soliciting reviews (bar association rules), post-case-resolution timing, confidentiality in responses, handling negative outcome reviews, practice area keyword strategy, client testimonial compliance, referral-driven review approach.',
    priority: 'P1',
    category: 'industry',
    tags: ['law firm', 'attorney', 'legal', 'google reviews', 'ethics'],
  },
  {
    slug: 'retail-store-review-management',
    title: 'Retail Store Review Management',
    titleZh: '零售商店評論管理',
    targetQuery: 'retail store review management',
    outline: 'Cover: checkout counter QR placement, packaging insert review cards, post-purchase SMS timing, product-specific vs store-level reviews, handling defect complaints, return policy responses, price comparison complaints, staff knowledge mentions.',
    priority: 'P1',
    category: 'industry',
    tags: ['retail', 'small business', 'google reviews', 'local business', 'ecommerce'],
  },
  {
    slug: 'coffee-shop-review-strategy',
    title: 'Coffee Shop Review Strategy',
    titleZh: '咖啡店評論策略',
    targetQuery: 'coffee shop review strategy',
    outline: 'Cover: table tent QR codes at every seat, WiFi password paired with review link, latte art photo reviews, handling wait time complaints, seasonal drink keyword strategy, third-wave vs chain positioning, community event review collection.',
    priority: 'P2',
    category: 'industry',
    tags: ['coffee shop', 'cafe', 'reviews', 'local business', 'food service'],
  },
  {
    slug: 'pet-grooming-business-reviews',
    title: 'Pet Grooming Business Reviews',
    titleZh: '寵物美容店評論指南',
    targetQuery: 'pet grooming business reviews',
    outline: 'Cover: post-groom photo sharing with review link, handling pet anxiety complaints, before/after photo reviews, breed-specific keyword strategy, seasonal grooming review campaigns, pet parent emotional triggers, social media to Google review funnel.',
    priority: 'P2',
    category: 'industry',
    tags: ['pet grooming', 'pet care', 'reviews', 'local business', 'small business'],
  },
  {
    slug: 'spa-wellness-center-reviews',
    title: 'Spa & Wellness Center Reviews',
    titleZh: 'SPA 與養生中心評論指南',
    targetQuery: 'spa wellness center reviews',
    outline: 'Cover: post-treatment relaxation zone review request, package deal review encouragement, handling therapist-specific complaints, ambiance and cleanliness keywords, membership tier review incentives, couples experience reviews, seasonal self-care campaigns.',
    priority: 'P2',
    category: 'industry',
    tags: ['spa', 'wellness', 'massage', 'reviews', 'luxury', 'local business'],
  },
  {
    slug: 'food-truck-review-management',
    title: 'Food Truck Review Management',
    titleZh: '餐車評論管理指南',
    targetQuery: 'food truck review management',
    outline: 'Cover: QR code on truck signage, social media to Google review pipeline, handling location-dependent complaints, festival and event review collection, limited menu keyword optimization, weather-related excuse responses, regular spot customer loyalty.',
    priority: 'P2',
    category: 'industry',
    tags: ['food truck', 'mobile food', 'reviews', 'street food', 'local business'],
  },
  {
    slug: 'barbershop-google-reviews-guide',
    title: 'Barbershop Google Reviews Guide',
    titleZh: '理髮店 Google 評論指南',
    targetQuery: 'barbershop google reviews guide',
    outline: 'Cover: chair-side QR code placement, barber-specific review encouragement, handling style mismatch complaints, walk-in vs appointment review flows, men grooming keyword strategy, loyalty card + review combo, community barbershop positioning.',
    priority: 'P2',
    category: 'industry',
    tags: ['barbershop', 'barber', 'men grooming', 'reviews', 'local business'],
  },
];

// ── Cluster B: How-to Guides (15 articles) ─────────────────────────────────

const HOW_TO_GUIDES: ArticleBrief[] = [
  {
    slug: 'how-to-respond-to-negative-google-reviews',
    title: 'How to Respond to Negative Google Reviews',
    titleZh: '如何回覆 Google 負面評論',
    targetQuery: 'how to respond to negative google reviews',
    outline: 'Cover: the 24-hour response rule, HEARD framework (Hear, Empathize, Apologize, Resolve, Diagnose), when to take offline, legal considerations, response templates for 1-star and 2-star reviews, turning critics into loyal customers, compensation guidelines.',
    priority: 'P0',
    category: 'how-to',
    tags: ['negative reviews', 'review response', 'crisis management', 'customer service'],
  },
  {
    slug: 'how-to-ask-customers-for-google-reviews',
    title: 'How to Ask Customers for Google Reviews',
    titleZh: '如何請客戶留下 Google 評論',
    targetQuery: 'how to ask customers for google reviews',
    outline: 'Cover: timing strategies (2-4 hours post-visit), SMS follow-ups, email templates, in-person scripts, QR code methods, Google review link shortener, NFC tap-to-review, receipt-based prompts, what NOT to say, compliance with Google policies.',
    priority: 'P0',
    category: 'how-to',
    tags: ['review collection', 'customer ask', 'google reviews', 'review strategy'],
  },
  {
    slug: 'how-to-remove-fake-google-reviews',
    title: 'How to Remove Fake Google Reviews',
    titleZh: '如何移除假的 Google 評論',
    targetQuery: 'how to remove fake google reviews',
    outline: 'Cover: identifying fake reviews (patterns, timing, reviewer history), Google flagging process step-by-step, what qualifies for removal under Google policy, legal options (cease and desist, defamation), documentation for disputes, response templates while waiting for removal.',
    priority: 'P0',
    category: 'how-to',
    tags: ['fake reviews', 'review removal', 'google policy', 'reputation management'],
  },
  {
    slug: 'how-to-use-qr-codes-for-google-reviews',
    title: 'How to Use QR Codes for Google Reviews',
    titleZh: '如何使用 QR Code 收集 Google 評論',
    targetQuery: 'how to use qr codes for google reviews',
    outline: 'Cover: getting your Google review link, creating QR codes (free tools vs branded), placement strategies (table tents, receipts, business cards, packaging, walls), NFC alternative, A/B testing CTAs, measuring scan-to-review conversion, AI-assisted review drafting after scan.',
    priority: 'P0',
    category: 'how-to',
    tags: ['qr code', 'review collection', 'google reviews', 'setup guide'],
  },
  {
    slug: 'how-to-improve-google-star-rating',
    title: 'How to Improve Your Google Star Rating',
    titleZh: '如何提升 Google 星級評分',
    targetQuery: 'how to improve google star rating',
    outline: 'Cover: the math behind rating improvement (how many 5-stars to move from 3.8 to 4.2), identifying rating-drag patterns, service recovery for at-risk visits, proactive review collection velocity, response strategy impact on perception, Google rating calculation methodology.',
    priority: 'P0',
    category: 'how-to',
    tags: ['star rating', 'review improvement', 'google reviews', 'local SEO'],
  },
  {
    slug: 'how-to-set-up-google-business-profile',
    title: 'How to Set Up Google Business Profile',
    titleZh: '如何設定 Google 商家檔案',
    targetQuery: 'how to set up google business profile',
    outline: 'Cover: claiming and verifying your profile, category selection, NAP consistency, business description optimization, photos strategy (100+ for max impact), Q&A section, Google Posts, attributes, services/menu, appointment links, messaging setup.',
    priority: 'P1',
    category: 'how-to',
    tags: ['google business profile', 'GBP', 'setup guide', 'local SEO'],
  },
  {
    slug: 'how-to-automate-review-responses-with-ai',
    title: 'How to Automate Review Responses with AI',
    titleZh: '如何用 AI 自動回覆評論',
    targetQuery: 'how to automate review responses with ai',
    outline: 'Cover: AI review response tools comparison, human-in-the-loop model, personalization techniques, response time benchmarks, tone matching, handling negative reviews with AI, SEO impact of AI responses, cost-benefit analysis, setup workflows.',
    priority: 'P1',
    category: 'how-to',
    tags: ['AI', 'automation', 'review response', 'efficiency', 'tools'],
  },
  {
    slug: 'how-to-track-competitor-reviews',
    title: 'How to Track Competitor Reviews',
    titleZh: '如何追蹤競爭對手的評論',
    targetQuery: 'how to track competitor reviews',
    outline: 'Cover: competitor review monitoring tools, sentiment analysis comparison, keyword gap analysis from reviews, review velocity benchmarking, identifying competitor weaknesses from reviews, using competitor insights to improve your own strategy, alert setup.',
    priority: 'P1',
    category: 'how-to',
    tags: ['competitor analysis', 'review monitoring', 'market research', 'strategy'],
  },
  {
    slug: 'how-to-use-review-analytics-business-growth',
    title: 'How to Use Review Analytics for Business Growth',
    titleZh: '如何利用評論分析促進業務增長',
    targetQuery: 'how to use review analytics for business growth',
    outline: 'Cover: key metrics to track (velocity, sentiment, response rate, keyword frequency), identifying operational issues from review patterns, staff performance insights, seasonal trend detection, revenue correlation analysis, building a review dashboard.',
    priority: 'P1',
    category: 'how-to',
    tags: ['analytics', 'review data', 'business growth', 'insights', 'data-driven'],
  },
  {
    slug: 'how-to-handle-1-star-reviews-professionally',
    title: 'How to Handle 1-Star Reviews Professionally',
    titleZh: '如何專業處理 1 星評論',
    targetQuery: 'how to handle 1 star reviews professionally',
    outline: 'Cover: emotional response management (dont reply angry), the 4-step response framework, when the customer is right vs wrong, specific templates for each complaint type, taking it offline gracefully, when to offer compensation, follow-up for review updates.',
    priority: 'P1',
    category: 'how-to',
    tags: ['1-star reviews', 'negative reviews', 'customer service', 'response templates'],
  },
  {
    slug: 'how-to-get-google-reviews-without-asking',
    title: 'How to Get Google Reviews Without Asking',
    titleZh: '如何不主動要求也能獲得 Google 評論',
    targetQuery: 'how to get google reviews without asking',
    outline: 'Cover: creating review-worthy experiences, surprise-and-delight moments, social proof displays that trigger reviews, follow-up touchpoints, thank-you card with review link, exceptional service as review strategy, community building, making review process frictionless.',
    priority: 'P2',
    category: 'how-to',
    tags: ['review collection', 'organic reviews', 'customer experience', 'passive strategy'],
  },
  {
    slug: 'how-to-respond-to-positive-reviews',
    title: 'How to Respond to Positive Reviews',
    titleZh: '如何回覆正面評論',
    targetQuery: 'how to respond to positive reviews',
    outline: 'Cover: why responding to positive reviews matters for SEO, personalization techniques, keyword incorporation, staff mention strategy, invitation to return, cross-sell in responses, timing, template variations to avoid repetition, photo acknowledgment.',
    priority: 'P2',
    category: 'how-to',
    tags: ['positive reviews', 'review response', 'customer loyalty', 'SEO'],
  },
  {
    slug: 'how-to-create-review-generation-strategy',
    title: 'How to Create a Review Generation Strategy',
    titleZh: '如何建立評論生成策略',
    targetQuery: 'how to create a review generation strategy',
    outline: 'Cover: audit current review profile, set targets by industry benchmarks, choose collection channels (SMS, email, QR, NFC), staff training program, timing optimization, monitoring setup, escalation procedures, monthly review cadence, integration with CRM.',
    priority: 'P2',
    category: 'how-to',
    tags: ['review generation', 'strategy', 'review collection', 'planning'],
  },
  {
    slug: 'how-to-use-reviews-for-local-seo',
    title: 'How to Use Reviews for Local SEO',
    titleZh: '如何利用評論提升本地 SEO',
    targetQuery: 'how to use reviews for local seo',
    outline: 'Cover: review signals in ranking algorithm (volume, velocity, recency, keywords), review schema markup, Google AI Overview visibility, review-driven keyword strategy, response rate impact on rankings, review content optimization, local pack strategies.',
    priority: 'P2',
    category: 'how-to',
    tags: ['local SEO', 'google reviews', 'ranking factors', 'search optimization'],
  },
  {
    slug: 'how-to-turn-negative-reviews-into-opportunities',
    title: 'How to Turn Negative Reviews into Opportunities',
    titleZh: '如何將負面評論轉化為機會',
    targetQuery: 'how to turn negative reviews into opportunities',
    outline: 'Cover: extracting actionable feedback from complaints, service recovery framework, turning 1-star into 5-star (case studies), operational improvement from review patterns, public perception management, building resilience narrative, follow-up strategies.',
    priority: 'P2',
    category: 'how-to',
    tags: ['negative reviews', 'opportunity', 'service recovery', 'customer retention'],
  },
];

// ── Cluster C: Comparison & Best-of (10 articles) ──────────────────────────

const COMPARISON_ARTICLES: ArticleBrief[] = [
  {
    slug: 'replywiseai-vs-birdeye-comparison',
    title: 'ReplyWise AI vs Birdeye: Complete Comparison',
    titleZh: 'ReplyWise AI 與 Birdeye 完整比較',
    targetQuery: 'ReplyWise AI vs Birdeye comparison',
    outline: 'Cover: feature comparison table (review collection, AI responses, analytics, multi-platform, pricing), use case fit (SMB vs enterprise), setup complexity, customer support, unique differentiators, verdict by business type.',
    priority: 'P0',
    category: 'comparison',
    tags: ['ReplyWise AI', 'Birdeye', 'comparison', 'review management tools'],
  },
  {
    slug: 'replywiseai-vs-podium-comparison',
    title: 'ReplyWise AI vs Podium: Complete Comparison',
    titleZh: 'ReplyWise AI 與 Podium 完整比較',
    targetQuery: 'ReplyWise AI vs Podium comparison',
    outline: 'Cover: feature comparison (review collection, messaging, payments, AI), pricing transparency, ease of use, integration ecosystem, multi-location support, contract terms, best for which business type.',
    priority: 'P0',
    category: 'comparison',
    tags: ['ReplyWise AI', 'Podium', 'comparison', 'review management tools'],
  },
  {
    slug: 'best-google-review-management-tools-2026',
    title: 'Best Google Review Management Tools 2026',
    titleZh: '2026 年最佳 Google 評論管理工具',
    targetQuery: 'best google review management tools 2026',
    outline: 'Cover: top 10 tools ranked (ReplyWise AI, Birdeye, Podium, ReviewTrackers, Yext, GatherUp, Grade.us, Trustpilot, BrightLocal, NiceJob), comparison table with pricing, features, pros/cons, best for category.',
    priority: 'P0',
    category: 'comparison',
    tags: ['review management tools', 'best of', 'software comparison', '2026'],
  },
  {
    slug: 'free-vs-paid-review-management-software',
    title: 'Free vs Paid Review Management Software',
    titleZh: '免費 vs 付費評論管理軟體比較',
    targetQuery: 'free vs paid review management software',
    outline: 'Cover: what free tools can do (Google Business Profile, manual tracking), limitations of free, when to upgrade, ROI calculation for paid tools, feature gap analysis, hidden costs of free (time, missed reviews), breakeven analysis by business size.',
    priority: 'P1',
    category: 'comparison',
    tags: ['free tools', 'paid tools', 'review management', 'ROI', 'budget'],
  },
  {
    slug: 'ai-review-response-tools-comparison',
    title: 'AI Review Response Tools Comparison',
    titleZh: 'AI 評論回覆工具比較',
    targetQuery: 'AI review response tools comparison',
    outline: 'Cover: compare AI response quality across 6+ tools, tone accuracy, personalization level, language support, response time, integration with review platforms, pricing per response, human-in-the-loop options.',
    priority: 'P1',
    category: 'comparison',
    tags: ['AI tools', 'review response', 'automation', 'comparison', 'technology'],
  },
  {
    slug: 'best-qr-code-review-generators',
    title: 'Best QR Code Review Generators',
    titleZh: '最佳 QR Code 評論生成器',
    targetQuery: 'best QR code review generators',
    outline: 'Cover: top QR code tools for review collection, free vs premium, customization options, analytics tracking, NFC alternatives, branded vs generic, scan-to-review conversion rates by tool, integration with review platforms.',
    priority: 'P1',
    category: 'comparison',
    tags: ['QR code', 'review generators', 'tools', 'review collection'],
  },
  {
    slug: 'top-reputation-management-platforms-smbs',
    title: 'Top Reputation Management Platforms for SMBs',
    titleZh: '中小企業最佳聲譽管理平台',
    targetQuery: 'top reputation management platforms for SMBs',
    outline: 'Cover: platforms ranked for small-to-medium businesses, pricing tiers under $200/month, essential features for SMBs, ease of use ratings, onboarding time, customer support quality, scalability path.',
    priority: 'P1',
    category: 'comparison',
    tags: ['SMB', 'reputation management', 'platforms', 'small business', 'pricing'],
  },
  {
    slug: 'google-review-management-pricing-comparison',
    title: 'Google Review Management Pricing Comparison',
    titleZh: 'Google 評論管理定價比較',
    targetQuery: 'google review management pricing comparison',
    outline: 'Cover: transparent pricing breakdown for 8+ tools, per-location pricing, per-user pricing, feature tiers, annual vs monthly, hidden fees, contract terms, free trial availability, cost per review managed.',
    priority: 'P2',
    category: 'comparison',
    tags: ['pricing', 'review management', 'cost comparison', 'budget', 'tools'],
  },
  {
    slug: 'manual-vs-automated-review-management',
    title: 'Manual vs Automated Review Management',
    titleZh: '手動 vs 自動化評論管理比較',
    targetQuery: 'manual vs automated review management',
    outline: 'Cover: time cost of manual management by review volume, error rates, response time comparison, scalability limits, when manual works, when automation is necessary, hybrid approach, cost-benefit analysis, staff training vs tool investment.',
    priority: 'P2',
    category: 'comparison',
    tags: ['manual', 'automated', 'review management', 'efficiency', 'comparison'],
  },
  {
    slug: 'best-review-management-multi-location-businesses',
    title: 'Best Review Management for Multi-Location Businesses',
    titleZh: '多門市企業最佳評論管理方案',
    targetQuery: 'best review management for multi-location businesses',
    outline: 'Cover: multi-location challenges (consistency, local vs corporate responses, aggregated analytics), platform comparison for franchise/chain use, per-location pricing, centralized dashboard features, local manager access controls, brand voice consistency.',
    priority: 'P2',
    category: 'comparison',
    tags: ['multi-location', 'franchise', 'enterprise', 'review management', 'scalability'],
  },
];

// ── Cluster D: City/Local & Trends (10 articles) ──────────────────────────

const LOCAL_ARTICLES: ArticleBrief[] = [
  {
    slug: 'google-review-management-vancouver-restaurants',
    title: 'Google Review Management for Vancouver Restaurants',
    titleZh: '溫哥華餐廳 Google 評論管理',
    targetQuery: 'google review management for Vancouver restaurants',
    outline: 'Cover: Vancouver-specific restaurant landscape, multilingual review management (English, Chinese, Korean), seasonal tourism review patterns, Vancouver food scene competition, local SEO for Vancouver, neighborhood-specific strategies (Gastown, Richmond, Main St).',
    priority: 'P0',
    category: 'local',
    tags: ['Vancouver', 'restaurant', 'local SEO', 'google reviews', 'Canada'],
  },
  {
    slug: 'best-review-strategies-toronto-businesses',
    title: 'Best Review Strategies for Toronto Businesses',
    titleZh: '多倫多企業最佳評論策略',
    targetQuery: 'best review strategies for Toronto businesses',
    outline: 'Cover: Toronto market characteristics, diverse community review management, high competition verticals (restaurants, real estate, legal), Toronto-specific local SEO, GTA multi-location strategies, seasonal business patterns.',
    priority: 'P1',
    category: 'local',
    tags: ['Toronto', 'business strategy', 'local SEO', 'Canada', 'google reviews'],
  },
  {
    slug: 'how-vancouver-cafes-get-more-google-reviews',
    title: 'How Vancouver Cafes Can Get More Google Reviews',
    titleZh: '溫哥華咖啡店如何獲得更多 Google 評論',
    targetQuery: 'how Vancouver cafes can get more google reviews',
    outline: 'Cover: Vancouver cafe culture and competition, Instagram-to-review pipeline, latte art sharing moments, third-wave coffee community, rainy day foot traffic strategies, UBC/SFU student customer base, Commercial Drive vs Gastown positioning.',
    priority: 'P1',
    category: 'local',
    tags: ['Vancouver', 'cafe', 'coffee shop', 'google reviews', 'local business'],
  },
  {
    slug: 'review-management-guide-bc-small-businesses',
    title: 'Review Management Guide for BC Small Businesses',
    titleZh: 'BC 省小型企業評論管理指南',
    targetQuery: 'review management guide for BC small businesses',
    outline: 'Cover: BC small business landscape, rural vs urban review strategies, tourism-dependent businesses, seasonal review patterns (ski season, summer), multi-language considerations, BC-specific compliance, Canadian consumer review behavior.',
    priority: 'P1',
    category: 'local',
    tags: ['British Columbia', 'small business', 'Canada', 'review management', 'local'],
  },
  {
    slug: 'how-to-dominate-google-reviews-local-market',
    title: 'How to Dominate Google Reviews in Your Local Market',
    titleZh: '如何在本地市場主導 Google 評論',
    targetQuery: 'how to dominate Google reviews in your local market',
    outline: 'Cover: local competitive analysis framework, review velocity benchmarking, local pack domination strategy, citation building + reviews, community partnership review strategies, local events and sponsorships, hyperlocal keyword strategy in reviews.',
    priority: 'P1',
    category: 'local',
    tags: ['local market', 'dominance strategy', 'competitive analysis', 'local SEO'],
  },
  {
    slug: 'local-seo-reviews-complete-playbook',
    title: 'Local SEO + Reviews: The Complete Playbook',
    titleZh: '本地 SEO + 評論：完整攻略手冊',
    targetQuery: 'local SEO + reviews the complete playbook',
    outline: 'Cover: how reviews integrate with overall local SEO strategy, NAP consistency + reviews, citation building + reviews, Google Business Profile optimization, schema markup, review-driven keyword strategy, measuring local search visibility, monthly action plan.',
    priority: 'P1',
    category: 'local',
    tags: ['local SEO', 'reviews', 'playbook', 'strategy', 'comprehensive guide'],
  },
  {
    slug: 'why-google-reviews-matter-canadian-businesses',
    title: 'Why Google Reviews Matter for Canadian Businesses',
    titleZh: '為什麼 Google 評論對加拿大企業很重要',
    targetQuery: 'why google reviews matter for Canadian businesses',
    outline: 'Cover: Canadian consumer review behavior data, Google market share in Canada, bilingual review management, Canadian privacy regulations, trust factors unique to Canadian market, comparison with US trends, industry-specific Canadian data.',
    priority: 'P2',
    category: 'local',
    tags: ['Canada', 'google reviews', 'business', 'market data', 'consumer behavior'],
  },
  {
    slug: 'google-review-trends-2026',
    title: 'Google Review Trends 2026',
    titleZh: '2026 年 Google 評論趨勢',
    targetQuery: 'google review trends 2026',
    outline: 'Cover: AI Overviews impact on reviews, video review growth, voice search and reviews, Gen Z review behavior, review verification changes, platform consolidation trends, AI-generated review detection, privacy regulation impact.',
    priority: 'P2',
    category: 'local',
    tags: ['trends', '2026', 'google reviews', 'AI', 'future', 'predictions'],
  },
  {
    slug: 'ftc-guidelines-review-management',
    title: 'FTC Guidelines on Review Management',
    titleZh: 'FTC 評論管理指南與合規',
    targetQuery: 'FTC guidelines on review management',
    outline: 'Cover: FTC Endorsement Guides summary, what counts as incentivized reviews, review gating prohibition, employee review policies, disclosure requirements, penalties for violations, compliance checklist, comparison with Google policies.',
    priority: 'P2',
    category: 'local',
    tags: ['FTC', 'compliance', 'guidelines', 'legal', 'review management'],
  },
  {
    slug: 'gdpr-review-collection-compliance-guide',
    title: 'GDPR and Review Collection Compliance Guide',
    titleZh: 'GDPR 與評論收集合規指南',
    targetQuery: 'GDPR and review collection compliance guide',
    outline: 'Cover: GDPR basics for review collection, consent requirements, data processing for review platforms, right to erasure and reviews, cross-border review data, EU vs North American regulations, compliance checklist for review management tools.',
    priority: 'P2',
    category: 'local',
    tags: ['GDPR', 'compliance', 'privacy', 'EU', 'review collection', 'legal'],
  },
];

// ── All Briefs Combined ────────────────────────────────────────────────────

export const ALL_BRIEFS: ArticleBrief[] = [
  ...INDUSTRY_GUIDES,
  ...HOW_TO_GUIDES,
  ...COMPARISON_ARTICLES,
  ...LOCAL_ARTICLES,
];

// ── GSC-driven brief loading ─────────────────────────────────────────────

function loadGscBriefs(): ArticleBrief[] {
  const gscDataDir = path.resolve(__dirname, 'gsc-data');
  if (!fs.existsSync(gscDataDir)) return [];

  // Find most recent content-gaps file
  const files = fs.readdirSync(gscDataDir)
    .filter(f => f.startsWith('content-gaps-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return [];

  const filePath = path.join(gscDataDir, files[0]);
  console.log(`Loading GSC briefs from: ${files[0]}`);

  const report = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const gscBriefs: GscBrief[] = report.briefs || [];

  // Convert GSC briefs to ArticleBrief format
  return gscBriefs.map((gb): ArticleBrief => {
    // Map intent_type to category
    const categoryMap: Record<string, ArticleBrief['category']> = {
      guide: 'how-to',
      comparison: 'comparison',
      'how-to': 'how-to',
      industry: 'industry',
      local: 'local',
    };
    const category = categoryMap[gb.intent_type] || 'how-to';

    // Build title from keyword
    const title = gb.target_keyword
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return {
      slug: gb.slug,
      title,
      titleZh: `[GSC] ${title}`,
      targetQuery: gb.target_keyword,
      outline: `Data-driven article for query "${gb.target_keyword}" (${gb.total_impressions} impressions, position ${gb.avg_position}). Related: ${gb.related_queries.join(', ') || 'none'}.`,
      priority: gb.priority,
      category,
      tags: ['gsc-driven', 'data-driven', gb.intent_type],
    };
  });
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const batchArg = args.includes('--batch') ? args[args.indexOf('--batch') + 1]?.toUpperCase() : null;
  const categoryArg = args.includes('--category') ? args[args.indexOf('--category') + 1] : null;
  const fromGsc = args.includes('--from-gsc');

  let briefs: ArticleBrief[];

  if (fromGsc) {
    const gscBriefs = loadGscBriefs();
    if (gscBriefs.length === 0) {
      console.log('No GSC data found. Run gsc-analyze.ts first, or use without --from-gsc.');
      console.log('Falling back to static briefs.\n');
      briefs = ALL_BRIEFS;
    } else {
      // Merge: GSC briefs first, then static briefs for slugs not in GSC
      const gscSlugs = new Set(gscBriefs.map(b => b.slug));
      const staticNotInGsc = ALL_BRIEFS.filter(b => !gscSlugs.has(b.slug));
      briefs = [...gscBriefs, ...staticNotInGsc];
      console.log(`Merged ${gscBriefs.length} GSC briefs + ${staticNotInGsc.length} static briefs\n`);
    }
  } else {
    briefs = ALL_BRIEFS;
  }

  if (batchArg) {
    briefs = briefs.filter(b => b.priority === batchArg);
    console.log(`Filtered to ${batchArg}: ${briefs.length} briefs`);
  }

  if (categoryArg) {
    briefs = briefs.filter(b => b.category === categoryArg);
    console.log(`Filtered to category "${categoryArg}": ${briefs.length} briefs`);
  }

  // Output stats
  const byPriority = { P0: 0, P1: 0, P2: 0 };
  const byCategory = { industry: 0, 'how-to': 0, comparison: 0, local: 0 };
  for (const b of briefs) {
    byPriority[b.priority]++;
    byCategory[b.category]++;
  }

  console.log(`\nTotal briefs: ${briefs.length}`);
  console.log(`By priority: P0=${byPriority.P0}, P1=${byPriority.P1}, P2=${byPriority.P2}`);
  console.log(`By category: industry=${byCategory.industry}, how-to=${byCategory['how-to']}, comparison=${byCategory.comparison}, local=${byCategory.local}`);

  // Write output
  const outDir = path.resolve(__dirname);
  const outPath = path.join(outDir, 'briefs.json');
  fs.writeFileSync(outPath, JSON.stringify(briefs, null, 2));
  console.log(`\nWrote ${briefs.length} briefs to ${outPath}`);

  // Print summary table
  console.log('\n--- Brief Summary ---');
  for (const b of briefs) {
    console.log(`  [${b.priority}] [${b.category.padEnd(10)}] ${b.slug}`);
  }
}

main();
