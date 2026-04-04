#!/usr/bin/env npx tsx
/**
 * content-optimizer.ts — Quality check + SEO audit for generated articles
 *
 * Scans output articles for:
 *   - Anti-AI detection (banned words, em dashes, sentence patterns)
 *   - SEO quality (title length, H2 count, keyword density, internal links)
 *   - Content quality (word count, readability, section balance)
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/content-optimizer.ts                 # All articles
 *   npx tsx scripts/content-pipeline/content-optimizer.ts --slug <slug>   # Single article
 *   npx tsx scripts/content-pipeline/content-optimizer.ts --fix           # Auto-fix with DeepSeek
 *   npx tsx scripts/content-pipeline/content-optimizer.ts --dry-run       # Report only
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });

// ── Banned word lists (shared with article-generator.ts) ─────────────────────

const BANNED_VERBS = [
  'delve', 'leverage', 'utilize', 'facilitate', 'foster', 'bolster',
  'underscore', 'unveil', 'navigate', 'streamline', 'endeavour', 'ascertain', 'elucidate',
];

const BANNED_ADJECTIVES = [
  'robust', 'comprehensive', 'pivotal', 'crucial', 'vital', 'transformative',
  'cutting-edge', 'groundbreaking', 'innovative', 'seamless', 'intricate',
  'nuanced', 'multifaceted', 'holistic',
];

const BANNED_TRANSITIONS = [
  'furthermore', 'moreover', 'notwithstanding', 'that being said',
  'at its core', 'it is worth noting', 'in the realm of',
  'in the landscape of', "in today's fast-paced world", "in today's digital age",
  'in an era of', 'in the ever-evolving landscape',
];

const BANNED_OPENINGS = [
  "let's delve into", 'imagine a world where', "it's important to note that",
];

const BANNED_CONCLUSIONS = [
  'in conclusion', 'to sum up', 'all things considered', 'at the end of the day',
];

const ALL_BANNED = [
  ...BANNED_VERBS, ...BANNED_ADJECTIVES, ...BANNED_TRANSITIONS,
  ...BANNED_OPENINGS, ...BANNED_CONCLUSIONS,
];

// ── Types ────────────────────────────────────────────────────────────────────

interface QualityScore {
  slug: string;
  antiAI: {
    score: number; // 0-100, higher = more human-like
    bannedWordsFound: string[];
    emDashCount: number;
  };
  seo: {
    score: number; // 0-100
    titleLength: number;
    h2Count: number;
    wordCount: number;
    hasInternalLinks: boolean;
    hasFAQ: boolean;
  };
  content: {
    score: number; // 0-100
    sectionCount: number;
    avgSectionLength: number;
    readTimeMinutes: number;
  };
  overall: number; // 0-100
  verdict: 'PASS' | 'REVIEW' | 'FAIL';
  issues: string[];
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function analyzeArticle(slug: string, markdown: string, briefJson: string | null): QualityScore {
  const lower = markdown.toLowerCase();
  const issues: string[] = [];

  // --- Anti-AI Score ---
  const bannedWordsFound: string[] = [];
  for (const word of ALL_BANNED) {
    if (lower.includes(word.toLowerCase())) {
      bannedWordsFound.push(word);
    }
  }

  const emDashCount = (markdown.match(/\u2014/g) || []).length;

  let antiAIScore = 100;
  antiAIScore -= bannedWordsFound.length * 8;
  antiAIScore -= emDashCount * 3;
  antiAIScore = Math.max(0, Math.min(100, antiAIScore));

  if (bannedWordsFound.length > 0) {
    issues.push(`Anti-AI: found banned words: ${bannedWordsFound.join(', ')}`);
  }
  if (emDashCount > 3) {
    issues.push(`Anti-AI: ${emDashCount} em dashes found (max 3 recommended)`);
  }

  // --- SEO Score ---
  const lines = markdown.split('\n');
  const titleLine = lines.find(l => l.startsWith('# '));
  const titleLength = titleLine ? titleLine.replace('# ', '').length : 0;
  const h2Count = lines.filter(l => /^## /.test(l)).length;
  const wordCount = markdown.split(/\s+/).length;
  const hasInternalLinks = /\[.*?\]\(\/.*?\)/.test(markdown);
  const hasFAQ = fs.existsSync(path.resolve(__dirname, 'output', slug, 'faq.txt'));

  let seoScore = 100;
  if (titleLength < 30 || titleLength > 70) { seoScore -= 15; issues.push(`SEO: title length ${titleLength} (target 30-70)`); }
  if (h2Count < 4) { seoScore -= 15; issues.push(`SEO: only ${h2Count} H2 headings (target 4+)`); }
  if (h2Count > 12) { seoScore -= 5; issues.push(`SEO: ${h2Count} H2 headings (may be too many)`); }
  if (wordCount < 1000) { seoScore -= 20; issues.push(`SEO: only ${wordCount} words (target 1000+)`); }
  if (!hasInternalLinks) { seoScore -= 10; issues.push('SEO: no internal links found'); }
  if (!hasFAQ) { seoScore -= 10; issues.push('SEO: no FAQ section (missing rich results opportunity)'); }
  seoScore = Math.max(0, Math.min(100, seoScore));

  // --- Content Score ---
  const sections = lines.reduce((acc, line) => {
    if (/^## /.test(line)) acc.push([]);
    if (acc.length > 0) acc[acc.length - 1].push(line);
    return acc;
  }, [] as string[][]);

  const sectionLengths = sections.map(s => s.join(' ').split(/\s+/).length);
  const avgSectionLength = sectionLengths.length > 0
    ? Math.round(sectionLengths.reduce((a, b) => a + b, 0) / sectionLengths.length)
    : 0;
  const readTimeMinutes = Math.ceil(wordCount / 200);

  let contentScore = 100;
  if (sections.length < 3) { contentScore -= 20; issues.push('Content: fewer than 3 sections'); }
  if (avgSectionLength < 100) { contentScore -= 10; issues.push(`Content: avg section only ${avgSectionLength} words`); }
  if (avgSectionLength > 500) { contentScore -= 5; issues.push(`Content: avg section ${avgSectionLength} words (consider splitting)`); }
  contentScore = Math.max(0, Math.min(100, contentScore));

  // --- Overall ---
  const overall = Math.round(antiAIScore * 0.35 + seoScore * 0.4 + contentScore * 0.25);

  let verdict: 'PASS' | 'REVIEW' | 'FAIL';
  if (overall >= 75) verdict = 'PASS';
  else if (overall >= 50) verdict = 'REVIEW';
  else verdict = 'FAIL';

  return {
    slug,
    antiAI: { score: antiAIScore, bannedWordsFound, emDashCount },
    seo: { score: seoScore, titleLength, h2Count, wordCount, hasInternalLinks, hasFAQ },
    content: { score: contentScore, sectionCount: sections.length, avgSectionLength, readTimeMinutes },
    overall,
    verdict,
    issues,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const slugFilter = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;
  const dryRun = args.includes('--dry-run');

  const outputDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    console.error('No output directory found. Run article-generator.ts first.');
    process.exit(1);
  }

  // Get all article slugs
  let slugs = fs.readdirSync(outputDir)
    .filter(d => !d.startsWith('_') && fs.statSync(path.join(outputDir, d)).isDirectory())
    .filter(d => fs.existsSync(path.join(outputDir, d, 'document.md')));

  if (slugFilter) {
    slugs = slugs.filter(s => s === slugFilter);
  }

  console.log(`Content Optimizer: analyzing ${slugs.length} articles...\n`);

  const results: QualityScore[] = [];
  let pass = 0, review = 0, fail = 0;

  for (const slug of slugs) {
    const docPath = path.join(outputDir, slug, 'document.md');
    const briefPath = path.join(outputDir, slug, 'brief.json');
    const markdown = fs.readFileSync(docPath, 'utf-8');
    const briefJson = fs.existsSync(briefPath) ? fs.readFileSync(briefPath, 'utf-8') : null;

    const result = analyzeArticle(slug, markdown, briefJson);
    results.push(result);

    const icon = result.verdict === 'PASS' ? 'v' : result.verdict === 'REVIEW' ? '!' : 'x';
    console.log(`  [${icon}] ${result.verdict.padEnd(6)} ${result.overall}/100  ${slug}`);

    if (result.issues.length > 0 && !dryRun) {
      for (const issue of result.issues) {
        console.log(`         ${issue}`);
      }
    }

    if (result.verdict === 'PASS') pass++;
    else if (result.verdict === 'REVIEW') review++;
    else fail++;
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${pass} PASS, ${review} REVIEW, ${fail} FAIL`);
  console.log(`Average score: ${Math.round(results.reduce((s, r) => s + r.overall, 0) / results.length)}/100`);

  // Save report
  const reportPath = path.join(outputDir, '_quality-report.json');
  const report = {
    generated: new Date().toISOString(),
    summary: { total: results.length, pass, review, fail },
    articles: results,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved: ${reportPath}`);
}

main();
