'use client';

import Link from 'next/link';

const OVERALL = { rating: 4.7, count: 38 };

const REVIEWS = [
  {
    id: 1,
    name: 'Emily C.',
    date: '2026-04-02',
    rating: 5,
    text: 'Absolutely loved the spring bouquet kit! Everything was pre-cut and the instructions were so clear. My arrangement turned out beautiful. Will definitely buy more kits!',
    verified: true,
  },
  {
    id: 2,
    name: 'Jessica W.',
    date: '2026-03-28',
    rating: 5,
    text: 'The gel nail art set is amazing quality. Perfect for beginners like me. The colors are vibrant and long-lasting. Highly recommend!',
    verified: true,
  },
  {
    id: 3,
    name: 'Sarah L.',
    date: '2026-03-25',
    rating: 4,
    text: 'Great floral scissors, very sharp and comfortable to hold. Packaging was lovely too. Took one star off because shipping was a bit slow.',
    verified: true,
  },
  {
    id: 4,
    name: 'Amy Z.',
    date: '2026-03-20',
    rating: 5,
    text: 'Lush Nail Studio never disappoints! I have bought multiple kits and they are always fresh and well-packaged. The dried flower frame was a hit at my workshop.',
    verified: true,
  },
  {
    id: 5,
    name: 'Michelle H.',
    date: '2026-03-15',
    rating: 3,
    text: 'The nail drill is decent for the price. It works well but gets a bit warm after extended use. Customer service was helpful when I had questions.',
    verified: false,
  },
];

function Stars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-sm';
  return (
    <div className={`flex gap-0.5 ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? 'text-amber-400' : 'text-white/10'}>
          &#9733;
        </span>
      ))}
    </div>
  );
}

function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[#6b6b96] w-4 text-right">{stars}</span>
      <span className="text-amber-400 text-xs">&#9733;</span>
      <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[#6b6b96] text-xs w-6 text-right">{count}</span>
    </div>
  );
}

export default function DemoReviewsPage() {
  const distribution = [
    { stars: 5, count: 22 },
    { stars: 4, count: 10 },
    { stars: 3, count: 4 },
    { stars: 2, count: 1 },
    { stars: 1, count: 1 },
  ];

  return (
    <div className="min-h-screen bg-[#07070d] text-[#ededf5]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-white/[0.07]">
        <Link href="/p/quote" className="text-sm text-[#6b6b96] hover:text-white transition-colors">
          &larr; Back
        </Link>
        <span className="text-[11px] text-[#6b6b96] bg-[#E8654A]/10 border border-[#E8654A]/30 px-3 py-1 rounded-full font-medium tracking-wide">
          DEMO &middot; 展示用
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">商品評價 &middot; Product Reviews</h1>
          <p className="text-sm text-[#6b6b96] mt-1">Lush Nail Studio</p>
        </div>

        {/* Overall Rating */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center">
            <div className="text-center">
              <div className="text-5xl font-bold text-white">{OVERALL.rating}</div>
              <Stars rating={Math.round(OVERALL.rating)} size="lg" />
              <div className="text-sm text-[#6b6b96] mt-1">{OVERALL.count} reviews</div>
            </div>
            <div className="flex-1 space-y-1.5 w-full sm:w-auto">
              {distribution.map((d) => (
                <RatingBar key={d.stars} stars={d.stars} count={d.count} total={OVERALL.count} />
              ))}
            </div>
          </div>
        </div>

        {/* Leave a Review button */}
        <div className="flex justify-end mb-6">
          <button className="px-5 py-2.5 bg-[#E8654A] text-white rounded-lg text-sm font-semibold hover:bg-[#d4563d] transition-colors">
            Leave a Review
          </button>
        </div>

        {/* Reviews List */}
        <div className="space-y-4 mb-10">
          {REVIEWS.map((r) => (
            <div key={r.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{r.name}</span>
                    {r.verified && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <Stars rating={r.rating} size="sm" />
                </div>
                <span className="text-xs text-[#6b6b96]">{r.date}</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>

        {/* Review Invite Email Mockup */}
        <div className="mb-8">
          <div className="text-xs text-[#6b6b96] uppercase tracking-wider font-medium mb-4">Review Invite Email Preview</div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
            {/* Email header */}
            <div className="bg-white/[0.03] px-6 py-4 border-b border-white/[0.06]">
              <div className="text-xs text-[#6b6b96]">From: Lush Nail Studio &lt;hello@bloomstudio.ca&gt;</div>
              <div className="text-xs text-[#6b6b96] mt-1">Subject: How was your experience? We&apos;d love your feedback!</div>
            </div>
            {/* Email body */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-lg font-bold text-white mb-1">Thanks for visiting Lush Nail Studio!</div>
                <div className="text-sm text-[#6b6b96]">We hope you enjoyed your purchase.</div>
              </div>
              <div className="bg-white/[0.04] rounded-lg p-5 text-center mb-4">
                <div className="text-sm text-white/80 mb-3">How would you rate your experience?</div>
                <div className="flex justify-center gap-2 text-3xl">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-amber-400 cursor-pointer hover:scale-110 transition-transform">&#9733;</span>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <button className="px-6 py-2.5 bg-[#E8654A] text-white rounded-lg text-sm font-semibold">
                  Share Your Review
                </button>
              </div>
              <div className="text-center text-xs text-[#6b6b96] mt-4">
                Powered by ReplyWise AI
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-[#6b6b96]/50 mt-8">
          This is a demo page with mock data &middot; 此為展示頁面，資料為模擬用途
        </div>
      </div>
    </div>
  );
}
