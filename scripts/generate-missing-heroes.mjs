import fs from 'fs';
import path from 'path';

const API_TOKEN = process.env.REPLICATE_API_TOKEN;
const API_URL = 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';

const MISSING = [
  {
    slug: 'ai-review-reply-best-practices',
    prompt: 'Abstract illustration of AI and human collaboration, robot hand and human hand working together on a digital screen showing review responses, modern blue and white color scheme, clean tech aesthetic',
  },
  {
    slug: 'clinic-medical-practice-reviews',
    prompt: 'Modern medical clinic waiting room, clean and bright with green plants, tablet on reception desk showing patient reviews, professional healthcare photography',
  },
  {
    slug: 'hotel-review-management',
    prompt: 'Luxury hotel lobby with concierge desk, digital check-in kiosk, subtle QR code signage, warm hospitality ambiance, professional photography, golden hour lighting',
  },
  {
    slug: 'local-seo-ranking-factors-reviews-2026',
    prompt: 'Google Maps local pack search results on smartphone screen showing business listings with star ratings, overlaid with SEO ranking arrows, modern digital marketing illustration',
  },
  {
    slug: 'restaurant-review-strategy-2026',
    prompt: 'Modern restaurant interior with a QR code on a table tent, warm ambient lighting, customers scanning phones, 5-star review icons floating, professional photography style',
  },
  {
    slug: 'review-sentiment-analysis-word-cloud',
    prompt: 'Abstract data visualization showing a colorful word cloud with positive green and negative red keywords, modern analytics dashboard background, tech illustration style',
  },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImage(slug, prompt) {
  console.log(`\n[${new Date().toISOString()}] Generating: ${slug}`);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: '16:9',
        output_format: 'webp',
        output_quality: 80,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  const data = await res.json();

  if (data.status === 'failed') {
    throw new Error(`Generation failed: ${JSON.stringify(data.error)}`);
  }

  const imageUrl = data.output?.[0];
  if (!imageUrl) {
    throw new Error(`No output URL in response: ${JSON.stringify(data)}`);
  }

  // Download the image
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`);

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const outDir = path.join('public', 'blog', slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'hero.webp');
  fs.writeFileSync(outPath, buffer);

  console.log(`  ✓ Saved ${outPath} (${buffer.length} bytes)`);
  return true;
}

async function main() {
  console.log(`Generating ${MISSING.length} hero images...`);

  for (let i = 0; i < MISSING.length; i++) {
    const { slug, prompt } = MISSING[i];

    try {
      await generateImage(slug, prompt);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);

      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  Rate limited — waiting 15s before retry...');
        await sleep(15000);
        try {
          await generateImage(slug, prompt);
        } catch (retryErr) {
          console.error(`  ✗ Retry failed: ${retryErr.message}`);
        }
      }
    }

    // Wait 12s between requests to stay under rate limit
    if (i < MISSING.length - 1) {
      console.log('  Waiting 12s before next request...');
      await sleep(12000);
    }
  }

  // Verify results
  console.log('\n--- Results ---');
  for (const { slug } of MISSING) {
    const p = path.join('public', 'blog', slug, 'hero.webp');
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      console.log(`✓ ${slug}: ${stat.size} bytes`);
    } else {
      console.log(`✗ ${slug}: MISSING`);
    }
  }
}

main().catch(console.error);
