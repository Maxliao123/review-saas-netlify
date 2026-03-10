#!/usr/bin/env tsx
/**
 * Generate featured images for blog articles using Replicate Flux Schnell.
 *
 * Reads article slugs from scripts/output/ directory,
 * generates contextual images via Flux Schnell API,
 * and saves to public/blog/{slug}/hero.webp.
 *
 * Usage:
 *   npx tsx scripts/generate-article-images.ts --dry-run     # Preview prompts
 *   npx tsx scripts/generate-article-images.ts               # Generate all
 *   npx tsx scripts/generate-article-images.ts --slug <slug> # Single article
 *
 * Environment:
 *   REPLICATE_API_TOKEN  Required. Get from https://replicate.com/account/api-tokens
 *
 * Cost: ~$0.003 per image (Flux Schnell on Replicate)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// ── Config ──────────────────────────────────────────────────────────────────

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const FLUX_MODEL = 'black-forest-labs/flux-schnell';
const REPLICATE_API = 'https://api.replicate.com/v1';
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public', 'blog');

// ── Prompt Generation ───────────────────────────────────────────────────────

/**
 * Generate a Flux-optimized image prompt from article metadata.
 * Style: professional SaaS / business photography.
 */
function generatePrompt(slug: string, title: string): string {
  const t = title.toLowerCase();

  const style = [
    'Professional business photography',
    'clean modern aesthetic',
    'soft natural lighting',
    'shallow depth of field',
    'high resolution',
    'corporate color palette with blue and white tones',
    'no text or watermarks',
    'no people faces',
  ].join(', ');

  const prompt = buildTopicPrompt(slug, t);
  return `${prompt}. ${style}.`;
}

function buildTopicPrompt(slug: string, t: string): string {
  // ── Industry-Specific ──────────────────────────────────────────────────
  if (t.includes('restaurant'))
    return 'A modern restaurant interior with a tablet on the counter showing a 5-star review interface, warm ambient lighting, clean dining tables in the background';
  if (t.includes('hotel') || t.includes('hospitality'))
    return 'A luxury hotel reception desk with a digital tablet showing guest feedback, marble counter, elegant lobby with soft lighting';
  if (t.includes('dental') || t.includes('clinic') || t.includes('medical'))
    return 'A modern dental clinic reception area with a tablet on the desk showing patient reviews, clean white interior, professional medical setting';
  if (t.includes('salon') || t.includes('spa'))
    return 'A stylish salon interior with a modern tablet showing client reviews, mirrors, styling stations, warm welcoming atmosphere';
  if (t.includes('real estate') || t.includes('realtor'))
    return 'A modern real estate office with a laptop showing property reviews, house models on the desk, window with city skyline';
  if (t.includes('auto repair') || t.includes('automotive'))
    return 'A clean auto repair shop reception area with a tablet showing customer feedback, organized tool display, professional workshop visible in background';
  if (t.includes('retail') || t.includes('store'))
    return 'A modern retail store counter with a digital display showing customer reviews, neatly organized merchandise shelves in background';
  if (t.includes('multi-location') || t.includes('franchise'))
    return 'A corporate dashboard on a large monitor showing multiple location review metrics, modern office setting with a map showing multiple pins';

  // ── Strategy & How-To ──────────────────────────────────────────────────
  if (t.includes('qr code'))
    return 'A smartphone scanning a QR code on a table tent card in a restaurant, the phone screen showing a review prompt, clean table setting';
  if (t.includes('negative review') || t.includes('bad review'))
    return 'A business owner thoughtfully composing a response on a laptop, coffee cup beside, warm office lighting, screen showing a review dashboard';
  if (t.includes('response template'))
    return 'A laptop screen showing a review response editor with template suggestions, modern desk setup with notebook and pen';
  if (t.includes('checklist') || t.includes('new business'))
    return 'A flat lay of a business planning desk with a checklist, laptop showing review dashboard, smartphone with Google Maps, coffee cup';
  if (t.includes('feedback loop') || t.includes('customer feedback'))
    return 'A circular diagram concept showing customer feedback cycle, digital devices on a desk, charts and analytics visible on screens';
  if (t.includes('roi') || t.includes('calculator') || t.includes('revenue'))
    return 'A business analytics dashboard on a large monitor showing ROI graphs and review metrics, modern office desk, calculator, financial charts';

  // ── SEO & Technical ────────────────────────────────────────────────────
  if (t.includes('local seo') || t.includes('ranking'))
    return 'A desktop monitor showing Google search results with local pack and star ratings, SEO analytics charts on a second screen, modern workspace';
  if (t.includes('google maps') || t.includes('map pack'))
    return 'A laptop screen showing Google Maps with business listings and star ratings, a smartphone showing the same map, clean desk setup';
  if (t.includes('google business profile') || t.includes('gbp'))
    return 'A computer screen showing a Google Business Profile editor with reviews section open, professional office desk setup';
  if (t.includes('schema') || t.includes('markup') || t.includes('structured data'))
    return 'A developer workspace with code editor showing JSON-LD schema markup, second monitor showing rich search results with stars, dark theme';
  if (t.includes('citation') || t.includes('directory'))
    return 'Multiple browser tabs showing business directory listings (Yelp, Yellow Pages style), a spreadsheet tracking citations on the main screen';
  if (t.includes('voice search'))
    return 'A smart speaker on a modern desk next to a smartphone showing local search results, minimal home office setup';
  if (t.includes('geo') || t.includes('generative engine'))
    return 'A futuristic AI interface showing generative search results with local business recommendations, holographic-style display, blue tech aesthetic';
  if (t.includes('ai overview') || t.includes('google ai'))
    return 'A Google search results page showing an AI-generated overview with local business recommendations, clean browser interface on modern monitor';

  // ── Review Management ──────────────────────────────────────────────────
  if (t.includes('fake review') || t.includes('detection'))
    return 'A magnifying glass over a laptop screen showing review listings, some highlighted in red as suspicious, detective-style investigation setup';
  if (t.includes('review velocity') || t.includes('frequency'))
    return 'A timeline chart on a monitor showing review growth over months, upward trend graph, analytics dashboard, modern office setting';
  if (t.includes('sentiment') || t.includes('analytics'))
    return 'A dashboard showing sentiment analysis with pie charts, word clouds, and emotion indicators, multiple colorful data visualizations on screen';
  if (t.includes('ai') && (t.includes('tool') || t.includes('comparison')))
    return 'A comparison layout on a widescreen monitor showing multiple review management tool interfaces side by side, modern tech workspace';
  if (t.includes('review policy') || t.includes('guidelines'))
    return 'A professional document viewer showing Google review policies, gavel and scales of justice miniature on the desk, legal-business aesthetic';

  // ── General / Fallback ─────────────────────────────────────────────────
  if (t.includes('review'))
    return 'A modern business dashboard showing 5-star review analytics, customer feedback cards, clean minimalist office desk with laptop and smartphone';

  return 'A professional business workspace with a laptop showing a review management dashboard, five gold stars visible on screen, modern minimalist desk setup with plants and coffee';
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
        prompt,
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

  const prediction = await createRes.json();

  if (prediction.status === 'succeeded' && prediction.output?.length) {
    return prediction.output[0];
  }

  if (prediction.status === 'processing' || prediction.status === 'starting') {
    return pollPrediction(prediction.id);
  }

  throw new Error(`Prediction failed: ${prediction.status} — ${JSON.stringify(prediction.error)}`);
}

async function pollPrediction(id: string): Promise<string> {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(2000);
    const res = await fetch(`${REPLICATE_API}/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    const prediction = await res.json();

    if (prediction.status === 'succeeded') {
      return prediction.output[0];
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(`Prediction ${id} ${prediction.status}: ${JSON.stringify(prediction.error)}`);
    }
    process.stdout.write('.');
  }
  throw new Error(`Prediction ${id} timed out after ${maxAttempts * 2}s`);
}

// ── Image Download ──────────────────────────────────────────────────────────

async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
}

// ── Main ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const slugFilter = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

  if (!dryRun && !REPLICATE_API_TOKEN) {
    console.error('❌ REPLICATE_API_TOKEN is required.');
    console.error('   Set it in .env.local or pass as env var.');
    console.error('   Get your token at: https://replicate.com/account/api-tokens');
    process.exit(1);
  }

  // Read articles from scripts/output/ directory
  const slugDirs = fs.readdirSync(OUTPUT_DIR).filter((d) => {
    const briefPath = path.join(OUTPUT_DIR, d, 'brief.json');
    return fs.existsSync(briefPath);
  });

  // Filter if --slug is specified
  const targetSlugs = slugFilter
    ? slugDirs.filter((d) => d.includes(slugFilter))
    : slugDirs;

  if (!targetSlugs.length) {
    console.log('❌ No articles found in scripts/output/');
    return;
  }

  // Check which already have images
  const needsImage = targetSlugs.filter((slug) => {
    const imagePath = path.join(PUBLIC_DIR, slug, 'hero.webp');
    return !fs.existsSync(imagePath);
  });

  console.log(`\n🖼️  Articles: ${targetSlugs.length} total, ${needsImage.length} need images\n`);

  if (!needsImage.length) {
    console.log('✅ All articles already have images!');
    return;
  }

  // Build tasks
  const tasks = needsImage.map((slug) => {
    const briefPath = path.join(OUTPUT_DIR, slug, 'brief.json');
    const brief = JSON.parse(fs.readFileSync(briefPath, 'utf-8'));
    const title = brief.title || slug.replace(/-/g, ' ');

    return {
      slug,
      title,
      prompt: generatePrompt(slug, title),
      destPath: path.join(PUBLIC_DIR, slug, 'hero.webp'),
    };
  });

  // Preview
  for (const t of tasks) {
    console.log(`  📄 ${t.slug}`);
    console.log(`     Title: ${t.title}`);
    console.log(`     Prompt: ${t.prompt.substring(0, 120)}...`);
    console.log();
  }

  const estCost = tasks.length * 0.003;
  console.log(`💰 Estimated cost: $${estCost.toFixed(3)} (${tasks.length} images × $0.003)\n`);

  if (dryRun) {
    console.log('🏁 Dry run complete. Remove --dry-run to generate images.');
    return;
  }

  console.log('🚀 Starting image generation...\n');

  let success = 0;
  let failed = 0;

  for (const t of tasks) {
    try {
      process.stdout.write(`  ⏳ ${t.slug} ... `);

      const imageUrl = await callFluxSchnell(t.prompt);
      await downloadImage(imageUrl, t.destPath);
      const fileSize = fs.statSync(t.destPath).size;

      console.log(`✅ ${(fileSize / 1024).toFixed(0)} KB`);
      success++;

      // Rate limit: 12s between requests
      if (tasks.indexOf(t) < tasks.length - 1) {
        process.stdout.write('  ⏳ Waiting 12s (rate limit)...\r');
        await sleep(12000);
      }
    } catch (err: any) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🏁 Done! ${success} succeeded, ${failed} failed.`);

  if (success > 0) {
    console.log('\n📝 Next steps:');
    console.log('   1. Review images in public/blog/*/hero.webp');
    console.log('   2. Update blog-data to reference hero images');
    console.log('   3. Deploy to see images on production');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
