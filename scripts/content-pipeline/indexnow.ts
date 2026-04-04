#!/usr/bin/env npx tsx
/**
 * indexnow.ts — Submit URLs to IndexNow API for search engine re-indexing
 *
 * Fetches sitemap.xml and submits all URLs (or specific paths) to IndexNow.
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/indexnow.ts                    # Submit all sitemap URLs
 *   npx tsx scripts/content-pipeline/indexnow.ts --urls /blog/slug  # Specific paths
 *   npx tsx scripts/content-pipeline/indexnow.ts --dry-run          # Preview only
 *
 * Setup:
 *   1. Generate a key: https://www.indexnow.org/generate-api-key
 *   2. Set INDEXNOW_KEY env var or update the constant below
 *   3. Place key file at public/{key}.txt (auto-created on first run)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });

// ── Config ───────────────────────────────────────────────────────────────────

const DOMAIN = 'replywiseai.com';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '4e63c840-fe0c-4de5-b557-524591d25e9f';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';

// ── Ensure key file exists ───────────────────────────────────────────────────

function ensureKeyFile(): void {
  const keyFilePath = path.resolve(__dirname, '..', '..', 'public', `${INDEXNOW_KEY}.txt`);
  if (!fs.existsSync(keyFilePath)) {
    fs.writeFileSync(keyFilePath, INDEXNOW_KEY);
    console.log(`Created key file: public/${INDEXNOW_KEY}.txt`);
  }
}

// ── Fetch sitemap URLs ───────────────────────────────────────────────────────

async function fetchSitemapUrls(): Promise<string[]> {
  const sitemapUrl = `https://${DOMAIN}/sitemap.xml`;
  try {
    const res = await fetch(sitemapUrl);
    if (!res.ok) {
      console.error(`Failed to fetch ${sitemapUrl}: ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const urls: string[] = [];
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  } catch (err) {
    console.error(`Error fetching sitemap:`, err);
    return [];
  }
}

// ── Submit URLs ──────────────────────────────────────────────────────────────

async function submitUrls(urls: string[], dryRun: boolean): Promise<void> {
  if (urls.length === 0) {
    console.log('No URLs to submit.');
    return;
  }

  // IndexNow accepts max 10,000 URLs per batch
  const batchSize = 10000;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);

    const payload = {
      host: DOMAIN,
      key: INDEXNOW_KEY,
      keyLocation: `https://${DOMAIN}/${INDEXNOW_KEY}.txt`,
      urlList: batch,
    };

    if (dryRun) {
      console.log(`DRY RUN: would submit ${batch.length} URLs`);
      batch.slice(0, 5).forEach(u => console.log(`  ${u}`));
      if (batch.length > 5) console.log(`  ... and ${batch.length - 5} more`);
      continue;
    }

    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 202) {
        console.log(`Submitted ${batch.length} URLs (HTTP ${res.status})`);
      } else {
        const body = await res.text();
        console.error(`HTTP ${res.status}: ${body}`);
      }
    } catch (err) {
      console.error('Network error:', err);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const urlsArgIdx = args.indexOf('--urls');
  const specificPaths = urlsArgIdx !== -1
    ? args.slice(urlsArgIdx + 1).filter(a => !a.startsWith('--'))
    : [];

  console.log(`IndexNow Submission${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`Domain: ${DOMAIN}`);
  console.log(`Key: ${INDEXNOW_KEY}\n`);

  ensureKeyFile();

  let urls: string[];
  if (specificPaths.length > 0) {
    urls = specificPaths.map(p => `https://${DOMAIN}${p.startsWith('/') ? p : '/' + p}`);
    console.log(`Submitting ${urls.length} specific URL(s)`);
  } else {
    console.log('Fetching sitemap...');
    urls = await fetchSitemapUrls();
    console.log(`Found ${urls.length} URLs in sitemap`);
  }

  await submitUrls(urls, dryRun);
  console.log('\nDone.');
}

main().catch(console.error);
