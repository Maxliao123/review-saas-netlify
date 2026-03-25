import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ReplyWise AI — AI-Powered Google Review Management",
    template: "%s | ReplyWise AI",
  },
  description:
    "Turn every customer visit into a 5-star Google review. AI generates reviews, auto-drafts replies, and grows your reputation on autopilot. Trusted by 500+ businesses.",
  keywords: [
    "google review management",
    "AI review generator",
    "reputation management",
    "restaurant reviews",
    "review automation",
    "google business reviews",
    "review reply automation",
    "QR code reviews",
    "Google 評論管理",
    "AI 評論生成",
    "聲譽管理",
  ],
  authors: [{ name: "ReplyWise AI" }],
  creator: "ReplyWise AI",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.replywiseai.com"),
  alternates: {
    canonical: "/",
    languages: {
      "en": "/",
      "zh-TW": "/?lang=zh",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["zh_TW"],
    siteName: "ReplyWise AI",
    title: "ReplyWise AI — AI-Powered Google Review Management",
    description:
      "Turn every customer visit into a 5-star Google review with AI. Trusted by 500+ businesses.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReplyWise AI — AI-Powered Review Management",
    description:
      "Turn every customer visit into a 5-star Google review with AI.",
    creator: "@replywiseai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#2563EB" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
