#!/usr/bin/env npx tsx
/**
 * convert-to-blogdata.ts — Convert generated articles into BlogPost format
 *
 * Parses markdown articles and converts them to the BlogPost interface
 * expected by src/lib/blog-data-generated.ts.
 *
 * Generates bilingual content (EN + ZH placeholders for manual translation).
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/convert-to-blogdata.ts
 *   npx tsx scripts/content-pipeline/convert-to-blogdata.ts --slug specific-slug
 *   npx tsx scripts/content-pipeline/convert-to-blogdata.ts --append
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ArticleBrief } from './topic-generator';

// ── Types matching blog-data.ts ────────────────────────────────────────────

interface BlogPostFAQ {
  question: string;
  answer: string;
}

interface BlogPostSection {
  heading: string;
  headingZh: string;
  body: string;
  bodyZh: string;
}

interface BlogPost {
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
  heroImage?: string;
  faq?: BlogPostFAQ[];
  sections: BlogPostSection[];
}

// ── Category mapping ───────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, { id: string; labelZh: string }> = {
  industry: { id: 'industry', labelZh: '行業' },
  'how-to': { id: 'guides', labelZh: '指南' },
  comparison: { id: 'guides', labelZh: '指南' },
  local: { id: 'strategies', labelZh: '策略' },
};

// ── Markdown Parsing ───────────────────────────────────────────────────────

function parseMarkdownSections(markdown: string): BlogPostSection[] {
  const sections: BlogPostSection[] = [];
  const lines = markdown.split('\n');

  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      // Save previous section
      if (currentHeading && currentBody.length > 0) {
        sections.push({
          heading: currentHeading,
          headingZh: `[ZH] ${currentHeading}`,
          body: currentBody.join('\n').trim(),
          bodyZh: `[ZH] ${currentBody.join('\n').trim().substring(0, 200)}...`,
        });
      }
      currentHeading = h2Match[1];
      currentBody = [];
    } else if (currentHeading) {
      currentBody.push(line);
    }
  }

  // Save last section
  if (currentHeading && currentBody.length > 0) {
    sections.push({
      heading: currentHeading,
      headingZh: `[ZH] ${currentHeading}`,
      body: currentBody.join('\n').trim(),
      bodyZh: `[ZH] ${currentBody.join('\n').trim().substring(0, 200)}...`,
    });
  }

  // Filter out References section
  return sections.filter(s => s.heading !== 'References' && s.heading !== 'FAQ' && s.heading !== 'Frequently Asked Questions');
}

function parseFAQ(faqRaw: string): BlogPostFAQ[] {
  const faqs: BlogPostFAQ[] = [];
  const qMatches = faqRaw.split(/\nQ:\s*/);

  for (const block of qMatches) {
    if (!block.trim()) continue;
    const parts = block.split(/\nA:\s*/);
    if (parts.length >= 2) {
      faqs.push({
        question: parts[0].replace(/^Q:\s*/, '').trim(),
        answer: parts[1].trim(),
      });
    }
  }

  return faqs;
}

function parseMeta(metaRaw: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const lines = metaRaw.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      meta[match[1]] = match[2].trim();
    }
  }
  return meta;
}

function extractExcerpt(markdown: string): string {
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed === '' || trimmed.startsWith('>') ||
      trimmed.startsWith('|') || trimmed.startsWith('[') || trimmed.startsWith('-') ||
      trimmed.startsWith('*')) continue;
    if (trimmed.length > 50) {
      return trimmed
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\[\^\d+\]/g, '')
        .replace(/\*\*/g, '')
        .slice(0, 250);
    }
  }
  return '';
}

// ── Persona name selection ─────────────────────────────────────────────────

function selectAuthorName(tags: string[]): string {
  const tagStr = tags.join(' ').toLowerCase();
  if (/restaurant|food|cafe|coffee|hotel|hospitality|vancouver|toronto/.test(tagStr)) return 'Sarah Chen';
  if (/reputation|negative|crisis|strategy|comparison|tool|pricing|retail/.test(tagStr)) return 'Michael Torres';
  if (/hotel|spa|wellness|salon|beauty|barbershop|service|positive/.test(tagStr)) return 'Jennifer Kim';
  if (/dental|clinic|medical|healthcare|law|auto|gym|compliance|ftc|gdpr/.test(tagStr)) return 'David Nguyen';
  return 'Sarah Chen';
}

// ── Main Conversion ────────────────────────────────────────────────────────

function convertArticle(slug: string): BlogPost | null {
  const outputDir = path.resolve(__dirname, 'output', slug);
  const docPath = path.join(outputDir, 'document.md');
  const briefPath = path.join(outputDir, 'brief.json');
  const faqPath = path.join(outputDir, 'faq.txt');
  const metaPath = path.join(outputDir, 'meta.txt');

  if (!fs.existsSync(docPath) || !fs.existsSync(briefPath)) {
    console.warn(`  Skipping ${slug}: missing document.md or brief.json`);
    return null;
  }

  const markdown = fs.readFileSync(docPath, 'utf-8');
  const brief: ArticleBrief = JSON.parse(fs.readFileSync(briefPath, 'utf-8'));

  // Parse FAQ
  let faq: BlogPostFAQ[] = [];
  if (fs.existsSync(faqPath)) {
    faq = parseFAQ(fs.readFileSync(faqPath, 'utf-8'));
  }

  // Parse meta
  let meta: Record<string, string> = {};
  if (fs.existsSync(metaPath)) {
    meta = parseMeta(fs.readFileSync(metaPath, 'utf-8'));
  }

  // Parse sections
  const sections = parseMarkdownSections(markdown);

  // Extract excerpt
  const excerpt = meta.excerpt || extractExcerpt(markdown);

  // Determine category
  const categoryInfo = CATEGORY_MAP[brief.category] || { id: 'guides', labelZh: '指南' };

  // Check for hero image
  const heroPath = `/blog/${slug}/hero.webp`;
  const heroExists = fs.existsSync(path.resolve(__dirname, '..', '..', 'public', 'blog', slug, 'hero.webp'));

  const blogPost: BlogPost = {
    slug: brief.slug,
    title: meta.title || brief.title,
    titleZh: brief.titleZh,
    excerpt,
    excerptZh: `[ZH] ${excerpt.substring(0, 150)}...`,
    category: categoryInfo.id,
    categoryZh: categoryInfo.labelZh,
    author: selectAuthorName(brief.tags),
    publishedAt: new Date().toISOString().split('T')[0],
    readTime: parseInt(meta.readTime || '12', 10),
    tags: brief.tags,
    ...(heroExists ? { heroImage: heroPath } : {}),
    ...(faq.length > 0 ? { faq } : {}),
    sections,
  };

  return blogPost;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const slugFilter = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;
  const appendMode = args.includes('--append');

  const outputDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    console.error('No output directory found. Run article-generator.ts first.');
    process.exit(1);
  }

  // Get all article slugs
  let slugs = fs.readdirSync(outputDir)
    .filter(d => !d.startsWith('_') && fs.statSync(path.join(outputDir, d)).isDirectory());

  if (slugFilter) {
    slugs = slugs.filter(s => s === slugFilter);
  }

  console.log(`Converting ${slugs.length} articles to BlogPost format...\n`);

  const blogPosts: BlogPost[] = [];

  for (const slug of slugs) {
    const post = convertArticle(slug);
    if (post) {
      blogPosts.push(post);
      console.log(`  Converted: ${slug} (${post.sections.length} sections, ${post.faq?.length || 0} FAQs)`);
    }
  }

  if (blogPosts.length === 0) {
    console.log('No articles to convert.');
    return;
  }

  // Generate TypeScript file
  const targetPath = path.resolve(__dirname, '..', '..', 'src', 'lib', 'blog-data-generated.ts');

  let existingPosts: BlogPost[] = [];
  if (appendMode && fs.existsSync(targetPath)) {
    // Read existing file to get the array (simple extraction)
    const existingContent = fs.readFileSync(targetPath, 'utf-8');
    const arrayMatch = existingContent.match(/export const GENERATED_BLOG_POSTS: BlogPost\[\] = (\[[\s\S]*\]);/);
    if (arrayMatch) {
      try {
        // Use Function constructor to evaluate the array (safe since it's our own generated file)
        existingPosts = new Function(`return ${arrayMatch[1]}`)() as BlogPost[];
      } catch {
        console.warn('  Could not parse existing blog-data-generated.ts, will overwrite.');
      }
    }
  }

  // Merge: new posts override existing by slug
  const existingBySlug = new Map(existingPosts.map(p => [p.slug, p]));
  for (const post of blogPosts) {
    existingBySlug.set(post.slug, post);
  }
  const allPosts = Array.from(existingBySlug.values());

  // Write output
  const tsContent = `/**
 * Auto-generated blog articles from scripts/content-pipeline/convert-to-blogdata.ts
 * DO NOT EDIT MANUALLY — re-run the conversion script to update.
 *
 * Generated: ${new Date().toISOString()}
 * Total articles: ${allPosts.length}
 */

import type { BlogPost } from './blog-data';

export const GENERATED_BLOG_POSTS: BlogPost[] = ${JSON.stringify(allPosts, null, 2)};
`;

  fs.writeFileSync(targetPath, tsContent);
  console.log(`\nWrote ${allPosts.length} BlogPosts to ${targetPath}`);
  console.log(`  New: ${blogPosts.length}, Existing preserved: ${allPosts.length - blogPosts.length}`);
}

main();
