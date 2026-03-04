'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle2, MessageCircle, MessageCircleOff, Search } from 'lucide-react';

interface Review {
  id: number;
  author_name: string;
  rating: number;
  content: string;
  reply_draft: string;
  reply_status: string;
  store_name?: string;
  created_at: string;
  full_json?: any;
}

interface Store {
  id: number;
  name: string;
}

interface ScannerManagerProps {
  reviews: Review[];
  stores: Store[];
  role: 'owner' | 'manager' | 'staff';
  isGoogleConnected: boolean;
}

type FilterTab = 'all' | 'replied' | 'not_replied';

export default function ScannerManager({ reviews: initialReviews, stores, role, isGoogleConnected }: ScannerManagerProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncError, setSyncError] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all');

  // Determine if a review has been replied to
  const isReplied = (r: Review) => {
    if (r.reply_status === 'published') return true;
    // Check if Google already had a reply when we fetched
    if (r.full_json?.reviewReply) return true;
    return false;
  };

  // Filter by store
  const storeFiltered = selectedStoreId === 'all'
    ? initialReviews
    : initialReviews.filter(r => {
        const store = stores.find(s => s.id === selectedStoreId);
        return store && r.store_name === store.name;
      });

  // Filter by tab
  const filteredReviews = tab === 'all'
    ? storeFiltered
    : tab === 'replied'
    ? storeFiltered.filter(isReplied)
    : storeFiltered.filter(r => !isReplied(r));

  // Counts
  const repliedCount = storeFiltered.filter(isReplied).length;
  const notRepliedCount = storeFiltered.filter(r => !isReplied(r)).length;

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError('');
    try {
      const res = await fetch('/api/admin/sync-reviews', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResult(data);
      // Reload page to get fresh data
      if (data.stats?.newReviews > 0) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      setSyncError(err.message);
    }
    setSyncing(false);
  }

  return (
    <div>
      {/* Sync Button + Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Scanning Google...' : 'Scan Now'}
        </button>

        {syncResult && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            Scanned {syncResult.stats.totalFetched} reviews, {syncResult.stats.newReviews} new
          </div>
        )}

        {syncError && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
            {syncError}
          </div>
        )}

        <div className="ml-auto text-sm text-gray-500">
          {initialReviews.length} total reviews
        </div>
      </div>

      {/* Store Filter */}
      <div className="mb-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedStoreId('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedStoreId === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Stores ({initialReviews.length})
          </button>
          {stores.map(store => {
            const count = initialReviews.filter(r => r.store_name === store.name).length;
            return (
              <button
                key={store.id}
                onClick={() => setSelectedStoreId(store.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedStoreId === store.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {store.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Replied / Not Replied Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
            tab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          All ({storeFiltered.length})
        </button>
        <button
          onClick={() => setTab('replied')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
            tab === 'replied' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Replied ({repliedCount})
        </button>
        <button
          onClick={() => setTab('not_replied')}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
            tab === 'not_replied' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageCircleOff className="w-3.5 h-3.5" />
          Not Replied ({notRepliedCount})
        </button>
      </div>

      {/* Review Cards */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No reviews found</p>
          <p className="text-sm mt-1">
            {initialReviews.length === 0
              ? 'Click "Scan Now" to fetch reviews from Google'
              : 'No reviews match the current filter'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReviews.map((review) => {
            const replied = isReplied(review);
            const parsedDraft = (() => {
              try {
                const p = JSON.parse(review.reply_draft);
                return p.draft || review.reply_draft;
              } catch {
                return review.reply_draft;
              }
            })();

            return (
              <div
                key={review.id}
                className={`bg-white rounded-lg p-5 border-l-4 shadow-sm ${
                  replied ? 'border-l-green-500' : 'border-l-red-400'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{review.author_name}</p>
                    <div className="flex text-yellow-500 text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                      ))}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    replied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {replied ? 'Replied' : 'Not Replied'}
                  </span>
                </div>

                {/* Store tag */}
                <p className="text-xs text-gray-400 mb-2">{review.store_name}</p>

                {/* Review content */}
                <p className="text-sm text-gray-700 italic line-clamp-3 mb-3">
                  &ldquo;{review.content || '(No text)'}&rdquo;
                </p>

                {/* Draft preview */}
                {parsedDraft && !replied && (
                  <div className="bg-blue-50 rounded p-2 text-xs text-blue-800 line-clamp-2">
                    <span className="font-medium">Draft: </span>{parsedDraft}
                  </div>
                )}

                {/* Reply status detail */}
                <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    review.reply_status === 'published' ? 'bg-blue-50 text-blue-600' :
                    review.reply_status === 'approved' ? 'bg-green-50 text-green-600' :
                    review.reply_status === 'drafted' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {review.reply_status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
