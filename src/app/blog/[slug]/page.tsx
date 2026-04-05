import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  Star,
  ArrowRight,
  ArrowLeft,
  Clock,
  Tag,
} from 'lucide-react';
import { ALL_BLOG_POSTS, getBlogPost } from '@/lib/blog-data';
import { getArticleGuide } from '@/config/article-guide-map';
import { getCrossDomainCta } from '@/config/cross-domain-cta';
import {
  MarkdownRenderer,
  FaqSection,
  InternalLinkCallout,
} from '@/components/MarkdownRenderer';
import { ArticleChart } from '@/components/ArticleChart';
import { CHART_DATA } from '@/lib/chart-data';
import { selectVerifiedReferences } from '@/config/verified-references';
import { TableOfContents, SidebarTOC } from '@/components/blog/table-of-contents';
import { toHeadingId } from '@/lib/heading-utils';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ALL_BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Post Not Found' };

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.replywiseai.com';

  const ogImage = post.heroImage
    ? `${BASE_URL}${post.heroImage}`
    : undefined;

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
      tags: post.tags,
      siteName: 'ReplyWise AI',
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: `${BASE_URL}/blog/${post.slug}`,
      languages: {
        'en': `${BASE_URL}/blog/${post.slug}`,
        'zh-TW': `${BASE_URL}/blog/${post.slug}?lang=zh`,
      },
    },
    other: {
      'article:published_time': post.publishedAt,
      'article:modified_time': post.updatedAt || post.publishedAt,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.replywiseai.com';

  // Boss page CTA (DarkSEOKing semantic clustering)
  const guide = getArticleGuide(slug);
  const crossDomainCta = getCrossDomainCta(slug);

  // Related posts (same category, exclude current) — 3 articles
  const relatedPosts = ALL_BLOG_POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug
  ).slice(0, 3);

  // Chart data for this article
  const chartSpec = CHART_DATA[slug] || null;

  // Internal link posts (different category for cross-cluster linking) — 3 articles
  const internalLinkPosts = ALL_BLOG_POSTS.filter(
    (p) => p.category !== post.category && p.slug !== post.slug
  )
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.title, category: p.category }));

  // Insert internal links mid-article (after section 2)
  const midArticleIndex = Math.min(2, post.sections.length - 1);

  // Generate verified references for this article (matched by slug keywords)
  const slugKeyword = slug.replace(/-/g, ' ');
  const articleRefs = selectVerifiedReferences(slugKeyword, 6);

  // Word count for structured data
  const wordCount = post.sections.reduce((sum, s) => sum + s.body.split(/\s+/).length, 0);

  // Unified JSON-LD @graph (Article + Breadcrumb + FAQ + ItemList)
  const jsonLdGraph: Record<string, unknown>[] = [
    {
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      wordCount,
      author: { '@type': 'Person', name: post.author },
      publisher: {
        '@type': 'Organization',
        name: 'ReplyWise AI',
        logo: { '@type': 'ImageObject', url: `${BASE_URL}/favicon.ico` },
      },
      ...(post.heroImage && {
        image: { '@type': 'ImageObject', url: `${BASE_URL}${post.heroImage}`, width: 1200, height: 630 },
      }),
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${post.slug}` },
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.blog-faq-item', '.prose h2'] },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title },
      ],
    },
  ];

  // ItemList for listicle articles (slug contains "best-", "top-", "-ranked-")
  const isListicle = /^(best-|top-)|-ranked-/.test(slug);
  if (isListicle && post.sections.length >= 3) {
    jsonLdGraph.push({
      '@type': 'ItemList',
      itemListElement: post.sections.slice(0, 10).map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: s.heading,
        description: s.body.substring(0, 200).replace(/[#*\[\]]/g, ''),
      })),
    });
  }

  // FAQ schema
  if (post.faq && post.faq.length > 0) {
    jsonLdGraph.push({
      '@type': 'FAQPage',
      mainEntity: post.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }

  const jsonLd = { '@context': 'https://schema.org', '@graph': jsonLdGraph };

  return (
    <div className="min-h-screen bg-white">
      {/* Structured Data — unified @graph */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#E8654A] to-[#FFBF00]">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                Reply<span className="text-[#E8654A]">Wise AI</span>
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Blog
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E8654A] to-[#FFBF00] px-4 py-2 text-sm font-semibold text-white"
              >
                Start Free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Article */}
      <article className="pt-12 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Blog
            </Link>
          </nav>

          {/* Header (full width) */}
          <header className="mb-10 max-w-[680px]">
            <div className="flex items-center gap-3 mb-5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                post.category === 'guides'
                  ? 'bg-[#FFF7ED] text-[#E8654A]'
                  : post.category === 'strategies'
                  ? 'bg-emerald-50 text-emerald-700'
                  : post.category === 'industry'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-purple-50 text-purple-700'
              }`}>
                <Tag className="h-3 w-3" />
                {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                {post.readTime} min read
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl leading-[1.2] tracking-tight">
              {post.title}
            </h1>

            <p className="mt-5 text-lg text-gray-500 leading-relaxed">
              {post.excerpt}
            </p>

            <div className="mt-6 flex items-center gap-3 text-sm text-gray-400">
              <span>{post.author}</span>
              <span className="text-gray-300">/</span>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {post.updatedAt && post.updatedAt !== post.publishedAt && (
                <>
                  <span className="text-gray-300">/</span>
                  <span>
                    Updated{' '}
                    {new Date(post.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </>
              )}
            </div>
          </header>

          {/* Hero Image (full width) */}
          {post.heroImage && (
            <div className="mb-12 relative w-full max-w-[680px] aspect-[16/9] rounded-2xl overflow-hidden">
              <Image
                src={post.heroImage}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 680px"
                priority
              />
            </div>
          )}

          {/* Mobile TOC (visible < lg) */}
          <div className="lg:hidden mb-12">
            <TableOfContents sections={post.sections} />
          </div>

          {/* Desktop 2-column layout */}
          <div className="lg:flex lg:gap-10">
            {/* Main content */}
            <div className="flex-1 min-w-0 max-w-[680px]">
              {/* Content Sections */}
              <div className="space-y-0">
                {post.sections.map((section, i) => (
                  <div key={i}>
                    {i > 0 && (
                      <hr className="border-t border-gray-200/60 my-14" />
                    )}
                    <section id={toHeadingId(section.heading)}>
                      <div className="mb-6">
                        <span className="text-xs font-semibold text-[#E8654A]/60 uppercase tracking-widest">
                          Section {i + 1}
                        </span>
                        <h2 className="mt-2 text-[22px] sm:text-2xl font-extrabold text-gray-900 leading-snug tracking-tight">
                          {section.heading}
                        </h2>
                      </div>
                      <MarkdownRenderer content={section.body} />
                    </section>

                    {i === 0 && chartSpec && (
                      <div className="mt-8 mb-4">
                        <ArticleChart spec={chartSpec} />
                      </div>
                    )}

                    {i === midArticleIndex && internalLinkPosts.length > 0 && (
                      <InternalLinkCallout posts={internalLinkPosts} />
                    )}
                  </div>
                ))}
              </div>

              {/* References */}
              {articleRefs.length > 0 && (
                <section className="mt-14 rounded-xl bg-gray-50 border border-gray-200 p-6">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    References
                  </h3>
                  <ol className="space-y-2 text-xs text-gray-500 leading-relaxed">
                    {articleRefs.map((ref, i) => (
                      <li key={i} id={`ref-${i + 1}`} className="flex gap-2">
                        <span className="font-medium text-gray-400 min-w-[1.5rem]">[{i + 1}]</span>
                        <span>
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#E8654A] hover:text-[#C94D35] underline"
                          >
                            {ref.title}
                          </a>
                          {' '}&mdash; {ref.publisher}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* FAQ */}
              {post.faq && post.faq.length > 0 && (
                <FaqSection items={post.faq} />
              )}

              {/* Tags */}
              <div className="mt-14 pt-6 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mr-1">Tags</span>
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA Box */}
              {crossDomainCta === 'signup' ? (
                <div className="mt-14 rounded-2xl bg-gradient-to-r from-[#E8654A] to-[#C94D35] p-8 text-white text-center">
                  <h3 className="text-xl font-bold">
                    Ready to automate your review management?
                  </h3>
                  <p className="mt-2 text-[#FEE2D5] text-sm">
                    Start collecting more Google reviews with AI-powered assistance. Free plan available.
                  </p>
                  <Link
                    href="/auth/signup"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-[#E8654A] hover:bg-[#FFF7ED] transition-colors"
                  >
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : crossDomainCta === 'demo' ? (
                <div className="mt-14 rounded-2xl bg-gradient-to-r from-gray-800 to-gray-900 p-8 text-white text-center">
                  <h3 className="text-xl font-bold">
                    Managing reviews across multiple locations?
                  </h3>
                  <p className="mt-2 text-gray-300 text-sm">
                    ReplyWise AI Enterprise gives you centralized control with per-location analytics.
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    View Enterprise Plans <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : guide ? (
                <div className="mt-14 rounded-2xl bg-gradient-to-r from-[#FFF7ED] to-[#FEE2D5] ring-1 ring-[#E8654A]/30 p-8 text-center">
                  <h3 className="text-xl font-bold text-gray-900">
                    {guide.title}
                  </h3>
                  <p className="mt-2 text-gray-600 text-sm">
                    {guide.description}
                  </p>
                  <Link
                    href={guide.path}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E8654A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#C94D35] transition-colors"
                  >
                    {guide.ctaText} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="mt-14 rounded-2xl bg-gradient-to-r from-[#E8654A] to-[#C94D35] p-8 text-white text-center">
                  <h3 className="text-xl font-bold">
                    Ready to automate your review management?
                  </h3>
                  <p className="mt-2 text-[#FEE2D5] text-sm">
                    Start collecting more Google reviews with AI-powered assistance. Free plan available.
                  </p>
                  <Link
                    href="/auth/signup"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-[#E8654A] hover:bg-[#FFF7ED] transition-colors"
                  >
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Desktop sticky sidebar (hidden on mobile) */}
            <aside className="hidden lg:block lg:w-64 lg:shrink-0">
              <div className="sticky top-24 space-y-8">
                <SidebarTOC sections={post.sections} />

                {/* Recent Articles in sidebar */}
                {relatedPosts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Related
                    </h3>
                    <div className="space-y-3">
                      {relatedPosts.slice(0, 3).map((p) => (
                        <Link
                          key={p.slug}
                          href={`/blog/${p.slug}`}
                          className="block text-xs text-gray-600 hover:text-[#E8654A] transition-colors leading-snug"
                        >
                          {p.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </article>

      {/* Related Posts — 3 articles */}
      {relatedPosts.length > 0 && (
        <section className="py-14 bg-gray-50 border-t border-gray-100">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-lg font-bold text-gray-900 mb-8">Related Articles</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group flex flex-col rounded-xl bg-white ring-1 ring-gray-200 overflow-hidden hover:shadow-md hover:ring-[#FEE2D5] transition-all"
                >
                  {related.heroImage && (
                    <div className="relative w-full h-36 overflow-hidden">
                      <Image
                        src={related.heroImage}
                        alt={related.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 320px"
                      />
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#E8654A] transition-colors text-sm leading-snug">
                      {related.title}
                    </h3>
                    <p className="mt-2 text-xs text-gray-500 line-clamp-2 flex-1">
                      {related.excerpt}
                    </p>
                    <span className="mt-3 text-xs font-medium text-[#E8654A] flex items-center gap-1">
                      Read more <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} ReplyWise AI. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/" className="hover:text-gray-300">Home</Link>
          <Link href="/pricing" className="hover:text-gray-300">Pricing</Link>
          <Link href="/blog" className="hover:text-gray-300">Blog</Link>
          <Link href="/tools/roi-calculator" className="hover:text-gray-300">ROI Calculator</Link>
        </div>
      </footer>
    </div>
  );
}
