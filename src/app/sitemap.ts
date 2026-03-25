import type { MetadataRoute } from 'next';
import { ALL_BLOG_POSTS } from '@/lib/blog-data';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.replywiseai.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Core pages — high priority
  const corePages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tools/roi-calculator`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Blog posts
  const blogPages: MetadataRoute.Sitemap = ALL_BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...corePages, ...blogPages];
}
