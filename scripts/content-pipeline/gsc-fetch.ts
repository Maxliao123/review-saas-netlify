#!/usr/bin/env npx tsx
/**
 * gsc-fetch.ts — Fetch GSC Search Analytics data for ReplyWise AI
 *
 * Pulls search performance data (impressions, clicks, CTR, position)
 * and outputs structured JSON for topic generation and gap analysis.
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/gsc-fetch.ts                # Last 28 days
 *   npx tsx scripts/content-pipeline/gsc-fetch.ts --days 90      # Last 90 days
 *
 * Environment:
 *   GSC_SERVICE_ACCOUNT_JSON  — Base64-encoded service account JSON (for CI)
 *   GSC_SERVICE_ACCOUNT_PATH  — Path to service account JSON file (local)
 */

import { google, searchconsole_v1 } from 'googleapis';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });

// ── Config ───────────────────────────────────────────────────────────────────

const DOMAIN = 'replywiseai.com';
const GSC_PROPERTY = `sc-domain:${DOMAIN}`;

const SERVICE_ACCOUNT_PATH = process.env.GSC_SERVICE_ACCOUNT_PATH
  || path.resolve(__dirname, '..', '..', 'gsc-service-account.json');

function getServiceAccountCredentials(): object | null {
  // Option 1: Base64-encoded JSON in env var (GitHub Actions)
  const envJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (envJson) {
    try {
      return JSON.parse(Buffer.from(envJson, 'base64').toString('utf-8'));
    } catch {
      try { return JSON.parse(envJson); } catch { /* fall through */ }
    }
  }

  // Option 2: File path
  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    return JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  }

  return null;
}

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const daysBack = parseInt(getArg('days') || '28', 10);

// ── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    console.error('No service account credentials found.');
    console.error('Set GSC_SERVICE_ACCOUNT_JSON env var or place gsc-service-account.json in project root.');
    process.exit(1);
  }

  return new google.auth.GoogleAuth({
    credentials: credentials as any,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

interface GscRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface DomainInsights {
  summary: {
    totalImpressions: number;
    totalClicks: number;
    avgCTR: number;
    avgPosition: number;
    uniqueQueries: number;
    uniquePages: number;
  };
  topQueries: Array<{ query: string; impressions: number; clicks: number; position: number }>;
  lowHangingFruit: Array<{ query: string; impressions: number; position: number; page: string }>;
  contentGaps: Array<{ query: string; impressions: number; position: number }>;
  topPages: Array<{ page: string; impressions: number; clicks: number; ctr: number }>;
}

export interface GscReport {
  generated: string;
  period: { start: string; end: string; days: number };
  domain: string;
  insights: DomainInsights;
}

// ── GSC Data Fetching ────────────────────────────────────────────────────────

async function fetchGscData(
  searchconsole: searchconsole_v1.Searchconsole,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<GscRow[]> {
  const allRows: GscRow[] = [];
  let startRow = 0;

  while (true) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page'],
        rowLimit: 25000,
        startRow,
      },
    });

    const rows = res.data.rows || [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const [query, page] = row.keys || [];
      allRows.push({
        query: query || '',
        page: page || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }

    console.log(`  Fetched ${allRows.length} rows...`);
    if (rows.length < 25000) break;
    startRow += rows.length;
  }

  return allRows;
}

// ── Analysis ─────────────────────────────────────────────────────────────────

function getExistingSlugs(): Set<string> {
  // Read from blog-data-generated.ts to find existing article slugs
  const generatedPath = path.resolve(__dirname, '..', '..', 'src', 'lib', 'blog-data-generated.ts');
  const manualPath = path.resolve(__dirname, '..', '..', 'src', 'lib', 'blog-data.ts');
  const slugs = new Set<string>();

  for (const filePath of [generatedPath, manualPath]) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const slugMatches = content.matchAll(/slug:\s*['"]([^'"]+)['"]/g);
    for (const match of slugMatches) {
      slugs.add(match[1]);
    }
  }

  return slugs;
}

function analyzeGscData(rows: GscRow[], existingSlugs: Set<string>): DomainInsights {
  // Aggregate by query
  const queryMap = new Map<string, { impressions: number; clicks: number; positions: number[]; pages: string[] }>();
  for (const row of rows) {
    const existing = queryMap.get(row.query) || { impressions: 0, clicks: 0, positions: [], pages: [] };
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.positions.push(row.position);
    if (!existing.pages.includes(row.page)) existing.pages.push(row.page);
    queryMap.set(row.query, existing);
  }

  // Aggregate by page
  const pageMap = new Map<string, { impressions: number; clicks: number; queries: number }>();
  for (const row of rows) {
    const existing = pageMap.get(row.page) || { impressions: 0, clicks: 0, queries: 0 };
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.queries += 1;
    pageMap.set(row.page, existing);
  }

  // Summary
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const allPositions = rows.map(r => r.position).filter(p => p > 0);

  // Top queries
  const topQueries = [...queryMap.entries()]
    .map(([query, data]) => ({
      query,
      impressions: data.impressions,
      clicks: data.clicks,
      position: data.positions.reduce((a, b) => a + b, 0) / data.positions.length,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 50);

  // Low-hanging fruit: position 8-20 with decent impressions
  const lowHangingFruit = rows
    .filter(r => r.position >= 8 && r.position <= 20 && r.impressions >= 3)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)
    .map(r => ({ query: r.query, impressions: r.impressions, position: Math.round(r.position * 10) / 10, page: r.page }));

  // Content gaps: queries with impressions but no matching blog article
  const contentGaps = [...queryMap.entries()]
    .filter(([query, data]) => {
      const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const hasPage = data.pages.some(p => p.includes('/blog/'));
      return data.impressions >= 5 && !hasPage && !existingSlugs.has(slug);
    })
    .map(([query, data]) => ({
      query,
      impressions: data.impressions,
      position: data.positions.reduce((a, b) => a + b, 0) / data.positions.length,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30);

  // Top pages
  const topPages = [...pageMap.entries()]
    .filter(([page]) => page.includes('/blog/'))
    .map(([page, data]) => ({
      page,
      impressions: data.impressions,
      clicks: data.clicks,
      ctr: data.impressions > 0 ? data.clicks / data.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30);

  return {
    summary: {
      totalImpressions,
      totalClicks,
      avgCTR: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      avgPosition: allPositions.length > 0 ? allPositions.reduce((a, b) => a + b, 0) / allPositions.length : 0,
      uniqueQueries: queryMap.size,
      uniquePages: pageMap.size,
    },
    topQueries,
    lowHangingFruit,
    contentGaps,
    topPages,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const auth = getAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - daysBack);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  console.log(`GSC Fetch: ${DOMAIN}`);
  console.log(`Period: ${fmt(startDate)} to ${fmt(endDate)} (${daysBack} days)\n`);

  // Fetch GSC data
  console.log('Fetching GSC search analytics...');
  const gscRows = await fetchGscData(searchconsole, GSC_PROPERTY, fmt(startDate), fmt(endDate));
  console.log(`Got ${gscRows.length} rows\n`);

  // Get existing slugs from static files
  const existingSlugs = getExistingSlugs();
  console.log(`Existing articles: ${existingSlugs.size}`);

  // Analyze
  const insights = analyzeGscData(gscRows, existingSlugs);

  // Print summary
  console.log(`\nSummary:`);
  console.log(`  Impressions: ${insights.summary.totalImpressions}`);
  console.log(`  Clicks: ${insights.summary.totalClicks}`);
  console.log(`  Avg CTR: ${(insights.summary.avgCTR * 100).toFixed(1)}%`);
  console.log(`  Avg Position: ${insights.summary.avgPosition.toFixed(1)}`);
  console.log(`  Content Gaps: ${insights.contentGaps.length}`);
  console.log(`  Low-hanging Fruit: ${insights.lowHangingFruit.length}`);

  // Save report
  const outputDir = path.resolve(__dirname, 'gsc-data');
  fs.mkdirSync(outputDir, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const report: GscReport = {
    generated: date,
    period: { start: fmt(startDate), end: fmt(endDate), days: daysBack },
    domain: DOMAIN,
    insights,
  };

  const outputPath = path.join(outputDir, `live-performance-${date}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nSaved to: ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
