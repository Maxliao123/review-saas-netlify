#!/usr/bin/env npx tsx
/**
 * image-generator.ts — Hero Image Generator for ReplyWise AI Blog
 *
 * Using Replicate Flux Schnell to generate editorial/business photography.
 * Context-aware prompts based on article category and tags.
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/image-generator.ts --dry-run
 *   npx tsx scripts/content-pipeline/image-generator.ts
 *   npx tsx scripts/content-pipeline/image-generator.ts --slug specific-slug
 *
 * Environment:
 *   REPLICATE_API_TOKEN  Required. Get from https://replicate.com/account/api-tokens
 *
 * Cost: ~$0.003 per image (Flux Schnell on Replicate)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.local') });

// ── Config ──────────────────────────────────────────────────────────────────

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const FLUX_MODEL = 'black-forest-labs/flux-schnell';
const REPLICATE_API = 'https://api.replicate.com/v1';
const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public', 'blog');

// ── Prompt Generation ───────────────────────────────────────────────────────

function generateImagePrompt(slug: string, title: string, category: string, tags: string[]): string {
  const t = (title + ' ' + slug.replace(/-/g, ' ') + ' ' + tags.join(' ')).toLowerCase();

  // Industry-specific prompts
  if (t.includes('restaurant') || t.includes('food truck') || t.includes('cafe') || t.includes('coffee'))
    return 'Modern restaurant interior with warm lighting, a tablet showing customer review ratings at the checkout counter, QR code table tent visible, professional food service environment, cozy atmosphere';
  if (t.includes('hotel') || t.includes('hospitality'))
    return 'Elegant hotel lobby with a reception desk, a tablet showing star ratings, modern hospitality environment, warm welcoming lighting, professional service atmosphere';
  if (t.includes('dental') || t.includes('medical') || t.includes('clinic') || t.includes('healthcare') || t.includes('hipaa'))
    return 'Modern medical office waiting room with clean white walls, a tablet on the reception desk showing patient satisfaction ratings, professional healthcare environment, calming blue accents';
  if (t.includes('auto repair') || t.includes('mechanic'))
    return 'Clean auto repair shop reception area with a tablet showing customer reviews, professional automotive service environment, organized workspace with tools visible in background';
  if (t.includes('beauty salon') || t.includes('barbershop') || t.includes('hair'))
    return 'Modern beauty salon interior with stylish mirror stations, a tablet at reception showing star ratings, warm lighting, professional grooming environment';
  if (t.includes('spa') || t.includes('wellness'))
    return 'Relaxing spa reception area with natural elements, bamboo, soft lighting, a tablet showing wellness center reviews, calming neutral tones, luxury atmosphere';
  if (t.includes('real estate') || t.includes('realtor'))
    return 'Professional real estate office with a laptop showing property listings and review ratings, modern desk setup, city view through window, business professional atmosphere';
  if (t.includes('gym') || t.includes('fitness'))
    return 'Modern fitness center entrance with digital display showing member satisfaction ratings, clean gym equipment visible in background, motivational atmosphere';
  if (t.includes('law firm') || t.includes('legal') || t.includes('attorney'))
    return 'Professional law office with dark wood desk, laptop showing client review dashboard, legal books on shelves, sophisticated professional environment';
  if (t.includes('retail') || t.includes('store') || t.includes('shop'))
    return 'Modern retail store interior with clean product displays, a tablet at checkout showing customer review ratings, warm inviting shopping environment';
  if (t.includes('pet grooming'))
    return 'Bright pet grooming salon with a happy dog on the grooming table, a tablet showing 5-star reviews, professional pet care environment, colorful and clean space';

  // Topic-specific prompts
  if (t.includes('negative review') || t.includes('1-star') || t.includes('crisis'))
    return 'Business owner calmly working at laptop in a modern office, reviewing customer feedback on screen, focused and professional demeanor, warm desk lamp lighting, coffee cup nearby';
  if (t.includes('qr code'))
    return 'Close-up of a branded QR code table tent on a restaurant table, smartphone scanning the code visible, modern clean table setting, warm ambient lighting';
  if (t.includes('ai') && (t.includes('automat') || t.includes('response') || t.includes('tool')))
    return 'Split screen showing AI interface on a laptop with review management dashboard, colorful analytics charts, modern workspace with monitor, futuristic yet professional atmosphere';
  if (t.includes('comparison') || t.includes('vs') || t.includes('best') || t.includes('top') || t.includes('tool'))
    return 'Modern workspace with dual monitors showing comparison charts and analytics dashboards, organized desk with notepad and coffee, clean professional environment, blue accent lighting';
  if (t.includes('pricing') || t.includes('free vs paid') || t.includes('roi'))
    return 'Flat lay of business planning materials with a laptop showing pricing comparison table, calculator, notepad with budget calculations, professional desktop arrangement, warm top-down lighting';
  if (t.includes('local seo') || t.includes('ranking') || t.includes('search'))
    return 'Laptop showing Google Maps local search results with business listings and star ratings, modern desk setup, smartphone with Google app visible, clean workspace';
  if (t.includes('google business profile') || t.includes('gbp'))
    return 'Close-up of laptop screen showing Google Business Profile dashboard with review metrics, modern office background, professional workspace setup';
  if (t.includes('star rating') || t.includes('improve'))
    return 'Upward trending graph on a laptop screen showing review rating improvement over time, green arrows, modern desk setup, motivational business environment';
  if (t.includes('positive review'))
    return 'Happy business owner reading positive customer review on tablet, bright natural lighting, modern cafe or office background, genuine smile, warm tones';
  if (t.includes('fake review') || t.includes('removal'))
    return 'Laptop showing a review flagging interface with red warning indicators, magnifying glass icon, modern office desk, focused analytical atmosphere';
  if (t.includes('competitor') || t.includes('market'))
    return 'Strategic business meeting setup with laptops showing competitor analysis dashboards, charts on a presentation screen, modern conference room';
  if (t.includes('analytics') || t.includes('data') || t.includes('growth'))
    return 'Dashboard on a large monitor showing review analytics with sentiment charts, trend lines, and KPI metrics, modern data-driven office environment, blue and green chart colors';
  if (t.includes('multi-location') || t.includes('franchise'))
    return 'Map view on a large screen showing multiple business locations with pin markers and star ratings, modern corporate office, team collaboration environment';
  if (t.includes('strategy') || t.includes('playbook') || t.includes('plan'))
    return 'Strategic planning workspace with whiteboard showing review management workflow, sticky notes, laptop with analytics, modern startup office environment';

  // Location-specific prompts
  if (t.includes('vancouver'))
    return 'Vancouver skyline view from a modern office window, laptop showing business review dashboard on desk, mountains and harbor visible, Pacific Northwest atmosphere';
  if (t.includes('toronto'))
    return 'Toronto business district view from a modern office, CN Tower visible through window, laptop showing review analytics on desk, Canadian urban business atmosphere';
  if (t.includes('canada') || t.includes('bc') || t.includes('british columbia'))
    return 'Modern Canadian business office with a maple leaf accent, laptop showing review management dashboard, warm professional environment, natural wood desk';

  // Compliance/legal prompts
  if (t.includes('ftc') || t.includes('gdpr') || t.includes('compliance') || t.includes('guideline') || t.includes('policy'))
    return 'Professional office desk with legal documents, laptop showing compliance checklist, reading glasses, fountain pen, dark wood desk, serious but organized atmosphere';
  if (t.includes('trend') || t.includes('2026') || t.includes('future'))
    return 'Futuristic office setup with a transparent display showing AI-powered review analytics, holographic data visualization, modern minimalist design, blue and purple accent lighting';

  // Fallback: generic business/review management
  return 'Professional business owner using tablet showing 5-star review management dashboard, modern office environment, warm natural lighting, clean composition, high resolution';
}

// ── Replicate API ───────────────────────────────────────────────────────────

async function callFluxSchnell(prompt: string): Promise<string> {
  const createRes = await fetch(`${REPLICATE_API}/models/${FLUX_MODEL}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt: prompt + '. Modern editorial business photography, natural lighting, professional quality, high resolution, no text or watermarks, no people faces.',
        aspect_ratio: '16:9',
        output_format: 'webp',
        output_quality: 90,
        num_inference_steps: 4,
        go_fast: true,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate API error ${createRes.status}: ${err}`);
  }

  const prediction = await createRes.json() as {
    status: string;
    output?: string[];
    error?: unknown;
    id: string;
  };

  if (prediction.status === 'succeeded' && prediction.output?.length) {
    return prediction.output[0];
  }

  if (prediction.status === 'processing' || prediction.status === 'starting') {
    return pollPrediction(prediction.id);
  }

  throw new Error(`Prediction failed: ${prediction.status} - ${JSON.stringify(prediction.error)}`);
}

async function pollPrediction(id: string): Promise<string> {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`${REPLICATE_API}/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    const prediction = await res.json() as {
      status: string;
      output?: string[];
      error?: unknown;
    };

    if (prediction.status === 'succeeded' && prediction.output) {
      return prediction.output[0];
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(`Prediction ${id} ${prediction.status}: ${JSON.stringify(prediction.error)}`);
    }
    process.stdout.write('.');
  }
  throw new Error(`Prediction ${id} timed out after ${maxAttempts * 2}s`);
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const slugFilter = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

  if (!dryRun && !REPLICATE_API_TOKEN) {
    console.error('REPLICATE_API_TOKEN is required. Set it in .env.local');
    process.exit(1);
  }

  // Find all generated articles
  const outputDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    console.error('No output directory found. Run article-generator.ts first.');
    process.exit(1);
  }

  const articleDirs = fs.readdirSync(outputDir)
    .filter(d => !d.startsWith('_') && fs.statSync(path.join(outputDir, d)).isDirectory())
    .filter(d => !slugFilter || d === slugFilter);

  // Filter to articles that need images
  interface ImageTask {
    slug: string;
    title: string;
    category: string;
    tags: string[];
    prompt: string;
    destPath: string;
  }
  const tasks: ImageTask[] = [];

  for (const slug of articleDirs) {
    const briefPath = path.join(outputDir, slug, 'brief.json');
    const destPath = path.join(PUBLIC_DIR, slug, 'hero.webp');

    // Skip if hero already exists
    if (fs.existsSync(destPath) && !slugFilter) continue;

    if (!fs.existsSync(briefPath)) continue;

    const brief = JSON.parse(fs.readFileSync(briefPath, 'utf-8'));
    const prompt = generateImagePrompt(slug, brief.title, brief.category, brief.tags);

    tasks.push({
      slug,
      title: brief.title,
      category: brief.category,
      tags: brief.tags,
      prompt,
      destPath,
    });
  }

  if (tasks.length === 0) {
    console.log('No images to generate. All articles already have hero images.');
    return;
  }

  console.log(`\nImage Generator - ${tasks.length} images to generate\n`);

  for (const t of tasks) {
    console.log(`  ${t.slug}`);
    console.log(`    Prompt: ${t.prompt.substring(0, 100)}...`);
    console.log(`    Dest: ${t.destPath}`);
    console.log();
  }

  const estCost = tasks.length * 0.003;
  console.log(`Estimated cost: $${estCost.toFixed(3)} (${tasks.length} images x $0.003)\n`);

  if (dryRun) {
    console.log('Dry run complete. Remove --dry-run to generate images.');
    return;
  }

  let success = 0;
  let failed = 0;

  for (const t of tasks) {
    try {
      process.stdout.write(`  Generating ${t.slug} ... `);

      const imageUrl = await callFluxSchnell(t.prompt);
      await downloadImage(imageUrl, t.destPath);
      const fileSize = fs.statSync(t.destPath).size;

      console.log(`OK (${(fileSize / 1024).toFixed(0)} KB)`);
      success++;

      // Rate limit: wait between requests
      if (tasks.indexOf(t) < tasks.length - 1) {
        await new Promise(r => setTimeout(r, 12000));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${msg}`);
      failed++;
    }
  }

  console.log(`\nDone! ${success} succeeded, ${failed} failed.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
