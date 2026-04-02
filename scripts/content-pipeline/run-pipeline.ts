#!/usr/bin/env npx tsx
/**
 * run-pipeline.ts — Master Pipeline Script for ReplyWise AI Content Generation
 *
 * Orchestrates the full content pipeline:
 *   1. Generate topic briefs
 *   2. Generate articles (via DeepSeek V3)
 *   3. Quality check (built into article generator)
 *   4. Generate hero images (via Replicate Flux Schnell)
 *   5. Generate Medium drafts
 *   6. Convert to blog data format
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --batch P0
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --batch all
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --slug specific-article-slug
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --batch P0 --skip-images
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --batch P0 --dry-run
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --step briefs
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --step articles --batch P0
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --step images
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --step medium
 *   npx tsx scripts/content-pipeline/run-pipeline.ts --step convert
 *
 * Environment variables needed:
 *   DEEPSEEK_API_KEY      — For article generation
 *   REPLICATE_API_TOKEN   — For image generation (optional if --skip-images)
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';

// ── Configuration ──────────────────────────────────────────────────────────

const SCRIPTS_DIR = path.resolve(__dirname);
const TSX = 'npx tsx';

// ── Helpers ────────────────────────────────────────────────────────────────

function run(command: string, description: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STEP: ${description}`);
  console.log(`CMD:  ${command}`);
  console.log('='.repeat(60) + '\n');

  try {
    execSync(command, {
      cwd: path.resolve(__dirname, '..', '..'),
      stdio: 'inherit',
      env: { ...process.env },
    });
  } catch (err: unknown) {
    const code = (err as { status?: number }).status;
    console.error(`\nStep failed with exit code ${code}: ${description}`);
    throw err;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const batchArg = args.includes('--batch') ? args[args.indexOf('--batch') + 1] : null;
  const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;
  const skipImages = args.includes('--skip-images');
  const dryRun = args.includes('--dry-run');
  const stepArg = args.includes('--step') ? args[args.indexOf('--step') + 1] : null;

  const startTime = Date.now();

  console.log('ReplyWise AI Content Pipeline');
  console.log('='.repeat(40));
  console.log(`Batch: ${batchArg || 'all'}`);
  console.log(`Slug filter: ${slugArg || 'none'}`);
  console.log(`Skip images: ${skipImages}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Step: ${stepArg || 'all'}`);
  console.log();

  // Build filter args
  const filterArgs: string[] = [];
  if (batchArg && batchArg.toLowerCase() !== 'all') filterArgs.push('--batch', batchArg);
  if (slugArg) filterArgs.push('--slug', slugArg);
  if (dryRun) filterArgs.push('--dry-run');
  const filterStr = filterArgs.join(' ');

  const steps: { name: string; step: string; command: string; skip?: boolean }[] = [
    {
      name: 'Generate Topic Briefs',
      step: 'briefs',
      command: `${TSX} ${path.join(SCRIPTS_DIR, 'topic-generator.ts')} ${filterStr}`.trim(),
    },
    {
      name: 'Generate Articles',
      step: 'articles',
      command: `${TSX} ${path.join(SCRIPTS_DIR, 'article-generator.ts')} ${filterStr}`.trim(),
    },
    {
      name: 'Generate Hero Images',
      step: 'images',
      command: `${TSX} ${path.join(SCRIPTS_DIR, 'image-generator.ts')} ${slugArg ? `--slug ${slugArg}` : ''} ${dryRun ? '--dry-run' : ''}`.trim(),
      skip: skipImages,
    },
    {
      name: 'Generate Medium Drafts',
      step: 'medium',
      command: `${TSX} ${path.join(SCRIPTS_DIR, 'medium-generator.ts')} ${slugArg ? `--slug ${slugArg}` : ''}`.trim(),
    },
    {
      name: 'Convert to Blog Data',
      step: 'convert',
      command: `${TSX} ${path.join(SCRIPTS_DIR, 'convert-to-blogdata.ts')} ${slugArg ? `--slug ${slugArg}` : ''} --append`.trim(),
    },
  ];

  // Filter to single step if specified
  const stepsToRun = stepArg
    ? steps.filter(s => s.step === stepArg)
    : steps;

  if (stepsToRun.length === 0) {
    console.error(`Unknown step: ${stepArg}`);
    console.error('Available steps: briefs, articles, images, medium, convert');
    process.exit(1);
  }

  let completedSteps = 0;

  for (const step of stepsToRun) {
    if (step.skip) {
      console.log(`\n--- Skipping: ${step.name} ---`);
      continue;
    }

    try {
      run(step.command, step.name);
      completedSteps++;
    } catch {
      console.error(`\nPipeline stopped at: ${step.name}`);
      console.error('Fix the issue and re-run with --step to resume from a specific step.');
      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log('PIPELINE COMPLETE');
  console.log(`  Steps completed: ${completedSteps}/${stepsToRun.filter(s => !s.skip).length}`);
  console.log(`  Total time: ${elapsed}s`);
  console.log('='.repeat(60));

  if (!dryRun) {
    console.log('\nNext steps:');
    console.log('  1. Review generated articles in scripts/content-pipeline/output/');
    console.log('  2. Review quality report in scripts/content-pipeline/output/_quality-report.json');
    console.log('  3. Review hero images in public/blog/*/hero.webp');
    console.log('  4. Review Medium drafts in scripts/content-pipeline/medium-drafts/');
    console.log('  5. Check blog data in src/lib/blog-data-generated.ts');
    console.log('  6. Run: npx tsc --noEmit (to verify TypeScript)');
    console.log('  7. Deploy to see articles on production');
  }
}

main();
