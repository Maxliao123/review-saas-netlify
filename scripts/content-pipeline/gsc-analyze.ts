#!/usr/bin/env npx tsx
/**
 * gsc-analyze.ts — GSC Content Gap Analyzer for ReplyWise AI
 *
 * Reads GSC data, compares against existing blog articles, finds content gaps,
 * and generates prioritized article briefs.
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/gsc-analyze.ts                     # Full analysis
 *   npx tsx scripts/content-pipeline/gsc-analyze.ts --days 90           # Last 90 days
 *   npx tsx scripts/content-pipeline/gsc-analyze.ts --min-impressions 10
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

// ── Intent detection keywords (adapted for review management domain) ─────────

const INTENT_KEYWORDS: Record<string, string[]> = {
  guide: ['best', 'top', 'guide', 'where', 'how', 'tips', 'list', 'recommend'],
  comparison: ['vs', 'compare', 'difference', 'alternative', 'or', 'versus'],
  'how-to': ['how to', 'setup', 'configure', 'create', 'build', 'implement'],
  industry: [
    'restaurant', 'hotel', 'dental', 'clinic', 'salon', 'spa',
    'gym', 'auto repair', 'law firm', 'retail', 'cafe', 'barbershop',
  ],
  local: [
    'vancouver', 'toronto', 'canada', 'local', 'city', 'near me',
  ],
};

// ── Types ────────────────────────────────────────────────────────────────────

interface GscRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface ContentGap {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
}

interface ArticleBrief {
  slug: string;
  target_keyword: string;
  related_queries: string[];
  total_impressions: number;
  total_clicks: number;
  avg_position: number;
  intent_type: string;
  priority: 'P0' | 'P1' | 'P2';
}

interface AnalysisReport {
  generated: string;
  config: { days: number; min_impressions: number };
  summary: {
    total_queries: number;
    content_gaps: number;
    clusters: number;
    briefs: number;
  };
  briefs: ArticleBrief[];
  declining_articles: Array<{ page: string; impressions: number; position: number }>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function getServiceAccountCredentials(): object | null {
  const envJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (envJson) {
    try {
      return JSON.parse(Buffer.from(envJson, 'base64').toString('utf-8'));
    } catch {
      try { return JSON.parse(envJson); } catch { /* fall through */ }
    }
  }
  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    return JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  }
  return null;
}

function getAuth() {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    console.error('No service account credentials found.');
    process.exit(1);
  }
  return new google.auth.GoogleAuth({
    credentials: credentials as any,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

// ── GSC Fetch ────────────────────────────────────────────────────────────────

async function fetchGscData(
  searchconsole: searchconsole_v1.Searchconsole,
  startDate: string,
  endDate: string,
): Promise<GscRow[]> {
  const allRows: GscRow[] = [];
  let startRow = 0;

  while (true) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: GSC_PROPERTY,
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

    if (rows.length < 25000) break;
    startRow += rows.length;
  }

  return allRows;
}

// ── Existing article slugs (from static files) ──────────────────────────────

function getExistingSlugs(): Set<string> {
  const slugs = new Set<string>();
  const files = [
    path.resolve(__dirname, '..', '..', 'src', 'lib', 'blog-data-generated.ts'),
    path.resolve(__dirname, '..', '..', 'src', 'lib', 'blog-data.ts'),
  ];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.matchAll(/slug:\s*['"]([^'"]+)['"]/g);
    for (const match of matches) slugs.add(match[1]);
  }

  return slugs;
}

// ── Content gap detection ────────────────────────────────────────────────────

function queryMatchesSlug(query: string, slug: string): boolean {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const slugWords = slug.toLowerCase().split(/-/).filter(w => w.length > 2);
  let matchCount = 0;
  for (const qw of queryWords) {
    for (const sw of slugWords) {
      if (qw === sw || sw.includes(qw) || qw.includes(sw)) { matchCount++; break; }
    }
  }
  return matchCount >= 2;
}

function findContentGaps(rows: GscRow[], existingSlugs: Set<string>, minImpressions: number): ContentGap[] {
  const queryAgg = new Map<string, { impressions: number; clicks: number; position: number; count: number }>();

  for (const row of rows) {
    const existing = queryAgg.get(row.query);
    if (existing) {
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.position += row.position;
      existing.count += 1;
    } else {
      queryAgg.set(row.query, { impressions: row.impressions, clicks: row.clicks, position: row.position, count: 1 });
    }
  }

  const gaps: ContentGap[] = [];
  const slugArray = Array.from(existingSlugs);

  for (const [query, agg] of queryAgg) {
    if (agg.impressions < minImpressions) continue;
    const hasMatch = slugArray.some(slug => queryMatchesSlug(query, slug));
    const avgPosition = agg.position / agg.count;

    if (!hasMatch || avgPosition > 20) {
      gaps.push({
        query,
        impressions: agg.impressions,
        clicks: agg.clicks,
        position: Math.round(avgPosition * 10) / 10,
        ctr: Math.round((agg.clicks / agg.impressions) * 10000) / 100,
      });
    }
  }

  gaps.sort((a, b) => b.impressions - a.impressions);
  return gaps;
}

// ── Declining articles ───────────────────────────────────────────────────────

function findDecliningArticles(rows: GscRow[]): Array<{ page: string; impressions: number; position: number }> {
  const pageMap = new Map<string, { impressions: number; positions: number[] }>();

  for (const row of rows) {
    if (!row.page.includes('/blog/')) continue;
    const existing = pageMap.get(row.page) || { impressions: 0, positions: [] };
    existing.impressions += row.impressions;
    existing.positions.push(row.position);
    pageMap.set(row.page, existing);
  }

  return [...pageMap.entries()]
    .map(([page, data]) => ({
      page,
      impressions: data.impressions,
      position: Math.round((data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 10) / 10,
    }))
    .filter(p => p.position > 15) // Articles slipping past page 1-2
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);
}

// ── Clustering + brief generation ────────────────────────────────────────────

function clusterAndBuildBriefs(gaps: ContentGap[]): ArticleBrief[] {
  const clusters = new Map<string, ContentGap[]>();
  const assigned = new Set<string>();

  const sorted = [...gaps].sort((a, b) => b.impressions - a.impressions);

  for (const gap of sorted) {
    if (assigned.has(gap.query)) continue;

    const words = gap.query.toLowerCase().split(/\s+/).filter(w =>
      w.length > 2 && !['the', 'and', 'for', 'with', 'near', 'from', 'how', 'what'].includes(w)
    );
    const clusterKey = words.slice(0, 3).sort().join('-');
    if (!clusterKey) continue;

    if (!clusters.has(clusterKey)) clusters.set(clusterKey, []);
    clusters.get(clusterKey)!.push(gap);
    assigned.add(gap.query);

    // Find related queries
    for (const other of sorted) {
      if (assigned.has(other.query)) continue;
      const otherWords = other.query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const overlap = words.filter(w => otherWords.some(ow => ow === w || ow.includes(w) || w.includes(ow)));
      if (overlap.length >= 2) {
        clusters.get(clusterKey)!.push(other);
        assigned.add(other.query);
      }
    }
  }

  // Build briefs from clusters
  const briefs: ArticleBrief[] = [];

  for (const [, clusterGaps] of clusters) {
    if (clusterGaps.length === 0) continue;

    const bySorted = [...clusterGaps].sort((a, b) => b.impressions - a.impressions);
    const primary = bySorted[0];
    const totalImpressions = bySorted.reduce((sum, g) => sum + g.impressions, 0);
    const totalClicks = bySorted.reduce((sum, g) => sum + g.clicks, 0);
    const avgPosition = Math.round(
      (bySorted.reduce((sum, g) => sum + g.position, 0) / bySorted.length) * 10
    ) / 10;

    let priority: 'P0' | 'P1' | 'P2';
    if (totalImpressions >= 20) priority = 'P0';
    else if (totalImpressions >= 10) priority = 'P1';
    else priority = 'P2';

    // Detect intent
    const q = primary.query.toLowerCase();
    let intentType = 'guide';
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      if (keywords.some(kw => q.includes(kw))) { intentType = intent; break; }
    }

    const slug = primary.query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    briefs.push({
      slug,
      target_keyword: primary.query,
      related_queries: bySorted.slice(1, 6).map(g => g.query),
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      avg_position: avgPosition,
      intent_type: intentType,
      priority,
    });
  }

  const priorityOrder = { P0: 0, P1: 1, P2: 2 };
  briefs.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    return pDiff !== 0 ? pDiff : b.total_impressions - a.total_impressions;
  });

  return briefs;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let days = 28;
  let minImpressions = 5;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) days = parseInt(args[++i], 10);
    else if (args[i] === '--min-impressions' && args[i + 1]) minImpressions = parseInt(args[++i], 10);
  }

  if (isNaN(days) || days < 1) days = 28;
  if (isNaN(minImpressions) || minImpressions < 1) minImpressions = 5;

  return { days, minImpressions };
}

// ── Markdown report ──────────────────────────────────────────────────────────

function generateMarkdown(report: AnalysisReport): string {
  const lines: string[] = [];
  lines.push(`# GSC Content Gap Analysis - ${DOMAIN}`);
  lines.push(`Generated: ${report.generated}`);
  lines.push(`Period: last ${report.config.days} days | Min impressions: ${report.config.min_impressions}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Total queries: ${report.summary.total_queries}`);
  lines.push(`- Content gaps: ${report.summary.content_gaps}`);
  lines.push(`- Clusters: ${report.summary.clusters}`);
  lines.push(`- Briefs generated: ${report.summary.briefs}`);
  lines.push('');

  if (report.briefs.length > 0) {
    lines.push('## Article Briefs');
    lines.push('');
    for (const brief of report.briefs) {
      lines.push(`### [${brief.priority}] ${brief.target_keyword}`);
      lines.push(`- **Slug**: \`${brief.slug}\``);
      lines.push(`- **Intent**: ${brief.intent_type}`);
      lines.push(`- **Impressions**: ${brief.total_impressions} | **Clicks**: ${brief.total_clicks} | **Avg position**: ${brief.avg_position}`);
      if (brief.related_queries.length > 0) {
        lines.push(`- **Related**: ${brief.related_queries.join(', ')}`);
      }
      lines.push('');
    }
  }

  if (report.declining_articles.length > 0) {
    lines.push('## Declining Articles (need update)');
    lines.push('');
    for (const article of report.declining_articles) {
      lines.push(`- **${article.page}** — position ${article.position}, ${article.impressions} impressions`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { days, minImpressions } = parseArgs();

  console.log('=== GSC Content Gap Analyzer ===');
  console.log(`  Domain: ${DOMAIN}`);
  console.log(`  Period: last ${days} days`);
  console.log(`  Min impressions: ${minImpressions}\n`);

  // Auth
  const auth = getAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  // Date range
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // GSC has ~2 day lag
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  console.log(`  Date range: ${fmt(startDate)} to ${fmt(endDate)}\n`);

  // Fetch GSC data
  console.log('Fetching GSC data...');
  const rows = await fetchGscData(searchconsole, fmt(startDate), fmt(endDate));
  console.log(`  Got ${rows.length} rows`);

  if (rows.length === 0) {
    console.log('No data found. Exiting.');
    return;
  }

  // Get existing slugs
  const existingSlugs = getExistingSlugs();
  console.log(`  Existing articles: ${existingSlugs.size}`);

  // Find content gaps
  const gaps = findContentGaps(rows, existingSlugs, minImpressions);
  const uniqueQueries = new Set(rows.map(r => r.query));
  console.log(`  Content gaps: ${gaps.length} (from ${uniqueQueries.size} unique queries)`);

  // Build briefs
  const briefs = clusterAndBuildBriefs(gaps);
  console.log(`  Briefs generated: ${briefs.length}`);

  const p0 = briefs.filter(b => b.priority === 'P0').length;
  const p1 = briefs.filter(b => b.priority === 'P1').length;
  const p2 = briefs.filter(b => b.priority === 'P2').length;
  console.log(`  Priority: P0=${p0}, P1=${p1}, P2=${p2}`);

  // Find declining articles
  const declining = findDecliningArticles(rows);
  console.log(`  Declining articles: ${declining.length}`);

  // Build report
  const today = new Date().toISOString().split('T')[0];
  const report: AnalysisReport = {
    generated: today,
    config: { days, min_impressions: minImpressions },
    summary: {
      total_queries: uniqueQueries.size,
      content_gaps: gaps.length,
      clusters: briefs.length,
      briefs: briefs.length,
    },
    briefs,
    declining_articles: declining,
  };

  // Save outputs
  const outputDir = path.resolve(__dirname, 'gsc-data');
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `content-gaps-${today}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nJSON saved:   ${jsonPath}`);

  const mdPath = path.join(outputDir, `content-gaps-${today}.md`);
  fs.writeFileSync(mdPath, generateMarkdown(report), 'utf-8');
  console.log(`Report saved: ${mdPath}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
