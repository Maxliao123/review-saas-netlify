#!/usr/bin/env tsx
/**
 * Retranslate 4 articles that failed Chinese translation.
 * Reads markdown from scripts/output/{slug}/document.md,
 * translates via DeepSeek V3, and outputs the ZH fields.
 *
 * Usage:
 *   npx tsx scripts/retranslate-missing.ts
 */

import OpenAI from 'openai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

const FAILED_SLUGS = [
  'hotel-online-reputation-management',
  'review-management-roi-calculator-guide',
  'review-velocity-impact-local-ranking',
  'schema-markup-local-business-seo',
];

interface Section {
  heading: string;
  body: string;
}

function parseMarkdown(content: string): { title: string; sections: Section[] } {
  // Normalize newlines before ## headings
  let normalized = content.replace(/([^\n])(\n##\s)/g, '$1\n$2');
  normalized = normalized.replace(/([^\n])(##\s)/g, '$1\n$2');

  const lines = normalized.split('\n');
  let title = '';
  const sections: Section[] = [];
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      title = line.replace(/^#\s+/, '').trim();
      continue;
    }

    if (line.startsWith('## ')) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
      }
      currentHeading = line.replace(/^##\s+/, '').trim();
      currentBody = [];
      continue;
    }

    if (currentHeading) {
      currentBody.push(line);
    }
  }

  if (currentHeading) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
  }

  // Merge Introduction/Quick Answer into first section
  if (sections.length > 1) {
    const first = sections[0];
    if (/^(introduction|quick answer|overview|tldr)/i.test(first.heading)) {
      sections[1].body = first.body + '\n\n' + sections[1].body;
      sections.shift();
    }
  }

  return { title, sections };
}

async function translateArticle(slug: string, title: string, excerpt: string, sections: Section[]): Promise<{
  titleZh: string;
  excerptZh: string;
  sections: { headingZh: string; bodyZh: string }[];
}> {
  const payload = {
    title,
    excerpt,
    sections: sections.map((s) => ({
      heading: s.heading,
      body: s.body.substring(0, 3000), // Limit body length for API
    })),
  };

  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0.3,
    max_tokens: 8192,
    messages: [
      {
        role: 'system',
        content: `You are a professional English to Traditional Chinese (繁體中文) translator specializing in digital marketing and SEO content.

Rules:
- Translate naturally, not word-by-word
- Keep technical terms in English where appropriate (e.g., SEO, Google, Schema Markup, ROI)
- Keep brand names unchanged (e.g., Reputation Monitor, Google Business Profile)
- Keep URLs and markdown formatting unchanged
- Use 繁體中文 (Traditional Chinese), NOT 简体中文
- Return ONLY valid JSON, no extra text`,
      },
      {
        role: 'user',
        content: `Translate the following article content to Traditional Chinese. Return JSON with this exact structure:

{
  "titleZh": "translated title",
  "excerptZh": "translated excerpt",
  "sections": [
    { "headingZh": "translated heading", "bodyZh": "translated body" }
  ]
}

Article content:
${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content || '';

  // Extract JSON from markdown code blocks if needed
  let jsonStr = raw;
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  return JSON.parse(jsonStr);
}

async function main() {
  const outputDir = path.resolve(__dirname, 'output');
  const results: Record<string, any> = {};

  for (const slug of FAILED_SLUGS) {
    const docPath = path.join(outputDir, slug, 'document.md');
    const briefPath = path.join(outputDir, slug, 'brief.json');

    if (!fs.existsSync(docPath)) {
      console.error(`❌ Missing document.md for ${slug}`);
      continue;
    }

    const content = fs.readFileSync(docPath, 'utf-8');
    const brief = fs.existsSync(briefPath)
      ? JSON.parse(fs.readFileSync(briefPath, 'utf-8'))
      : {};

    const { title, sections } = parseMarkdown(content);
    const excerpt = brief.metaDescription || brief.meta_description || '';

    console.log(`\n🔄 Translating: ${slug}`);
    console.log(`   Title: ${title}`);
    console.log(`   Sections: ${sections.length}`);

    try {
      const translated = await translateArticle(slug, title, excerpt, sections);
      results[slug] = translated;

      console.log(`   ✅ titleZh: ${translated.titleZh}`);
      console.log(`   ✅ excerptZh: ${translated.excerptZh?.substring(0, 60)}...`);
      console.log(`   ✅ Sections translated: ${translated.sections.length}`);
    } catch (err: any) {
      console.error(`   ❌ Translation failed: ${err.message}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Write results
  const outPath = path.resolve(__dirname, 'translation-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${outPath}`);
  console.log(`   Successful: ${Object.keys(results).length}/${FAILED_SLUGS.length}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
