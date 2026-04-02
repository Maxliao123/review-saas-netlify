#!/usr/bin/env npx tsx
/**
 * medium-generator.ts — Generate Medium-optimized drafts for ReplyWise AI
 *
 * Reads generated articles and creates Medium-optimized summaries
 * with CTA links back to replywiseai.com.
 *
 * Usage:
 *   npx tsx scripts/content-pipeline/medium-generator.ts
 *   npx tsx scripts/content-pipeline/medium-generator.ts --slug specific-slug
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Configuration ──────────────────────────────────────────────────────────

const OUTPUT_DIR = path.resolve(__dirname, 'medium-drafts');
const SITE_URL = 'https://www.replywiseai.com';
const ARTICLES_DIR = path.resolve(__dirname, 'output');

// ── Content Extraction ─────────────────────────────────────────────────────

function extractKeyPoints(content: string): string[] {
  const points: string[] = [];

  // Extract bold summary blockquotes
  const blockquoteMatches = content.match(/^>\s\*\*(.+?)\*\*/gm);
  if (blockquoteMatches) {
    for (const bq of blockquoteMatches.slice(0, 3)) {
      points.push(bq.replace(/^>\s\*\*/, '').replace(/\*\*$/, '').trim());
    }
  }

  // Extract key takeaway items
  const takeawaySection = content.match(/Key Takeaway[s]?[\s\S]*?(?=\n## |\n---|\Z)/i);
  if (takeawaySection) {
    const bullets = takeawaySection[0].match(/[-*]\s(.+)/g);
    if (bullets) {
      for (const b of bullets.slice(0, 5)) {
        points.push(b.replace(/^[-*]\s/, '').trim());
      }
    }
  }

  return [...new Set(points)].slice(0, 5);
}

function extractFirstParagraph(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed === '' || trimmed.startsWith('>') ||
      trimmed.startsWith('|') || trimmed.startsWith('[')) continue;
    if (trimmed.length > 100) {
      return trimmed
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\[\^\d+\]/g, '')
        .replace(/\*\*/g, '')
        .slice(0, 300);
    }
  }
  return '';
}

function getH2Sections(content: string): string[] {
  const matches = content.match(/^## (.+)$/gm);
  if (!matches) return [];
  return matches
    .map(m => m.replace(/^## /, ''))
    .filter(h => !['Introduction', 'References', 'Key Takeaways', 'Key Takeaway', 'FAQ', 'Frequently Asked Questions'].includes(h))
    .slice(0, 5);
}

// Tag mapping for Medium
function getMediumTags(category: string, tags: string[]): string[] {
  const baseTagMap: Record<string, string[]> = {
    industry: ['Small Business', 'Marketing', 'Customer Service'],
    'how-to': ['How To', 'Business Tips', 'Digital Marketing'],
    comparison: ['SaaS', 'Business Tools', 'Software'],
    local: ['Local Business', 'SEO', 'Entrepreneurship'],
  };

  const baseTags = baseTagMap[category] || ['Business'];

  // Add topic-specific tags
  const tagStr = tags.join(' ').toLowerCase();
  if (tagStr.includes('restaurant') || tagStr.includes('food')) baseTags.push('Restaurant');
  else if (tagStr.includes('hotel') || tagStr.includes('hospitality')) baseTags.push('Hospitality');
  else if (tagStr.includes('dental') || tagStr.includes('medical')) baseTags.push('Healthcare');
  else if (tagStr.includes('seo') || tagStr.includes('local')) baseTags.push('SEO');
  else if (tagStr.includes('ai') || tagStr.includes('automation')) baseTags.push('Artificial Intelligence');
  else baseTags.push('Google Reviews');

  baseTags.push('Google Reviews');
  return [...new Set(baseTags)].slice(0, 5);
}

// ── Medium Post Generation ─────────────────────────────────────────────────

interface MediumDraft {
  slug: string;
  title: string;
  mediumTitle: string;
  tags: string[];
  content: string;
}

function generateMediumPost(slug: string): MediumDraft | null {
  const docPath = path.join(ARTICLES_DIR, slug, 'document.md');
  const briefPath = path.join(ARTICLES_DIR, slug, 'brief.json');

  if (!fs.existsSync(docPath) || !fs.existsSync(briefPath)) {
    console.warn(`  No document.md or brief.json found for ${slug}`);
    return null;
  }

  const content = fs.readFileSync(docPath, 'utf-8');
  const brief = JSON.parse(fs.readFileSync(briefPath, 'utf-8'));

  const openingParagraph = extractFirstParagraph(content);
  const keyPoints = extractKeyPoints(content);
  const sections = getH2Sections(content);
  const mediumTags = getMediumTags(brief.category, brief.tags);

  const utmUrl = `${SITE_URL}/blog/${slug}?utm_source=medium&utm_medium=referral&utm_campaign=${slug}`;
  const demoUrl = `${SITE_URL}/?store=demo&utm_source=medium&utm_medium=referral&utm_campaign=demo`;

  // Generate a more clickable Medium title
  const mediumTitle = generateMediumTitle(brief.title, brief.category);

  const lines: string[] = [];

  // Title
  lines.push(`# ${mediumTitle}`);
  lines.push('');

  // Opening hook (teaser intro ~300 chars)
  if (openingParagraph) {
    lines.push(openingParagraph + '...');
    lines.push('');
  }

  // Key points as bullet list
  if (keyPoints.length > 0) {
    lines.push('**Key takeaways:**');
    lines.push('');
    for (const point of keyPoints) {
      lines.push(`* ${point}`);
    }
    lines.push('');
  }

  // What's covered (section previews)
  if (sections.length > 0) {
    lines.push("**What's covered in the full guide:**");
    lines.push('');
    for (const section of sections) {
      lines.push(`-> ${section}`);
    }
    lines.push('');
  }

  // CTA
  lines.push('---');
  lines.push('');
  lines.push(`**[Read the complete guide on ReplyWise AI](${utmUrl})**`);
  lines.push('');
  lines.push(`Try the QR code review experience: **[Live Demo](${demoUrl})**`);
  lines.push('');

  // Tags
  lines.push('---');
  lines.push(`Tags: ${mediumTags.join(', ')}`);

  return {
    slug,
    title: brief.title,
    mediumTitle,
    tags: mediumTags,
    content: lines.join('\n'),
  };
}

function generateMediumTitle(originalTitle: string, category: string): string {
  // Make titles more clickable for Medium audience
  const title = originalTitle;

  // Already good format
  if (/^How to/.test(title)) return title;

  // Add engagement hooks based on category
  if (category === 'comparison') {
    if (title.includes('vs')) return `${title} (2026)`;
    return `${title}: An Honest Review`;
  }

  if (category === 'industry') {
    return `${title} (That Actually Works)`;
  }

  return title;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const slugFilter = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(ARTICLES_DIR)) {
    console.error('No output directory found. Run article-generator.ts first.');
    process.exit(1);
  }

  // Get all article slugs
  let slugs = fs.readdirSync(ARTICLES_DIR)
    .filter(d => !d.startsWith('_') && fs.statSync(path.join(ARTICLES_DIR, d)).isDirectory());

  if (slugFilter) {
    slugs = slugs.filter(s => s === slugFilter);
  }

  console.log(`Generating ${slugs.length} Medium drafts...\n`);

  let generated = 0;
  const manifest: {
    order: number;
    slug: string;
    title: string;
    mediumTitle: string;
    tags: string[];
    heroImage: string;
  }[] = [];

  for (const slug of slugs) {
    const draft = generateMediumPost(slug);
    if (!draft) continue;

    const outPath = path.join(OUTPUT_DIR, `${slug}.md`);
    fs.writeFileSync(outPath, draft.content);
    generated++;

    const heroPath = path.join('public', 'blog', slug, 'hero.webp');
    const hasHero = fs.existsSync(path.resolve(__dirname, '..', '..', heroPath));

    manifest.push({
      order: generated,
      slug: draft.slug,
      title: draft.title,
      mediumTitle: draft.mediumTitle,
      tags: draft.tags,
      heroImage: hasHero ? heroPath : '',
    });

    console.log(`  ${generated}. ${draft.mediumTitle}`);
    console.log(`     -> ${outPath}${hasHero ? ' (has hero image)' : ''}`);
  }

  // Save manifest
  const manifestPath = path.join(OUTPUT_DIR, '_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Save publishing schedule (2 per day)
  const schedulePath = path.join(OUTPUT_DIR, '_schedule.md');
  const scheduleLines = [
    '# Medium Publishing Schedule',
    `# Generated: ${new Date().toISOString().split('T')[0]}`,
    `# Total: ${generated} posts (2 per day = ${Math.ceil(generated / 2)} days)`,
    '',
    '| Day | Post 1 | Post 2 |',
    '|-----|--------|--------|',
  ];

  for (let i = 0; i < manifest.length; i += 2) {
    const day = Math.floor(i / 2) + 1;
    const p1 = manifest[i]?.mediumTitle ?? '(none)';
    const p2 = manifest[i + 1]?.mediumTitle ?? '(none)';
    scheduleLines.push(`| Day ${day} | ${p1} | ${p2} |`);
  }

  fs.writeFileSync(schedulePath, scheduleLines.join('\n'));

  console.log(`\nGenerated ${generated} drafts in ${OUTPUT_DIR}/`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Schedule: ${schedulePath}`);
  console.log(`\nAt 2 posts/day, this covers ${Math.ceil(generated / 2)} days.`);
}

main();
