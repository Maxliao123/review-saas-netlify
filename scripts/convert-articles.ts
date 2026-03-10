#!/usr/bin/env npx tsx
/**
 * Convert generated markdown articles → BlogPost TypeScript format
 *
 * Usage:
 *   npx tsx scripts/convert-articles.ts                     # Convert all articles
 *   npx tsx scripts/convert-articles.ts --slug <slug>       # Convert specific article
 *   npx tsx scripts/convert-articles.ts --skip-translate     # Skip ZH translation (use EN as placeholder)
 *
 * Output: src/lib/blog-data-generated.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const OUTPUT_DIR = path.resolve(__dirname, 'output');
const TARGET_FILE = path.resolve(__dirname, '..', 'src', 'lib', 'blog-data-generated.ts');

let _deepseek: OpenAI | null = null;
function getDeepSeek(): OpenAI {
  if (!_deepseek) {
    _deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY!,
      baseURL: 'https://api.deepseek.com',
    });
  }
  return _deepseek;
}

// =====================================================
// Types
// =====================================================
interface Brief {
  slug: string;
  title: string;
  titleZh: string;
  targetQuery: string;
  priority: string;
  category: string;
  tags: string[];
  metaDescription: string;
  author: string;
  generatedAt: string;
}

interface Section {
  heading: string;
  body: string;
}

interface ParsedArticle {
  slug: string;
  title: string;
  metaDescription: string;
  sections: Section[];
  faqSections: Section[];
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
}

interface BlogPostEntry {
  slug: string;
  title: string;
  titleZh: string;
  excerpt: string;
  excerptZh: string;
  category: string;
  categoryZh: string;
  author: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
  sections: Array<{
    heading: string;
    headingZh: string;
    body: string;
    bodyZh: string;
  }>;
}

// =====================================================
// Category mapping
// =====================================================
const CATEGORY_MAP: Record<string, { en: string; zh: string }> = {
  guides: { en: 'guides', zh: '指南' },
  strategies: { en: 'strategies', zh: '策略' },
  industry: { en: 'industry', zh: '行業' },
  comparison: { en: 'strategies', zh: '策略' },
  technical: { en: 'guides', zh: '指南' },
};

// =====================================================
// Markdown parser
// =====================================================
function parseMarkdown(markdown: string, brief: Brief): ParsedArticle {
  let title = brief.title;
  let metaDescription = brief.metaDescription;

  // Extract meta description
  const metaMatch = markdown.match(/\*\*Meta Description\*\*:\s*([^\n]+)/);
  if (metaMatch) {
    metaDescription = metaMatch[1].trim();
  }

  // Split by ## H2 headings (now properly on their own lines after fix-markdown-newlines)
  const parts = markdown.split(/^## /m);
  const sections: Section[] = [];
  const faqSections: Section[] = [];
  let inFAQ = false;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const nlIdx = part.indexOf('\n');
    const heading = (nlIdx > 0 ? part.substring(0, nlIdx) : part).trim();
    let body = nlIdx > 0 ? part.substring(nlIdx + 1).trim() : '';

    if (!heading) continue;

    // Skip article title (first H2)
    if (heading === brief.title || heading === title) {
      title = heading;
      continue;
    }

    // Stop at References
    if (heading.toLowerCase() === 'references') break;

    // FAQ section
    if (heading.toLowerCase().includes('frequently asked') || heading.toLowerCase().includes('faq')) {
      inFAQ = true;
    }

    // Clean body
    body = body
      .replace(/\*\*Meta Description\*\*:\s*[^\n]+\n?/g, '')
      .replace(/`#[^\n`]+`\s*$/g, '')
      .trim();

    if (body.length > 30) {
      if (inFAQ) {
        faqSections.push({ heading, body });
      } else {
        sections.push({ heading, body });
      }
    }
  }

  // Merge intro/quick-answer into first content section
  const filteredSections: Section[] = [];
  let introBody = '';

  for (const section of sections) {
    const lh = section.heading.toLowerCase();
    if (lh === 'introduction') {
      introBody = section.body;
    } else if (lh.startsWith('quick answer')) {
      introBody += (introBody ? '\n\n' : '') + section.body;
    } else {
      if (introBody && filteredSections.length === 0) {
        section.body = introBody + '\n\n' + section.body;
        introBody = '';
      }
      filteredSections.push(section);
    }
  }

  if (introBody && filteredSections.length > 0) {
    filteredSections[0].body = introBody + '\n\n' + filteredSections[0].body;
  }

  const cat = CATEGORY_MAP[brief.category] || CATEGORY_MAP.guides;

  return {
    slug: brief.slug,
    title,
    metaDescription,
    sections: filteredSections,
    faqSections,
    category: cat.en,
    tags: brief.tags,
    author: brief.author,
    publishedAt: new Date(brief.generatedAt).toISOString().split('T')[0],
  };
}

// =====================================================
// DeepSeek Translation
// =====================================================
async function translateArticle(article: ParsedArticle, skipTranslate: boolean): Promise<BlogPostEntry> {
  const readTime = Math.ceil(
    article.sections.reduce((sum, s) => sum + s.body.split(/\s+/).length, 0) / 200
  );

  const cat = CATEGORY_MAP[article.category] || CATEGORY_MAP.guides;

  if (skipTranslate) {
    return {
      slug: article.slug,
      title: article.title,
      titleZh: article.title,
      excerpt: article.metaDescription,
      excerptZh: article.metaDescription,
      category: cat.en,
      categoryZh: cat.zh,
      author: article.author,
      publishedAt: article.publishedAt,
      readTime,
      tags: article.tags,
      sections: article.sections.map(s => ({
        heading: s.heading,
        headingZh: s.heading,
        body: s.body,
        bodyZh: s.body,
      })),
    };
  }

  // Build translation payload - send everything in one batch
  const toTranslate = {
    title: article.title,
    excerpt: article.metaDescription,
    sections: article.sections.map(s => ({
      heading: s.heading,
      body: s.body,
    })),
  };

  const prompt = `Translate the following JSON content from English to Traditional Chinese (繁體中文).
Keep the EXACT same JSON structure. Translate ALL text values to Traditional Chinese.
Keep technical terms, brand names (Google, Reputation Monitor, etc), and URLs in English.
Keep markdown formatting (**bold**, [links](url), numbered lists, etc) intact.
Do NOT add any explanations, just output the translated JSON.

${JSON.stringify(toTranslate, null, 2)}`;

  try {
    const response = await getDeepSeek().chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0.3,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: 'You are a professional English to Traditional Chinese translator. Output ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
    });

    const rawOutput = response.choices[0]?.message?.content || '';

    // Extract JSON from the response
    let jsonStr = rawOutput;
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const translated = JSON.parse(jsonStr);

    return {
      slug: article.slug,
      title: article.title,
      titleZh: translated.title || article.title,
      excerpt: article.metaDescription,
      excerptZh: translated.excerpt || article.metaDescription,
      category: cat.en,
      categoryZh: cat.zh,
      author: article.author,
      publishedAt: article.publishedAt,
      readTime,
      tags: article.tags,
      sections: article.sections.map((s, i) => ({
        heading: s.heading,
        headingZh: translated.sections?.[i]?.heading || s.heading,
        body: s.body,
        bodyZh: translated.sections?.[i]?.body || s.body,
      })),
    };
  } catch (err) {
    console.error(`  Translation failed for ${article.slug}: ${err}`);
    // Fallback: use EN as ZH
    return {
      slug: article.slug,
      title: article.title,
      titleZh: article.title,
      excerpt: article.metaDescription,
      excerptZh: article.metaDescription,
      category: cat.en,
      categoryZh: cat.zh,
      author: article.author,
      publishedAt: article.publishedAt,
      readTime,
      tags: article.tags,
      sections: article.sections.map(s => ({
        heading: s.heading,
        headingZh: s.heading,
        body: s.body,
        bodyZh: s.body,
      })),
    };
  }
}

// =====================================================
// Output Generator
// =====================================================
function escapeForTS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
}

function generateTypeScript(posts: BlogPostEntry[]): string {
  let output = `/**
 * Auto-generated blog articles from scripts/convert-articles.ts
 * DO NOT EDIT MANUALLY — re-run the conversion script to update.
 *
 * Generated: ${new Date().toISOString()}
 * Total articles: ${posts.length}
 */

import type { BlogPost } from './blog-data';

export const GENERATED_BLOG_POSTS: BlogPost[] = [\n`;

  for (const post of posts) {
    output += `  {\n`;
    output += `    slug: '${escapeForTS(post.slug)}',\n`;
    output += `    title: '${escapeForTS(post.title)}',\n`;
    output += `    titleZh: '${escapeForTS(post.titleZh)}',\n`;
    output += `    excerpt:\n      '${escapeForTS(post.excerpt)}',\n`;
    output += `    excerptZh:\n      '${escapeForTS(post.excerptZh)}',\n`;
    output += `    category: '${escapeForTS(post.category)}',\n`;
    output += `    categoryZh: '${escapeForTS(post.categoryZh)}',\n`;
    output += `    author: '${escapeForTS(post.author)}',\n`;
    output += `    publishedAt: '${post.publishedAt}',\n`;
    output += `    readTime: ${post.readTime},\n`;
    output += `    tags: [${post.tags.map(t => `'${escapeForTS(t)}'`).join(', ')}],\n`;
    output += `    sections: [\n`;

    for (const section of post.sections) {
      output += `      {\n`;
      output += `        heading: '${escapeForTS(section.heading)}',\n`;
      output += `        headingZh: '${escapeForTS(section.headingZh)}',\n`;
      output += `        body: '${escapeForTS(section.body)}',\n`;
      output += `        bodyZh: '${escapeForTS(section.bodyZh)}',\n`;
      output += `      },\n`;
    }

    output += `    ],\n`;
    output += `  },\n`;
  }

  output += `];\n`;
  return output;
}

// =====================================================
// Main
// =====================================================
async function main() {
  const args = process.argv.slice(2);
  const slugFilter = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;
  const skipTranslate = args.includes('--skip-translate');

  console.log('\n============================================================');
  console.log('Article Converter: Markdown → BlogPost TypeScript');
  console.log('============================================================');

  // Find all article directories
  const dirs = fs.readdirSync(OUTPUT_DIR).filter(d => {
    const fullPath = path.join(OUTPUT_DIR, d);
    if (!fs.statSync(fullPath).isDirectory()) return false;
    if (slugFilter && d !== slugFilter) return false;
    // Must have document.md and brief.json
    return fs.existsSync(path.join(fullPath, 'document.md')) &&
           fs.existsSync(path.join(fullPath, 'brief.json'));
  });

  console.log(`Articles to convert: ${dirs.length}`);
  console.log(`Translation: ${skipTranslate ? 'SKIPPED (EN only)' : 'DeepSeek V3 → Traditional Chinese'}`);
  console.log(`Output: ${TARGET_FILE}`);
  console.log('');

  const posts: BlogPostEntry[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < dirs.length; i++) {
    const slug = dirs[i];
    const articleDir = path.join(OUTPUT_DIR, slug);

    process.stdout.write(`[${i + 1}/${dirs.length}] Converting ${slug}...`);

    try {
      // Read files
      const markdown = fs.readFileSync(path.join(articleDir, 'document.md'), 'utf8');
      const brief: Brief = JSON.parse(fs.readFileSync(path.join(articleDir, 'brief.json'), 'utf8'));

      // Parse
      const parsed = parseMarkdown(markdown, brief);

      if (parsed.sections.length === 0) {
        console.log(` SKIP (no sections found)`);
        failCount++;
        continue;
      }

      // Translate
      const blogPost = await translateArticle(parsed, skipTranslate);

      posts.push(blogPost);
      console.log(` OK (${blogPost.sections.length} sections, ${blogPost.readTime} min read)`);
      successCount++;

      // Small delay between API calls to avoid rate limiting
      if (!skipTranslate && i < dirs.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.log(` FAILED: ${err}`);
      failCount++;
    }
  }

  // Sort by publishedAt, then slug
  posts.sort((a, b) => a.slug.localeCompare(b.slug));

  // Generate TypeScript
  const tsContent = generateTypeScript(posts);
  fs.writeFileSync(TARGET_FILE, tsContent, 'utf8');

  console.log('\n============================================================');
  console.log('CONVERSION COMPLETE');
  console.log('============================================================');
  console.log(`Converted: ${successCount}/${dirs.length}`);
  if (failCount > 0) console.log(`Failed: ${failCount}`);
  console.log(`Output: ${TARGET_FILE}`);
  console.log(`File size: ${(Buffer.byteLength(tsContent) / 1024).toFixed(1)} KB`);
  console.log('\nNext: Update src/lib/blog-data.ts to import GENERATED_BLOG_POSTS');
}

main().catch(console.error);
