'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface BookingInfo {
  booking: {
    id: string;
    start_time: string;
    services: { id: string; name: string };
    staff: { id: string; name: string };
  };
  already_submitted: boolean;
  store: { name: string; place_id: string };
}

interface FeedbackResult {
  success: boolean;
  sentiment: string;
  points_earned: number;
  google_review_url?: string;
  message: string;
}

const POSITIVE_TAGS = ['Great Service', 'Friendly Staff', 'Clean', 'On Time', 'Professional', 'Relaxing'];
const NEGATIVE_TAGS = ['Too Slow', 'Rude', 'Dirty', 'Overpriced', 'Unprofessional', 'Long Wait'];

export default function FeedbackPage() {
  const { token, bookingId } = useParams<{ token: string; bookingId: string }>();

  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [positiveTags, setPositiveTags] = useState<string[]>([]);
  const [negativeTags, setNegativeTags] = useState<string[]>([]);
  const [customFeedback, setCustomFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/member/${token}/feedback/${bookingId}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, bookingId]);

  function toggleTag(tag: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  async function handleSubmit() {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/member/${token}/feedback/${bookingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall_rating: rating,
          positive_tags: positiveTags,
          negative_tags: negativeTags,
          custom_feedback: customFeedback || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E8654A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (info?.already_submitted) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Already Submitted</h2>
        <p className="text-sm text-gray-500 mb-6">You have already provided feedback for this visit.</p>
        <Link href={`/m/${token}`} className="text-[#E8654A] font-medium">
          Back to Home
        </Link>
      </div>
    );
  }

  // Result screen
  if (result) {
    const isPositive = result.sentiment === 'positive';
    return (
      <div className="p-6 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isPositive ? 'bg-green-100' : 'bg-blue-100'}`}>
          {isPositive ? (
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          )}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {isPositive ? 'Thank You!' : 'Thank You!'}
        </h2>
        <p className="text-sm text-gray-500 mb-2">{result.message}</p>
        <p className="text-sm text-[#E8654A] font-medium mb-6">
          +{result.points_earned} points earned
        </p>

        {result.google_review_url && (
          <a
            href={result.google_review_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#E8654A] text-white font-semibold px-6 py-3 rounded-xl mb-4 active:scale-95 transition-transform"
          >
            Share on Google
          </a>
        )}

        <div>
          <Link href={`/m/${token}`} className="text-[#E8654A] font-medium text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-1">How was your visit?</h2>
      {info?.booking && (
        <p className="text-sm text-gray-500 mb-6">
          {info.booking.services?.name} with {info.booking.staff?.name}
        </p>
      )}

      {/* Star Rating */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="p-1 transition-transform active:scale-110"
          >
            <svg
              className={`w-10 h-10 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
              fill={star <= rating ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
          </button>
        ))}
      </div>

      {/* Tags */}
      {rating >= 4 && (
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2">What did you like?</p>
          <div className="flex flex-wrap gap-2">
            {POSITIVE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag, positiveTags, setPositiveTags)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  positiveTags.includes(tag)
                    ? 'bg-[#E8654A] text-white border-[#E8654A]'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {rating > 0 && rating <= 2 && (
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2">What could we improve?</p>
          <div className="flex flex-wrap gap-2">
            {NEGATIVE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag, negativeTags, setNegativeTags)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  negativeTags.includes(tag)
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom feedback */}
      {rating > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Anything else? (optional)
          </p>
          <textarea
            value={customFeedback}
            onChange={(e) => setCustomFeedback(e.target.value)}
            placeholder="Tell us more..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#E8654A] resize-none"
          />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full bg-[#E8654A] text-white font-semibold py-3 rounded-xl shadow-sm disabled:opacity-40 active:scale-95 transition-transform"
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </div>
  );
}
