import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Star,
  ArrowRight,
  ArrowLeft,
  Clock,
  Tag,
  Share2,
  BookOpen,
} from 'lucide-react';
import { ALL_BLOG_POSTS, getBlogPost } from '@/lib/blog-data';
import { getArticleGuide } from '@/config/article-guide-map';
import { getCrossDomainCta } from '@/config/cross-domain-cta';

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

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://reputationmonitor.ai';

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
      siteName: 'Reputation Monitor',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
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

  // Boss page CTA (DarkSEOKing semantic clustering)
  const guide = getArticleGuide(slug);
  const crossDomainCta = getCrossDomainCta(slug);

  // Related posts (same category, exclude current)
  const relatedPosts = ALL_BLOG_POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug
  ).slice(0, 2);

  // JSON-LD for Article
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Reputation Monitor',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://reputationmonitor.ai'}/favicon.ico`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://reputationmonitor.ai'}/blog/${post.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                Reputation<span className="text-blue-600">Monitor</span>
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Start Free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Article */}
      <article className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Blog
            </Link>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                post.category === 'guides'
                  ? 'bg-blue-50 text-blue-700'
                  : post.category === 'strategies'
                  ? 'bg-emerald-50 text-emerald-700'
                  : post.category === 'industry'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-purple-50 text-purple-700'
              }`}>
                <Tag className="h-3 w-3" />
                {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {post.readTime} min read
              </span>
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl leading-tight">
              {post.title}
            </h1>

            <p className="mt-4 text-lg text-gray-600">
              {post.excerpt}
            </p>

            <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
              <span>By {post.author}</span>
              <span>•</span>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {post.updatedAt && post.updatedAt !== post.publishedAt && (
                <>
                  <span>•</span>
                  <span>
                    Updated{' '}
                    {new Date(post.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Table of Contents */}
          <div className="mb-10 rounded-xl bg-gray-50 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Table of Contents
            </h2>
            <ol className="space-y-1.5">
              {post.sections.map((section, i) => (
                <li key={i}>
                  <a
                    href={`#section-${i}`}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {i + 1}. {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* Content Sections */}
          <div className="prose prose-gray max-w-none">
            {post.sections.map((section, i) => (
              <section key={i} id={`section-${i}`} className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {section.heading}
                </h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line text-[15px]">
                  {section.body}
                </div>
              </section>
            ))}
          </div>

          {/* Tags */}
          <div className="mt-10 pt-6 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Tags:</span>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* CTA Box — Dynamic based on DarkSEOKing semantic clustering */}
          {crossDomainCta === 'signup' ? (
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
              <h3 className="text-xl font-bold">
                Ready to automate your review management?
              </h3>
              <p className="mt-2 text-blue-100 text-sm">
                Start collecting more Google reviews with AI-powered assistance. Free plan available.
              </p>
              <Link
                href="/auth/signup"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : crossDomainCta === 'demo' ? (
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-gray-800 to-gray-900 p-8 text-white text-center">
              <h3 className="text-xl font-bold">
                Managing reviews across multiple locations?
              </h3>
              <p className="mt-2 text-gray-300 text-sm">
                Reputation Monitor Enterprise gives you centralized control with per-location analytics.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors"
              >
                View Enterprise Plans <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : guide ? (
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 ring-1 ring-blue-200 p-8 text-center">
              <h3 className="text-xl font-bold text-gray-900">
                {guide.title}
              </h3>
              <p className="mt-2 text-gray-600 text-sm">
                {guide.description}
              </p>
              <Link
                href={guide.path}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {guide.ctaText} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
              <h3 className="text-xl font-bold">
                Ready to automate your review management?
              </h3>
              <p className="mt-2 text-blue-100 text-sm">
                Start collecting more Google reviews with AI-powered assistance. Free plan available.
              </p>
              <Link
                href="/auth/signup"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 bg-gray-50 border-t border-gray-100">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Related Articles</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group flex flex-col rounded-xl bg-white ring-1 ring-gray-200 p-5 hover:shadow-md hover:ring-blue-200 transition-all"
                >
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                    {related.title}
                  </h3>
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2 flex-1">
                    {related.excerpt}
                  </p>
                  <span className="mt-3 text-xs font-medium text-blue-600 flex items-center gap-1">
                    Read more <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Reputation Monitor. All rights reserved.</p>
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
