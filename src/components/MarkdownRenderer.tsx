'use client';

import { marked } from 'marked';
import { useMemo } from 'react';

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Pre-process raw markdown BEFORE passing to `marked`.
 * Fixes common issues from AI-generated content:
 * - Missing blank lines before/after tables (required for GFM table parsing)
 * - Inline bold "Risk N:" patterns → proper ### subheadings
 * - Inline blockquotes (> ) that lack preceding newlines
 * - Ensure headings (###) have blank lines around them
 */
function preprocessMarkdown(md: string): string {
  let result = md;

  // 0. Handle tables on the SAME LINE as preceding text (no newline at all)
  //    "...some text. | Header1 | Header2 |\n| :--- |" → "...some text.\n\n| Header1 |..."
  result = result.replace(
    /([^|\n])\s(\|[^|\n]+\|[^\n]*\|\s*\n\|[\s:|-]+\|)/g,
    '$1\n\n$2'
  );

  // 1. Ensure blank line BEFORE markdown table blocks (has \n but not \n\n)
  result = result.replace(
    /([^\n])\n(\|[^\n]+\|\s*\n\|[\s:|-]+\|)/g,
    '$1\n\n$2'
  );

  // 2. Ensure blank line AFTER table blocks (last row of pipes → next paragraph)
  result = result.replace(
    /(\|[^\n]+\|)\n([^\n|])/g,
    '$1\n\n$2'
  );

  // 3. Convert inline bold risk/step patterns into proper h4 subheadings
  //    **Risk 1: Title.** → \n\n#### Risk 1: Title\n\n
  //    **Step 1: Title.** → \n\n#### Step 1: Title\n\n
  result = result.replace(
    /\*\*(Risk \d+|Step \d+|Tip \d+|Phase \d+|Strategy \d+):\s*([^.*]+)\.\*\*/g,
    '\n\n#### $1: $2\n\n'
  );

  // 4. Fix inline blockquotes — ". > **Summary" or similar patterns without newline
  //    Ensure > at start of a blockquote gets its own line
  result = result.replace(
    /([.!?])\s*> \*\*/g,
    '$1\n\n> **'
  );
  // Also handle cases where > is preceded by text without punctuation
  result = result.replace(
    /([a-z0-9])\s+> \*\*/g,
    '$1\n\n> **'
  );

  // 5. Ensure ### headings have blank lines BEFORE them (if preceded by text)
  result = result.replace(
    /([^\n])\n(#{2,4}\s)/g,
    '$1\n\n$2'
  );

  // 6. Ensure ### headings have blank lines AFTER them (before paragraph text)
  result = result.replace(
    /(#{2,4}\s[^\n]+)\n([^#\n|>])/g,
    '$1\n\n$2'
  );

  return result;
}

/**
 * Post-process HTML output from `marked`.
 * Styles tables, blockquotes, footnotes, and reduces visual noise.
 */
function postProcessHtml(html: string): string {
  let result = html;

  // 1. Convert footnote references [^N] → superscript anchor links
  result = result.replace(
    /\[\^(\d+)\]/g,
    '<sup><a href="#ref-$1" class="footnote-ref text-blue-600 hover:text-blue-800 no-underline" id="fnref-$1">[$1]</a></sup>'
  );

  // 2. Wrap tables in responsive container
  result = result.replace(
    /<table>/g,
    '<div class="not-prose overflow-x-auto my-10 rounded-xl border border-gray-200 shadow-sm"><table class="min-w-full text-sm">'
  );
  result = result.replace(/<\/table>/g, '</table></div>');

  // 3. Style table headers — replace <th ...> with styled version
  result = result.replace(
    /<thead>/g,
    '<thead class="bg-gray-900">'
  );
  result = result.replace(
    /<th(?:\s[^>]*)?>/g,
    '<th class="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-white">'
  );

  // 4. Style table cells
  result = result.replace(
    /<td(?:\s[^>]*)?>/g,
    '<td class="px-5 py-3.5 border-t border-gray-100 text-gray-600 text-[13px] leading-relaxed">'
  );

  // 5. Style table body
  result = result.replace(
    /<tbody>/g,
    '<tbody class="divide-y divide-gray-50 bg-white">'
  );
  result = result.replace(
    /<tr>/g,
    '<tr class="hover:bg-gray-50/60 transition-colors">'
  );

  // 6. Fallback: if marked didn't parse a table and output pipe text inside <p>,
  //    extract the pipe-table portion and convert it.
  //    Handles both <p>| ... |</p> AND <p>text... | Header |<br>| :--- |<br>...</p>
  result = result.replace(
    /<p>([\s\S]*?)<\/p>/g,
    (match, inner: string) => {
      // Check if this paragraph contains a pipe-table pattern
      // Look for: | text | text | followed by | :--- | separator
      const tableMatch = inner.match(
        /(\|[^<\n]+\|)\s*(?:<br\s*\/?>)\s*(\|[\s:|-]+\|)\s*(?:<br\s*\/?>)\s*((?:\|[^<\n]+\|\s*(?:<br\s*\/?>)?\s*)*)/
      );
      if (!tableMatch) return match; // no table found, keep original

      // Extract text before the table
      const tableStartIdx = inner.indexOf(tableMatch[0]);
      const textBefore = inner.substring(0, tableStartIdx).trim();
      const textAfter = inner.substring(tableStartIdx + tableMatch[0].length).trim();

      // Build result: paragraph for text before + table + paragraph for text after
      let out = '';
      if (textBefore) out += `<p>${textBefore}</p>`;
      out += convertPipeTextToTable(tableMatch[0]);
      if (textAfter) out += `<p>${textAfter}</p>`;
      return out;
    }
  );

  // 7. Style blockquotes — summary callout with blue accent
  result = result.replace(
    /<blockquote>/g,
    '<blockquote class="not-prose border-l-4 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50/30 rounded-r-xl px-5 py-4 my-8 text-[14px] text-gray-700 leading-relaxed shadow-sm">'
  );

  // 8. Style h3 subheadings inside markdown content — visible distinction from body
  result = result.replace(
    /<h3>/g,
    '<h3 class="text-[17px] font-bold text-gray-900 mt-10 mb-4 leading-snug tracking-tight border-b border-gray-100 pb-2">'
  );

  // 9. Style h4 subheadings (Risk N, Step N, etc.) — from preprocessor
  result = result.replace(
    /<h4/g,
    '<h4 class="text-[15px] font-semibold text-gray-900 mt-8 mb-3"'
  );

  // 9. Convert internal markdown links that still show raw syntax
  result = result.replace(
    /\[([^\]]+)\]\(\/([^)]+)\)/g,
    '<a href="/$2" class="text-blue-600 hover:text-blue-800 underline underline-offset-2">$1</a>'
  );

  // 10. Reduce bold noise — strip <strong> from long phrases (>50 chars)
  result = result.replace(
    /<strong>([^<]{50,})<\/strong>/g,
    '$1'
  );

  return result;
}

/**
 * Fallback: Convert pipe-delimited text to a proper HTML table.
 * Handles cases where `marked` failed to parse table syntax.
 */
function convertPipeTextToTable(text: string): string {
  // Split by <br> or newline
  const lines = text.split(/<br\s*\/?>|\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return `<p>${text}</p>`;

  // Check if second line is a separator (| --- | --- |)
  const isSeparator = (line: string) => /^\|[\s:|-]+\|$/.test(line.trim());
  const isTableRow = (line: string) => /^\|.+\|$/.test(line.trim());

  // Find the first line that looks like a table row
  let headerIdx = lines.findIndex(l => isTableRow(l));
  if (headerIdx === -1) return `<p>${text}</p>`;

  let headerLine = lines[headerIdx];
  let startRow = headerIdx + 1;

  // Skip separator line
  if (startRow < lines.length && isSeparator(lines[startRow])) {
    startRow = startRow + 1;
  }

  const parseCells = (line: string) =>
    line.split('|').map(c => c.trim()).filter(Boolean);

  const headerCells = parseCells(headerLine);
  const bodyRows = lines.slice(startRow).filter(l => isTableRow(l) && !isSeparator(l));

  let html = '<div class="not-prose overflow-x-auto my-10 rounded-xl border border-gray-200 shadow-sm">';
  html += '<table class="min-w-full text-sm">';

  // Header
  html += '<thead class="bg-gray-900"><tr class="hover:bg-gray-50/60 transition-colors">';
  headerCells.forEach(cell => {
    html += `<th class="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-white">${cell}</th>`;
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody class="divide-y divide-gray-50 bg-white">';
  bodyRows.forEach(row => {
    const cells = parseCells(row);
    html += '<tr class="hover:bg-gray-50/60 transition-colors">';
    cells.forEach(cell => {
      html += `<td class="px-5 py-3.5 border-t border-gray-100 text-gray-600 text-[13px] leading-relaxed">${cell}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  return html;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = useMemo(() => {
    const processed = preprocessMarkdown(content);
    const rawHtml = marked.parse(processed, { async: false }) as string;
    return postProcessHtml(rawHtml);
  }, [content]);

  return (
    <div
      className={`prose prose-gray max-w-none
        prose-headings:text-gray-900 prose-headings:font-bold
        prose-h2:text-xl prose-h2:mt-12 prose-h2:mb-5 prose-h2:leading-snug prose-h2:tracking-tight
        prose-h3:text-[17px] prose-h3:mt-10 prose-h3:mb-4 prose-h3:leading-snug prose-h3:tracking-tight
        prose-h4:text-[15px] prose-h4:font-semibold prose-h4:mt-8 prose-h4:mb-3
        prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-gray-600 prose-p:mb-5
        prose-a:text-blue-600 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-blue-800
        prose-strong:text-gray-800 prose-strong:font-semibold
        prose-li:text-gray-600 prose-li:text-[15px] prose-li:leading-[1.85]
        prose-ol:list-decimal prose-ul:list-disc
        prose-ol:my-6 prose-ul:my-6
        prose-li:my-2
        prose-li:marker:text-gray-400
        prose-blockquote:not-italic prose-blockquote:border-l-4 prose-blockquote:border-blue-200 prose-blockquote:bg-blue-50/50 prose-blockquote:rounded-r-lg prose-blockquote:px-5 prose-blockquote:py-4 prose-blockquote:my-8
        prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
        prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:overflow-x-auto
        prose-hr:my-12 prose-hr:border-gray-200
        prose-img:rounded-xl prose-img:shadow-sm
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * FAQ Accordion component using native HTML5 details/summary.
 */
interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  items: FaqItem[];
}

export function FaqSection({ items }: FaqSectionProps) {
  if (!items.length) return null;

  return (
    <section className="mt-16 mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-6">
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group rounded-xl border border-gray-200 bg-white hover:shadow-sm transition-shadow"
            open={i === 0}
          >
            <summary className="cursor-pointer select-none px-5 py-4 text-[15px] font-medium text-gray-900 flex items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs group-open:bg-gray-900 group-open:text-white transition-colors">
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">&minus;</span>
              </span>
            </summary>
            <div className="px-5 pb-5 text-[14px] text-gray-500 leading-[1.8] border-t border-gray-100 pt-4">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/**
 * References section - parses footnote-style references from article body.
 */
interface ReferencesProps {
  body: string;
}

export function ReferencesSection({ body }: ReferencesProps) {
  const refPattern = /\[\^(\d+)\]:\s*(.+)/g;
  const refs: { num: string; text: string }[] = [];
  let match;

  while ((match = refPattern.exec(body)) !== null) {
    refs.push({ num: match[1], text: match[2] });
  }

  if (!refs.length) return null;

  return (
    <section className="mt-14 rounded-xl bg-gray-50 border border-gray-200 p-6">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        References
      </h3>
      <ol className="space-y-2 text-xs text-gray-500 leading-relaxed">
        {refs.map((ref) => (
          <li key={ref.num} id={`ref-${ref.num}`} className="flex gap-2">
            <span className="font-medium text-gray-400 min-w-[1.5rem]">[{ref.num}]</span>
            <span
              dangerouslySetInnerHTML={{
                __html: ref.text.replace(
                  /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
                  '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
                ),
              }}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Internal link callout — "Continue Reading" mid-article block.
 */
interface InternalLinksProps {
  posts: Array<{ slug: string; title: string; category: string }>;
}

export function InternalLinkCallout({ posts }: InternalLinksProps) {
  if (!posts.length) return null;

  return (
    <div className="my-14 rounded-xl bg-gray-50 border border-gray-100 px-6 py-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Continue Reading
      </p>
      <ul className="space-y-2.5">
        {posts.map((post) => (
          <li key={post.slug}>
            <a
              href={`/blog/${post.slug}`}
              className="text-[14px] text-blue-600 hover:text-blue-800 underline underline-offset-2 leading-relaxed"
            >
              {post.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
