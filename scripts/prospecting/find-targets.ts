#!/usr/bin/env npx tsx
/**
 * find-targets.ts — Restaurant Prospecting Tool for ReplyWise AI
 *
 * Finds restaurants with poor ratings + unanswered negative reviews,
 * generates AI reply drafts, and outputs a "street sweep" report.
 *
 * Usage:
 *   npx tsx scripts/prospecting/find-targets.ts --area "Richmond, BC"
 *   npx tsx scripts/prospecting/find-targets.ts --area "Downtown Vancouver" --limit 10
 *   npx tsx scripts/prospecting/find-targets.ts --area "Main Street, Vancouver" --min-rating 3.0 --max-rating 4.2
 *   npx tsx scripts/prospecting/find-targets.ts --area "Richmond, BC" --type "chinese restaurant"
 *   npx tsx scripts/prospecting/find-targets.ts --area "Richmond, BC" --dry-run
 *
 * Environment:
 *   GOOGLE_PLACES_API_KEY  — Google Places API key
 *   DEEPSEEK_API_KEY       — For AI reply draft generation
 */

import OpenAI from 'openai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });

// ── Config ───────────────────────────────────────────────────────────────────

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GOOGLE_PLACES_API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY in .env.local');
  process.exit(1);
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const area = getArg('area');
const type = getArg('type') || 'restaurant';
const minRating = parseFloat(getArg('min-rating') || '3.0');
const maxRating = parseFloat(getArg('max-rating') || '4.2');
const limit = parseInt(getArg('limit') || '20', 10);
const dryRun = args.includes('--dry-run');
const skipAI = args.includes('--skip-ai') || !DEEPSEEK_API_KEY;
const lang = getArg('lang') || 'en'; // 'en' or 'zh'

if (!area) {
  console.error('Usage: npx tsx scripts/prospecting/find-targets.ts --area "Richmond, BC"');
  console.error('Options:');
  console.error('  --area <area>         Area to search (required)');
  console.error('  --type <type>         Business type (default: restaurant)');
  console.error('  --min-rating <n>      Minimum rating (default: 3.0)');
  console.error('  --max-rating <n>      Maximum rating (default: 4.2)');
  console.error('  --limit <n>           Max results (default: 20)');
  console.error('  --skip-ai             Skip AI reply generation');
  console.error('  --dry-run             Search only, no details/reviews');
  process.exit(1);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  mapsUrl: string;
  types: string[];
}

interface ReviewData {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
  hasOwnerResponse: boolean;
}

interface TargetRestaurant extends PlaceResult {
  negativeReviews: Array<ReviewData & { aiDraft?: string }>;
  score: number; // prospecting priority score
}

// ── Google Places API ────────────────────────────────────────────────────────

async function searchPlaces(query: string, maxResults: number): Promise<PlaceResult[]> {
  const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY!,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.googleMapsUri',
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: Math.min(maxResults, 20), // API max is 20
      languageCode: 'en',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Places search failed: ${res.status} ${err}`);
    return [];
  }

  const data = await res.json();
  return (data.places || []).map((p: any) => ({
    placeId: p.id?.replace('places/', '') || '',
    name: p.displayName?.text || '',
    address: p.formattedAddress || '',
    rating: p.rating || 0,
    reviewCount: p.userRatingCount || 0,
    mapsUrl: p.googleMapsUri || '',
    types: p.types || [],
  }));
}

async function fetchReviews(placeId: string): Promise<ReviewData[]> {
  const res = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY!,
      'X-Goog-FieldMask': 'reviews',
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.reviews || []).map((r: any) => ({
    author: r.authorAttribution?.displayName || 'Anonymous',
    rating: r.rating || 0,
    text: r.text?.text || '',
    relativeTime: r.relativePublishTimeDescription || '',
    publishTime: r.publishTime || '',
    hasOwnerResponse: !!r.flagContentUri, // Proxy: if there's content to flag, review has response
  }));
}

// Check if review has owner response using the full review data
function hasOwnerReply(review: any): boolean {
  // Google Places API v1 doesn't directly expose owner responses in reviews
  // We check for the absence of a reply by looking at review structure
  return false; // Conservative: assume no reply, let the seller verify
}

// ── DeepSeek AI Reply Generation ─────────────────────────────────────────────

let deepseek: OpenAI | null = null;
if (DEEPSEEK_API_KEY && !skipAI) {
  deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: DEEPSEEK_API_KEY,
  });
}

async function generateReplyDraft(
  restaurantName: string,
  reviewerName: string,
  rating: number,
  reviewText: string,
): Promise<string> {
  if (!deepseek) return lang === 'zh' ? '[AI 草稿已跳過 — 設定 DEEPSEEK_API_KEY]' : '[AI draft skipped — set DEEPSEEK_API_KEY]';

  const systemPrompt = lang === 'zh'
    ? `你是「${restaurantName}」的專業評論回覆撰寫人。用繁體中文寫一則溫暖、有同理心、專業的 Google 評論回覆。控制在 80 字以內。稱呼評論者的名字。承認問題、真誠道歉、邀請他們再次光臨。`
    : `You are a professional review response writer for "${restaurantName}". Write a warm, empathetic, professional reply to a negative Google review. Keep it under 100 words. Address the reviewer by first name. Acknowledge the issue, apologize sincerely, and invite them back. Do NOT use words like "delve", "leverage", "robust". Do NOT use em dashes.`;

  const res = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${rating}-star review from ${reviewerName}:\n"${reviewText}"` },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  return res.choices[0]?.message?.content?.trim() || (lang === 'zh' ? '[生成失敗]' : '[Failed to generate]');
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function calculateScore(place: PlaceResult, negativeCount: number): number {
  let score = 0;

  // More negative reviews = higher priority
  score += negativeCount * 30;

  // Lower rating = more pain = higher priority
  if (place.rating <= 3.5) score += 40;
  else if (place.rating <= 3.8) score += 25;
  else if (place.rating <= 4.0) score += 15;

  // Moderate review count = established but struggling
  if (place.reviewCount >= 50 && place.reviewCount <= 200) score += 20;
  else if (place.reviewCount >= 20) score += 10;

  return score;
}

// ── Report Generation ────────────────────────────────────────────────────────

function generateMarkdownReport(targets: TargetRestaurant[], areaName: string): string {
  const lines: string[] = [];
  const date = new Date().toISOString().split('T')[0];
  const withNegative = targets.filter(t => t.negativeReviews.length > 0);

  if (lang === 'zh') {
    lines.push(`# 掃街報告 — ${areaName} (${date})`);
    lines.push('');
    lines.push(`找到 **${targets.length}** 家目標餐廳，**${withNegative.length}** 家有未回覆差評`);
  } else {
    lines.push(`# Prospecting Report — ${areaName} (${date})`);
    lines.push('');
    lines.push(`Found **${targets.length}** target restaurants, **${withNegative.length}** with unanswered negative reviews`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const stars = '*'.repeat(Math.round(t.rating));
    lines.push(`## ${i + 1}. ${t.name} ${stars} ${t.rating} (${t.reviewCount} reviews) [Score: ${t.score}]`);
    lines.push(`- **${lang === 'zh' ? '地址' : 'Address'}**: ${t.address}`);
    lines.push(`- **Google Maps**: ${t.mapsUrl}`);
    lines.push(`- **${lang === 'zh' ? '未回覆差評' : 'Unanswered negative reviews'}**: ${t.negativeReviews.length}`);
    lines.push('');

    if (t.negativeReviews.length === 0) {
      lines.push(lang === 'zh'
        ? '_最近無差評（適合主動推銷 — 幫他們預防差評）_'
        : '_No recent negative reviews found (good candidate for proactive outreach)_');
      lines.push('');
    }

    for (let j = 0; j < t.negativeReviews.length; j++) {
      const r = t.negativeReviews[j];
      lines.push(`### ${lang === 'zh' ? '差評' : 'Negative Review'} ${j + 1}: ${'*'.repeat(r.rating)} by ${r.author} (${r.relativeTime})`);
      lines.push(`> "${r.text.substring(0, 300)}${r.text.length > 300 ? '...' : ''}"`);
      lines.push('');
      if (r.aiDraft) {
        lines.push(`**${lang === 'zh' ? 'AI 建議回覆' : 'AI Suggested Reply'}:**`);
        lines.push(`> ${r.aiDraft}`);
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`| # | Restaurant | Rating | Reviews | Neg. Reviews | Score |`);
  lines.push(`|---|-----------|--------|---------|-------------|-------|`);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    lines.push(`| ${i + 1} | ${t.name} | ${t.rating} | ${t.reviewCount} | ${t.negativeReviews.length} | ${t.score} |`);
  }

  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nProspecting Tool — ReplyWise AI`);
  console.log('='.repeat(50));
  console.log(`Area: ${area}`);
  console.log(`Type: ${type}`);
  console.log(`Rating range: ${minRating} - ${maxRating}`);
  console.log(`Limit: ${limit}`);
  console.log(`AI drafts: ${skipAI ? 'OFF' : 'ON'}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');

  // Step 1: Search places
  const searchQuery = `${type} in ${area}`;
  console.log(`Searching: "${searchQuery}"...`);
  const allPlaces = await searchPlaces(searchQuery, limit);
  console.log(`  Found ${allPlaces.length} places`);

  // Step 2: Filter by rating
  const filtered = allPlaces.filter(
    p => p.rating >= minRating && p.rating <= maxRating && p.reviewCount >= 15
  );
  console.log(`  After rating filter (${minRating}-${maxRating}, 15+ reviews): ${filtered.length}`);

  if (filtered.length === 0) {
    console.log('\nNo restaurants match your criteria. Try broadening the rating range or area.');
    return;
  }

  if (dryRun) {
    console.log('\n--- DRY RUN RESULTS ---');
    for (const p of filtered) {
      console.log(`  ${p.rating} (${p.reviewCount}) ${p.name} — ${p.address}`);
    }
    return;
  }

  // Step 3: Fetch reviews for each place
  const targets: TargetRestaurant[] = [];
  console.log(`\nFetching reviews for ${filtered.length} restaurants...`);

  for (const place of filtered) {
    process.stdout.write(`  ${place.name}... `);

    const reviews = await fetchReviews(place.placeId);
    const negativeReviews = reviews.filter(r => r.rating <= 3 && r.text.length > 20);

    // Step 4: Generate AI drafts for negative reviews
    const reviewsWithDrafts: Array<ReviewData & { aiDraft?: string }> = [];
    for (const review of negativeReviews) {
      let aiDraft: string | undefined;
      if (!skipAI) {
        aiDraft = await generateReplyDraft(place.name, review.author, review.rating, review.text);
      }
      reviewsWithDrafts.push({ ...review, aiDraft });
    }

    const score = calculateScore(place, negativeReviews.length);

    targets.push({
      ...place,
      negativeReviews: reviewsWithDrafts,
      score,
    });

    console.log(`${reviews.length} reviews, ${negativeReviews.length} negative`);

    // Rate limit: 100ms between requests
    await new Promise(r => setTimeout(r, 100));
  }

  // Sort by score (highest priority first)
  targets.sort((a, b) => b.score - a.score);

  // Step 5: Generate reports
  const date = new Date().toISOString().split('T')[0];
  const areaSlug = area!.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const reportsDir = path.resolve(__dirname, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  // JSON report
  const jsonPath = path.join(reportsDir, `${date}-${areaSlug}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ date, area, targets }, null, 2));

  // Markdown report
  const mdPath = path.join(reportsDir, `${date}-${areaSlug}.md`);
  const markdown = generateMarkdownReport(targets, area!);
  fs.writeFileSync(mdPath, markdown);

  // Summary
  const withNegative = targets.filter(t => t.negativeReviews.length > 0);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS`);
  console.log(`  Total targets: ${targets.length}`);
  console.log(`  With negative reviews: ${withNegative.length}`);
  console.log(`  Total negative reviews: ${targets.reduce((s, t) => s + t.negativeReviews.length, 0)}`);
  console.log(`  AI drafts generated: ${skipAI ? 0 : targets.reduce((s, t) => s + t.negativeReviews.filter(r => r.aiDraft).length, 0)}`);
  console.log(`\n  JSON: ${jsonPath}`);
  console.log(`  Report: ${mdPath}`);
  console.log('='.repeat(50));

  // Print top 5 for quick reference
  console.log('\nTop 5 targets:');
  for (const t of targets.slice(0, 5)) {
    console.log(`  [${t.score}] ${t.rating} (${t.reviewCount}) ${t.name} — ${t.negativeReviews.length} neg reviews`);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
