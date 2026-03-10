#!/usr/bin/env npx tsx
/**
 * Fix markdown files to have proper newlines before ## headings
 * and between heading text and body text.
 *
 * The DeepSeek output often has headings and body text on the same line.
 * This script normalizes them to standard markdown format.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve(__dirname, 'output');

function fixMarkdown(content: string): string {
  let fixed = content;

  // Step 1: Normalize "# ## " to "### " (sub-headings)
  fixed = fixed.replace(/# ## /g, '### ');

  // Step 2: Insert newlines before ## headings that appear inline
  // Match any character followed by space(s) then ## (not ###)
  fixed = fixed.replace(/([^\n])\s+(## )/g, '$1\n\n$2');

  // Step 3: Insert newlines before ### headings that appear inline
  fixed = fixed.replace(/([^\n])\s+(### )/g, '$1\n\n$2');

  // Step 4: For each ## section, split heading from body text.
  // After step 2, ## is at start of a line. But heading + body are still on same line.
  // We need to insert a \n\n after the heading text and before body text.
  //
  // Strategy: Process each line starting with "## ".
  // The heading is the title-case phrase, the body starts after it.
  const lines = fixed.split('\n');
  const newLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const prefix = line.startsWith('### ') ? '### ' : '## ';
      const rest = line.substring(prefix.length);

      // Find where the heading ends and body begins
      const headingEnd = findHeadingBodyBoundary(rest);

      if (headingEnd > 0 && headingEnd < rest.length - 10) {
        const heading = rest.substring(0, headingEnd).trim();
        const body = rest.substring(headingEnd).trim();
        newLines.push(prefix + heading);
        newLines.push('');
        newLines.push(body);
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }

  return newLines.join('\n');
}

/**
 * Find the character index where a heading transitions to body text.
 * Uses multiple heuristics:
 * 1. Look for sentence patterns that indicate body text start
 * 2. Heading titles are typically 3-15 words in title case
 */
function findHeadingBodyBoundary(text: string): number {
  const words = text.split(/\s+/);

  // Special case: single-word headings like "Introduction", "References"
  if (words.length > 1) {
    const singleWordHeadings = ['Introduction', 'References', 'Conclusion', 'Summary', 'Overview'];
    if (singleWordHeadings.includes(words[0])) {
      return words[0].length;
    }
  }

  // Look for body text start patterns
  // Body text typically starts with a common sentence opener
  const bodyStartPatterns = [
    // Articles and determiners at sentence start
    /^(A|An|The|This|That|These|Those|Each|Every|Most|Many|Some|Several|No|All|Any|Both|Few)\s+[a-z]/,
    // Common sentence starters
    /^(In|For|While|When|If|As|By|With|To|From|After|Before|Since|Until|Once|Whether|Although|Because|However|Moreover|Furthermore|Additionally|Specifically|According)\s/,
    // Pronouns and common subjects
    /^(It|We|You|They|He|She|Our|Your|Their|Its|One|Here|There|Data|Research|Studies|Review|Google|Businesses|Customers|Users)\s+(is|are|was|were|has|have|can|could|should|would|will|show|indicate|suggest|demonstrate|found|reveals|does|don't|isn't|aren't|do|may|might|must)\s/,
    // Gerunds as sentence openers (broad — any -ing word followed by any word)
    /^(Understanding|Managing|Building|Creating|Setting|Getting|Integrating|Measuring|Choosing|Analyzing|Crafting|Leveraging|Running|Starting|Using|Implementing|Optimizing|Tracking|Responding|Placing|Earning|Monitoring|Navigating|Combining|Turning|Scoring|Maintaining)\s+/,
    // Bold text marker (** at start)
    /^\*\*/,
    // Footnote reference
    /^\[\^/,
    // Specific sentence structure "Noun+verb" that indicates paragraph text
    /^[A-Z][a-z]+\s+(is|are|was|were|has|have|can|could|should|would|will|shows?|indicates?|means?|provides?|offers?|allows?|helps?|makes?|gives?|takes?|finds?|requires?|remains?|becomes?)\s/,
    // Abbreviation/acronym followed by verb or article (e.g., "SMS follow-ups", "NFC tags", "AI tools")
    /^(SMS|NFC|AI|QR|SEO|GEO|POS|CRM|API|URL|ROI)\s+(is|are|was|were|has|have|can|could|follow|tag|tool|code|stand|score|data|platform|search|review|driv|help|strateg|monitor|optimi|market|generat|analy)/i,
    // Number or percentage starting a sentence
    /^[0-9]+(%|\s+percent|\s+out\s+of|\.\s)/,
    // Common nouns that start body sentences
    /^(Consumers?|Patients?|Clients?|Managers?|Owners?|Teams?|Platforms?|Tools?|Systems?|Results?|Numbers?|Statistics?|Reports?|Surveys?|Algorithms?|Rankings?|Ratings?|Responses?|Campaigns?|Metrics?)\s+(is|are|was|were|has|have|can|could|should|would|will|who|that|which|show|indicate|often|may|might|must|don't|need|want|tend|rely)\s/,
  ];

  // Scan word by word, starting from word 3 (minimum heading length)
  let charPos = 0;
  for (let i = 0; i < words.length && i < 20; i++) {
    if (i >= 3) {
      // Check if remaining text matches a body start pattern
      const remaining = text.substring(charPos);
      for (const pattern of bodyStartPatterns) {
        if (pattern.test(remaining)) {
          return charPos;
        }
      }
    }
    charPos += words[i].length + 1; // +1 for space
  }

  // Fallback: if no pattern found but text is very long, cap heading at ~15 words
  if (words.length > 15) {
    let pos = 0;
    for (let i = 0; i < 12; i++) {
      pos += words[i].length + 1;
    }
    return pos;
  }

  return -1; // Can't split
}

// Main
function main() {
  const dirs = fs.readdirSync(OUTPUT_DIR).filter(d => {
    const fp = path.join(OUTPUT_DIR, d);
    return fs.statSync(fp).isDirectory() && fs.existsSync(path.join(fp, 'document.md'));
  });

  console.log(`Fixing markdown newlines for ${dirs.length} articles...`);

  let fixedCount = 0;
  for (const slug of dirs) {
    const filePath = path.join(OUTPUT_DIR, slug, 'document.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixMarkdown(content);

    if (fixed !== content) {
      fs.writeFileSync(filePath, fixed, 'utf8');

      // Count ## headings
      const headings = fixed.match(/^## .+$/gm) || [];
      console.log(`  ✓ ${slug} (${headings.length} sections)`);
      fixedCount++;
    } else {
      console.log(`  - ${slug} (no changes needed)`);
    }
  }

  console.log(`\nFixed: ${fixedCount}/${dirs.length}`);
}

main();
