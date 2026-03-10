# Article Generation Spec — Reputation Monitor

> Ported from `vancouver-meal-logistics` 4-layer prompt architecture.
> SEO 策略基於 DarkSEOKing 框架（詳見 `docs/seo-guidelines-darkseoking.md`）
> Last updated: 2026-03-10

---

## Overview

Automated SEO/GEO article generation pipeline for reputationmonitor.ai blog.

### DarkSEOKing Framework Integration

本文章生成系統遵循 DarkSEOKing 的語意 SEO 框架：

- **語意集群 (Semantic Clustering):** 30 篇文章分 4 個集群，每個集群灌權重到對應的 Boss 頁面
- **Boss 頁面:** ROI Calculator、Review Guide、Local SEO Hub、Industry Solutions（見 `src/config/article-guide-map.ts`）
- **跨域 CTA 控制:** 僅 ~23% 的文章有直接產品 CTA，避免 PBN 偵測（見 `src/config/cross-domain-cta.ts`）
- **反 AI 偵測:** 使用 DeepSeek V3（避開 Gemini SynthID）+ 60 個禁用詞自動清理
- **意圖矩陣:** `[行業實體] × [搜尋意圖] × [功能修飾]` 結構化覆蓋
Uses DeepSeek V3 for content + Replicate Flux Schnell for featured images.

**Target:** ~30 articles covering Google review management, local SEO, GEO (Generative Engine Optimization), and reputation strategies for SMBs.

---

## 1. Tech Stack

| Component | Tool | Cost |
|-----------|------|------|
| Text generation | DeepSeek V3 (`deepseek-chat`) via OpenAI SDK | ~$0.004/article |
| Image generation | Replicate Flux Schnell (`black-forest-labs/flux-schnell`) | ~$0.003/image |
| Translation | DeepSeek V3 (same client) | ~$0.002/locale |
| Content storage | Static `BlogPost[]` in `src/lib/blog-data.ts` | — |

**Environment Variables:**
```
DEEPSEEK_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...
```

**Dependencies (already in project):**
```
openai        # DeepSeek V3 client (OpenAI-compatible)
dotenv        # Env loading
```

---

## 2. Four-Layer Prompt Architecture

### Layer 1: Anti-AI Detection Protocol

Banned patterns to avoid Google AI content detection penalties:

**Banned Punctuation:** Em dashes (`—`) → use commas, colons, parentheses

**Banned Verbs:** delve, leverage, utilize, facilitate, foster, bolster, underscore, unveil, navigate, streamline, endeavour, ascertain, elucidate

**Banned Adjectives:** robust, comprehensive, pivotal, crucial, vital, transformative, cutting-edge, groundbreaking, innovative, seamless, intricate, nuanced, multifaceted, holistic

**Banned Transitions:** furthermore, moreover, notwithstanding, "that being said", "at its core", "it is worth noting", "in the realm of", "in today's fast-paced world"

**Banned Filler Words:** absolutely, basically, certainly, clearly, definitely, essentially, extremely, fundamentally, incredibly, obviously, quite, really, significantly, simply, surely, truly, ultimately, very

**Instead:** Write like a business consultant talking to a local restaurant owner. Short punchy sentences. Specific data points and examples. No padding.

### Layer 2: Author Persona System

Four rotating expert personas, selected by keyword match:

| Persona | Role | Expertise Areas |
|---------|------|-----------------|
| **Sarah Kim** | Local SEO & Review Strategist | google reviews, local seo, google business, ranking, maps, search, visibility, citations |
| **David Chen** | Restaurant Technology Consultant | restaurant, hotel, clinic, pos, qr code, nfc, menu, hospitality, food service |
| **Rachel Torres** | Digital Reputation Expert | reputation, online reviews, negative reviews, complaint, response, brand, crisis, sentiment |
| **Marcus Liu** | AI & GEO Optimization Specialist | ai, geo, generative, chatgpt, gemini, ai overview, automation, machine learning, nlp |

**Selection Algorithm:** Score each persona by keyword overlap with article targetQuery. Highest score wins.

### Layer 3: Intent-Aware Prompt Routing

Five content modes, auto-detected from slug + targetQuery:

| Mode | Structure | Signals |
|------|-----------|---------|
| **guide** | Overview → Steps → Tools → Tips | "guide", "how to", "complete", "step" |
| **comparison** | Criteria → Options → Pros/Cons → Verdict | "vs", "comparison", "best", "top", "ranked" |
| **industry** | Industry overview → Challenges → Solutions → Case study | "restaurant", "hotel", "clinic", "salon" |
| **strategy** | Problem → Data → Strategy → Implementation | "strategy", "increase", "improve", "boost", "grow" |
| **technical** | Concept → How it works → Implementation → Measurement | "seo", "geo", "ai", "schema", "api", "automation" |

### Layer 4: Cross-Domain Product Context

Natural CTA integration for Reputation Monitor:

```
- reputationmonitor.ai: SaaS for Google review management. QR code → AI review generation → one-tap post to Google. Admin dashboard with analytics, sentiment analysis, automated AI replies.
- Mention 1-2 times when naturally relevant to the topic (not forced).
- Never position as the "only" or "best" solution. Present as one option among strategies.
```

---

## 3. Article Brief Schema

```typescript
interface ArticleBrief {
  slug: string;           // URL path: /blog/{slug}
  targetQuery: string;    // Primary search intent (3-4 variations)
  title: string;          // H1 title (EN)
  titleZh: string;        // H1 title (ZH)
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  category: string;       // guides | strategies | industry | product
  tags: string[];         // SEO tags
  outline: string;        // Section structure hints for DeepSeek
}
```

---

## 4. Article Briefs (~30 articles)

### P0 — Core Pillar Pages (6 articles)

| # | Slug | Target Query | Category |
|---|------|-------------|----------|
| 1 | `how-to-get-more-google-reviews-2026` | how to get more google reviews, increase google reviews | strategies |
| 2 | `google-review-response-templates-guide` | google review response templates, how to reply to google reviews | guides |
| 3 | `negative-google-review-management-guide` | how to handle negative google reviews, respond to bad reviews | guides |
| 4 | `local-seo-google-reviews-ranking-factor` | google reviews seo, do google reviews help seo ranking | strategies |
| 5 | `ai-review-management-tools-comparison-2026` | ai review management tools, best review management software | guides |
| 6 | `qr-code-google-review-collection-guide` | qr code google reviews, review collection qr code | guides |

### P1 — Industry-Specific Pages (8 articles)

| # | Slug | Target Query | Category |
|---|------|-------------|----------|
| 7 | `restaurant-google-review-strategy` | restaurant google reviews, how to get restaurant reviews | industry |
| 8 | `hotel-online-reputation-management` | hotel reputation management, hotel google reviews strategy | industry |
| 9 | `clinic-medical-practice-review-guide` | clinic google reviews, medical practice review management | industry |
| 10 | `salon-spa-review-management-strategy` | salon reviews, spa google review strategy | industry |
| 11 | `dental-practice-patient-reviews-guide` | dental practice reviews, dentist google review strategy | industry |
| 12 | `real-estate-agent-review-strategy` | real estate agent reviews, realtor google review tips | industry |
| 13 | `auto-repair-shop-review-management` | auto repair shop reviews, mechanic google review strategy | industry |
| 14 | `retail-store-google-review-strategy` | retail store reviews, small business google reviews | industry |

### P2 — SEO & GEO Deep-Dives (10 articles)

| # | Slug | Target Query | Category |
|---|------|-------------|----------|
| 15 | `geo-generative-engine-optimization-guide` | what is geo, generative engine optimization guide | strategies |
| 16 | `google-ai-overview-local-business-seo` | google ai overview local business, ai search local seo | strategies |
| 17 | `google-business-profile-optimization-2026` | google business profile optimization, gbp seo tips | guides |
| 18 | `local-seo-citation-building-guide` | local seo citations, nap consistency guide | guides |
| 19 | `schema-markup-local-business-seo` | local business schema markup, structured data seo | strategies |
| 20 | `review-velocity-impact-local-ranking` | review velocity seo, how many reviews per month | strategies |
| 21 | `google-maps-ranking-factors-2026` | google maps ranking factors, local pack ranking | strategies |
| 22 | `voice-search-local-seo-optimization` | voice search local seo, optimize for voice search business | strategies |
| 23 | `ai-generated-review-responses-seo-impact` | ai review responses seo, automated review replies ranking | strategies |
| 24 | `multi-location-business-review-management` | multi location review management, franchise reviews strategy | guides |

### P3 — Long-Tail & Conversion Pages (6 articles)

| # | Slug | Target Query | Category |
|---|------|-------------|----------|
| 25 | `review-management-roi-calculator-guide` | review management roi, reviews revenue impact calculator | strategies |
| 26 | `fake-google-reviews-detection-removal` | fake google reviews, how to remove fake reviews, flag fake review | guides |
| 27 | `google-review-policy-guidelines-2026` | google review policy, google review guidelines rules | guides |
| 28 | `review-management-checklist-new-business` | review management checklist, new business reviews setup | guides |
| 29 | `customer-feedback-loop-review-strategy` | customer feedback loop, feedback to reviews pipeline | strategies |
| 30 | `review-analytics-sentiment-analysis-guide` | review analytics, review sentiment analysis tools | guides |

---

## 5. Output Format

### DeepSeek Output Structure

The prompt instructs DeepSeek to output with delimiters:

```
[META_START]
150-160 character meta description
[META_END]

[CONTENT_START]
## Title
... full markdown article (3000-3800 words) ...
## References
[CONTENT_END]

[FAQ_START]
[{"question": "...", "answer": "..."}]
[FAQ_END]
```

### Post-Processing Pipeline

1. **Parse** — Extract meta, content, FAQ from delimiters
2. **Word count check** — If < 2500 words, run expansion pass
3. **Banned word cleanup** — Replace 60+ AI-sounding words
4. **Reference verification** — Replace hallucinated URLs with pre-verified pool
5. **External link validation** — HTTP HEAD check, remove dead links
6. **Em dash removal** — Convert `—` to commas/colons
7. **Header fix** — Fix DeepSeek double-### artifacts

### Final Output per Article

```
scripts/output/{slug}/
  ├── document.md        # Full article markdown
  ├── faq-schema.json    # JSON-LD FAQPage schema
  └── brief.json         # Metadata snapshot
```

### BlogPost TypeScript Conversion

After generation, convert to `BlogPost` format for `src/lib/blog-data.ts`:

```typescript
{
  slug: string,
  title: string,
  titleZh: string,          // Translated via DeepSeek
  excerpt: string,           // From meta description
  excerptZh: string,
  category: string,
  categoryZh: string,
  author: string,            // From persona
  publishedAt: string,
  readTime: number,          // wordCount / 250
  tags: string[],
  sections: Array<{
    heading: string,
    headingZh: string,
    body: string,
    bodyZh: string,
  }>
}
```

---

## 6. Pre-Verified Reference Pool

Real URLs to replace AI-hallucinated sources:

### Government & Industry
- Google Business Profile Help: `https://support.google.com/business/`
- Google Review Policy: `https://support.google.com/contributionpolicy/answer/7400114`
- FTC Endorsement Guidelines: `https://www.ftc.gov/legal-library/browse/rules/endorsement-guides`
- BrightLocal Local Consumer Survey: `https://www.brightlocal.com/research/local-consumer-review-survey/`
- Moz Local Search Ranking Factors: `https://moz.com/local-search-ranking-factors`

### SEO & Marketing Research
- Search Engine Journal local SEO: `https://www.searchenginejournal.com/local-seo/`
- Search Engine Land reviews: `https://searchengineland.com/`
- Whitespark Local Citation Finder: `https://whitespark.ca/`
- Semrush Local SEO Guide: `https://www.semrush.com/blog/local-seo/`
- HubSpot Marketing Statistics: `https://www.hubspot.com/marketing-statistics`

### Review & Reputation Industry
- ReviewTrackers statistics: `https://www.reviewtrackers.com/reports/online-reviews-survey/`
- Podium State of Reviews: `https://www.podium.com/`
- Birdeye reputation data: `https://birdeye.com/`
- Trustpilot business blog: `https://business.trustpilot.com/`
- GatherUp review research: `https://gatherup.com/`

### Technology & AI
- Google AI Overview documentation: `https://blog.google/products/search/`
- OpenAI API documentation: `https://platform.openai.com/docs/`
- Schema.org Local Business: `https://schema.org/LocalBusiness`
- Google Structured Data: `https://developers.google.com/search/docs/appearance/structured-data`

---

## 7. Image Generation (Flux Schnell)

### Configuration
- Model: `black-forest-labs/flux-schnell` via Replicate API
- Aspect ratio: 16:9 (1200x630 OG image standard)
- Output: WebP at quality 90
- Cost: ~$0.003/image

### Prompt Pattern
```
Editorial business photography, {topic-specific scene}.
Natural lighting, shallow depth of field, warm professional tones.
No text, no watermarks, no people faces.
Modern clean background, soft bokeh.
```

### Topic-Specific Scenes
- Review management: laptop showing star ratings on screen, coffee shop setting
- Restaurant: table with food and phone showing Google Maps review
- SEO/GEO: modern office desk with analytics dashboard on monitor
- QR code: table tent with QR code in restaurant setting
- Negative reviews: business person looking at phone with notification
- AI tools: futuristic interface with chat bubbles and stars

---

## 8. Quality Standards

### Content Requirements
- **Word count:** 3000-3800 words minimum per article
- **Sections:** 4-6 H2 sections, each 400+ words
- **Sub-headings:** 2-3 H3 per H2 section
- **Tables:** At least 1 comparison/data table per article
- **FAQ:** 5-7 Q&A pairs matching real search queries
- **References:** 5-8 from pre-verified pool
- **Internal links:** 3-4 to other blog articles
- **External links:** 2-3 authority sources

### GEO Optimization
After each H2 section, include a blockquote summary:
```markdown
> **Summary:** [60-80 word definitive statement that directly answers
> the section's core question. Include one specific number.
> End with a forward-looking insight.]
```
These summaries are optimized for AI citation in Google AI Overviews and ChatGPT web search.

### Anti-AI Detection
- No em dashes
- No banned words (60+ words/phrases)
- Specific data points (%, $, stats)
- Named examples (real tools, real businesses)
- Short punchy sentences mixed with detailed paragraphs
- First-person anecdotes from persona

### SEO Requirements
- H1 contains primary keyword
- Every H2 contains a word from targetQuery
- Meta description: 150-160 chars with primary keyword
- FAQ questions match real search queries (People Also Ask)
- Slug is keyword-rich and URL-friendly

---

## 9. CLI Usage

```bash
# Generate all articles
npx tsx scripts/generate-articles.ts

# Generate specific priority batch
npx tsx scripts/generate-articles.ts --batch p0

# Generate single article
npx tsx scripts/generate-articles.ts --slug how-to-get-more-google-reviews-2026

# Dry run (preview briefs only)
npx tsx scripts/generate-articles.ts --dry-run

# Generate + convert to BlogPost format
npx tsx scripts/generate-articles.ts --convert

# Generate featured images
REPLICATE_API_TOKEN=xxx npx tsx scripts/generate-article-images.ts
```

---

## 10. Cost Estimate

| Task | Per Article | 30 Articles |
|------|-----------|-------------|
| Text generation (DeepSeek V3) | $0.004 | $0.12 |
| ZH translation (DeepSeek V3) | $0.002 | $0.06 |
| Image generation (Flux Schnell) | $0.003 | $0.09 |
| **Total** | **~$0.009** | **~$0.27** |

---

## 11. Maintenance

- To add new articles: Add new entries to `ARTICLE_BRIEFS` array in `scripts/generate-articles.ts`
- To adjust prompts: Edit Layer 1-4 constants in the script
- To update verified references: Edit `VERIFIED_REFERENCES` array
- To change output format: Edit `saveArticle()` and `convertToBlogPost()` functions
- To re-generate specific articles: Use `--slug` flag
- All changes to methodology should be reflected in this spec file
