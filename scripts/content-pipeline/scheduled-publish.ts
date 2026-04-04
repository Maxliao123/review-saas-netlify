#!/usr/bin/env npx tsx
/**
 * scheduled-publish.ts — Controlled-pace article publishing
 *
 * Determines which articles in output/ haven't been published yet
 * and publishes them according to Seed -> Ramp-up -> Cruise cadence.
 *
 * "Publishing" = running convert-to-blogdata.ts for selected articles,
 * which adds them to src/lib/blog-data-generated.ts (static file).
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/scheduled-publish.ts
 *   npx tsx scripts/content-pipeline/scheduled-publish.ts --force-count 5
 *   npx tsx scripts/content-pipeline/scheduled-publish.ts --dry-run
 *
 * Environment:
 *   FORCE_COUNT  — Override article count (default: auto by phase)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const TRACKER_PATH = path.resolve(__dirname, 'publish-tracker.json');

// ── Phase config (Seed → Ramp-up → Cruise) ──────────────────────────────────

const PHASES = {
  seed:   { maxArticles: 10, label: 'Seed (initial batch, publish up to 10 at once)' },
  rampUp: { maxArticles: 2,  label: 'Ramp-up (2 articles/day until 50 published)' },
  cruise: { maxArticles: 1,  label: 'Cruise (1 article/day)', minDaysSinceLast: 1 },
} as const;

type Phase = keyof typeof PHASES;

function getPhase(publishedCount: number): Phase {
  if (publishedCount === 0) return 'seed';
  if (publishedCount < 50) return 'rampUp';
  return 'cruise';
}

// ── Publish tracker ──────────────────────────────────────────────────────────

interface TrackerEntry {
  slug: string;
  publishedAt: string;
}

interface Tracker {
  entries: TrackerEntry[];
}

function readTracker(): Tracker {
  if (!fs.existsSync(TRACKER_PATH)) {
    return { entries: [] };
  }
  return JSON.parse(fs.readFileSync(TRACKER_PATH, 'utf-8'));
}

function writeTracker(tracker: Tracker): void {
  fs.writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2));
}

// ── Get available (unpublished) articles ─────────────────────────────────────

function getAvailableArticles(): string[] {
  if (!fs.existsSync(OUTPUT_DIR)) return [];

  return fs.readdirSync(OUTPUT_DIR)
    .filter(d => !d.startsWith('_') && !d.startsWith('.'))
    .filter(d => {
      const stat = fs.statSync(path.join(OUTPUT_DIR, d));
      return stat.isDirectory();
    })
    .filter(d => fs.existsSync(path.join(OUTPUT_DIR, d, 'document.md')))
    .sort();
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const forceCountArg = args.includes('--force-count')
    ? parseInt(args[args.indexOf('--force-count') + 1], 10)
    : parseInt(process.env.FORCE_COUNT || '0', 10);
  const forceCount = isNaN(forceCountArg) ? 0 : forceCountArg;

  console.log(`Scheduled Publisher${dryRun ? ' (DRY RUN)' : ''}`);
  console.log('='.repeat(50));

  // Read tracker
  const tracker = readTracker();
  const publishedSlugs = new Set(tracker.entries.map(e => e.slug));

  // Get all available articles
  const allArticles = getAvailableArticles();

  // Filter to unpublished
  const unpublished = allArticles.filter(slug => !publishedSlugs.has(slug));

  console.log(`  Published: ${publishedSlugs.size}`);
  console.log(`  Available: ${allArticles.length}`);
  console.log(`  Remaining: ${unpublished.length}`);

  if (unpublished.length === 0) {
    console.log('\nNothing to publish.');
    return;
  }

  // Determine phase and count
  const phase = getPhase(publishedSlugs.size);
  const phaseConfig = PHASES[phase];
  let count = forceCount > 0 ? forceCount : phaseConfig.maxArticles;
  count = Math.min(count, unpublished.length);

  // Cruise throttle: skip if last publish was too recent
  if (phase === 'cruise' && forceCount === 0 && tracker.entries.length > 0) {
    const lastEntry = tracker.entries[tracker.entries.length - 1];
    const daysSince = Math.floor(
      (Date.now() - new Date(lastEntry.publishedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSince < PHASES.cruise.minDaysSinceLast) {
      console.log(`\nCruise throttle: last published ${daysSince}d ago (need >= ${PHASES.cruise.minDaysSinceLast}d). Skipping.`);
      return;
    }
  }

  console.log(`\nPhase: ${phaseConfig.label}`);
  console.log(`Publishing ${count} article(s):\n`);

  const toPublish = unpublished.slice(0, count);
  let published = 0;

  for (const slug of toPublish) {
    console.log(`  -> ${slug}`);

    if (dryRun) {
      console.log('     (dry run, skipping)');
      published++;
      continue;
    }

    try {
      // Run convert-to-blogdata for this specific slug
      execSync(
        `npx tsx ${path.join(__dirname, 'convert-to-blogdata.ts')} --slug ${slug} --append`,
        {
          cwd: PROJECT_ROOT,
          stdio: 'inherit',
          env: { ...process.env },
          timeout: 2 * 60 * 1000,
        },
      );

      // Update tracker
      tracker.entries.push({
        slug,
        publishedAt: new Date().toISOString().split('T')[0],
      });
      writeTracker(tracker);

      published++;
      console.log(`     Published.`);
    } catch (err: unknown) {
      const code = (err as { status?: number }).status;
      console.error(`     Failed (exit code ${code}). Continuing with remaining articles.`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done. Published ${published}/${count} article(s).`);
  console.log(`Total published: ${tracker.entries.length}`);
}

main();
