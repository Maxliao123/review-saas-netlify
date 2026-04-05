import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  ArrowRight,
  Clock,
  Tag,
  BookOpen,
} from 'lucide-react';
import { ALL_BLOG_POSTS, BLOG_CATEGORIES } from '@/lib/blog-data';

export const metadata: Metadata = {
  title: 'Blog — Google Review Management Tips & Strategies',
  description:
    'Expert guides on Google review management, AI-powered review replies, and reputation growth strategies for restaurants, hotels, clinics, and local businesses.',
  openGraph: {
    title: 'ReplyWise AI Blog — Review Management Guides & Tips',
    description:
      'Expert guides on Google review management, AI replies, and reputation growth for local businesses.',
    type: 'website',
    siteName: 'ReplyWise AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReplyWise AI Blog',
    description:
      'Expert guides on Google review management and AI-powered reputation growth.',
  },
  alternates: {
    canonical: 'https://www.replywiseai.com/blog',
    languages: {
      'en': 'https://www.replywiseai.com/blog',
      'zh-TW': 'https://www.replywiseai.com/blog?lang=zh',
    },
  },
};

export default function BlogListPage() {
  return (
    <div className="min-h-screen bg-white">
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
              <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/tools/roi-calculator" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                ROI Calculator
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

      {/* Hero */}
      <section className="pt-16 pb-8 text-center bg-gradient-to-b from-[#FFF7ED]/50 to-white">
        <div className="mx-auto max-w-3xl px-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF7ED] px-3 py-1 text-sm font-medium text-[#E8654A] mb-4">
            <BookOpen className="h-3.5 w-3.5" />
            Blog & Resources
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Google Review Management
            <br />
            <span className="text-[#E8654A]">Tips & Strategies</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Expert guides for restaurants, hotels, clinics, and local businesses
            looking to grow their reputation with AI-powered review management.
          </p>
        </div>
      </section>

      {/* Category Tags */}
      <section className="py-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center rounded-full bg-[#E8654A] px-4 py-1.5 text-sm font-medium text-white">
            All Posts
          </span>
          {BLOG_CATEGORIES.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {cat.label}
            </span>
          ))}
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-8 pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            {ALL_BLOG_POSTS.map((post, idx) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className={`group flex flex-col rounded-2xl bg-white ring-1 ring-gray-200 overflow-hidden hover:shadow-lg hover:ring-[#FEE2D5] transition-all ${
                  idx === 0 ? 'md:col-span-2' : ''
                }`}
              >
                {/* Hero Image or Colored header bar */}
                {post.heroImage ? (
                  <div className={`relative w-full ${idx === 0 ? 'h-64 md:h-72' : 'h-44'} overflow-hidden`}>
                    <Image
                      src={post.heroImage}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes={idx === 0 ? '(max-width: 768px) 100vw, 960px' : '(max-width: 768px) 100vw, 480px'}
                    />
                  </div>
                ) : (
                  <div className={`h-2 w-full ${
                    post.category === 'guides'
                      ? 'bg-gradient-to-r from-[#E8654A] to-[#FFBF00]'
                      : post.category === 'strategies'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : post.category === 'industry'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`} />
                )}

                <div className={`p-6 flex flex-col flex-1 ${idx === 0 ? 'md:p-8' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
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
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {post.readTime} min read
                    </span>
                  </div>

                  <h2 className={`font-bold text-gray-900 group-hover:text-[#E8654A] transition-colors ${
                    idx === 0 ? 'text-2xl' : 'text-lg'
                  }`}>
                    {post.title}
                  </h2>

                  <p className="mt-2 text-sm text-gray-600 line-clamp-2 flex-1">
                    {post.excerpt}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(post.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-sm font-medium text-[#E8654A] group-hover:gap-2 flex items-center gap-1 transition-all">
                      Read more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-900 text-center">
        <h2 className="text-2xl font-extrabold text-white">
          Ready to grow your Google reviews?
        </h2>
        <p className="mt-2 text-gray-400">
          Start free today. No credit card required.
        </p>
        <Link
          href="/auth/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E8654A] to-[#FFBF00] px-8 py-3 text-base font-semibold text-white hover:from-[#C94D35] hover:to-[#E8654A] transition-all"
        >
          Start Free <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
