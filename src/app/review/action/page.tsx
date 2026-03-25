'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ReviewData {
  id: number;
  storeName: string;
  authorName: string;
  rating: number;
  content: string;
  replyDraft: string;
  replyStatus: string;
  createdAt: string;
}

export default function ReviewActionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <ReviewActionContent />
    </Suspense>
  );
}

function ReviewActionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [review, setReview] = useState<ReviewData | null>(null);
  const [draft, setDraft] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishResult, setPublishResult] = useState('');

  useEffect(() => {
    if (!token) { setError('Missing token'); setLoading(false); return; }
    fetchReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchReview() {
    try {
      const res = await fetch(`/api/review/action?token=${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load review');
      setReview(data.review);
      setDraft(data.review.replyDraft);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!token || !draft.trim()) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/review/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');
      setPublished(true);
      setPublishResult(data.publishedToGoogle
        ? 'Reply published to Google!'
        : 'Reply approved! Will be published shortly.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  // Stars component
  function Stars({ rating }: { rating: number }) {
    return (
      <span className="text-lg">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
            {i < rating ? '★' : '☆'}
          </span>
        ))}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error && !review) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">&#10060;</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Unable to Load</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (published) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">&#9989;</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">{publishResult}</h1>
          <div className="bg-gray-50 rounded-lg p-4 mt-4 text-left">
            <p className="text-xs text-gray-400 mb-1">Your reply:</p>
            <p className="text-sm text-gray-700 italic">&quot;{draft.substring(0, 200)}{draft.length > 200 ? '...' : ''}&quot;</p>
          </div>
          <p className="text-xs text-gray-400 mt-6">Powered by ReplyWise AI</p>
        </div>
      </div>
    );
  }

  if (!review) return null;

  const ratingColor = review.rating >= 4 ? 'bg-green-50 border-green-200' :
    review.rating >= 3 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">R</span>
          </div>
          <span className="font-semibold text-gray-800 text-sm">Review Reply</span>
        </div>
        <span className="text-xs text-gray-400">{review.storeName}</span>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Review Card */}
        <div className={`rounded-xl border p-4 ${ratingColor}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
                {review.authorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-800 text-sm">{review.authorName}</div>
                <div className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <Stars rating={review.rating} />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            &quot;{review.content || '(No text)'}&quot;
          </p>
        </div>

        {/* AI Reply Editor */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="text-sm">&#129302;</span>
            <span className="text-sm font-semibold text-gray-700">AI Reply Draft</span>
            <span className="text-xs text-gray-400 ml-auto">{draft.length} chars</span>
          </div>
          <textarea
            className="w-full p-4 text-sm text-gray-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 min-h-[160px]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your reply..."
            rows={6}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handlePublish}
            disabled={publishing || !draft.trim()}
            className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors shadow-lg shadow-green-600/20 text-sm"
          >
            {publishing ? 'Publishing...' : '&#9989; Approve & Publish to Google'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          This link expires in 72 hours. You can also manage replies from the dashboard.
        </p>
      </div>
    </div>
  );
}
