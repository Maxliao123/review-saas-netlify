'use client';

import { useState, useEffect } from 'react';
import { Mail, User, UserPlus, CheckCircle, Clock, Eye, Star } from 'lucide-react';

interface Review {
  id: string;
  store_id: number;
  store_name: string;
  author_name: string;
  rating: number;
  content: string;
  reply_draft: string | null;
  reply_status: string;
  assigned_to: string | null;
  assigned_at: string | null;
  created_at: string;
  platform: string;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface StoreInfo {
  id: number;
  name: string;
}

type ViewType = 'inbox' | 'mine' | 'unassigned';

export default function TeamInbox() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>('inbox');
  const [filterStore, setFilterStore] = useState<string>('');
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => { fetchInbox(); }, [view, filterStore]);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view });
      if (filterStore) params.set('store_id', filterStore);

      const res = await fetch(`/api/admin/reviews/assign?${params}`);
      const data = await res.json();

      setReviews(data.reviews || []);
      setMembers(data.members || []);
      setStores(data.stores || []);
      setCurrentUserId(data.currentUserId || '');
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const assignReview = async (reviewId: string, userId: string | null) => {
    setAssigning(reviewId);
    try {
      await fetch('/api/admin/reviews/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, assignTo: userId }),
      });
      fetchInbox();
    } catch (err) {
      console.error('Assign error:', err);
    } finally {
      setAssigning(null);
    }
  };

  const approveReview = async (reviewId: string) => {
    try {
      await fetch('/api/admin/sync-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', reviewId }),
      });
      fetchInbox();
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const getMemberName = (userId: string | null) => {
    if (!userId) return null;
    const member = members.find(m => m.id === userId);
    return member?.name || member?.email || 'Unknown';
  };

  const ratingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
      />
    ));
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      drafted: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      published: 'bg-emerald-100 text-emerald-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  // Stats
  const unassignedCount = reviews.filter(r => !r.assigned_to).length;
  const myCount = reviews.filter(r => r.assigned_to === currentUserId).length;

  return (
    <div className="space-y-6">
      {/* View Tabs + Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[
            { key: 'inbox' as ViewType, label: 'All Active', count: reviews.length },
            { key: 'mine' as ViewType, label: 'Assigned to Me', count: myCount },
            { key: 'unassigned' as ViewType, label: 'Unassigned', count: unassignedCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {view === tab.key && (
                <span className="ml-1.5 text-xs text-gray-400">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {stores.length > 1 && (
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All Stores</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Review List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading team inbox...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            {view === 'mine' ? 'No reviews assigned to you' :
             view === 'unassigned' ? 'All reviews are assigned' :
             'No active reviews'}
          </h3>
          <p className="text-sm text-gray-400">
            {view === 'mine' ? 'Reviews assigned to you will appear here.' :
             view === 'unassigned' ? 'Great job keeping the inbox clean!' :
             'New reviews will appear here when they arrive.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => {
            const draftText = (() => {
              if (!review.reply_draft) return null;
              try {
                const parsed = JSON.parse(review.reply_draft);
                return parsed.draft || review.reply_draft;
              } catch { return review.reply_draft; }
            })();

            return (
              <div
                key={review.id}
                className={`bg-white rounded-lg border p-5 transition-colors ${
                  review.assigned_to === currentUserId
                    ? 'border-blue-200 bg-blue-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Rating + Meta */}
                  <div className="shrink-0 text-center">
                    <div className={`text-2xl font-bold ${
                      review.rating >= 4 ? 'text-green-600' :
                      review.rating >= 3 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {review.rating}
                    </div>
                    <div className="flex mt-0.5">{ratingStars(review.rating)}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">{review.author_name}</span>
                      <span className="text-xs text-gray-400">{review.store_name}</span>
                      <span className="text-xs text-gray-400 capitalize">{review.platform}</span>
                      {statusBadge(review.reply_status)}
                    </div>

                    {review.content && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {review.content}
                      </p>
                    )}

                    {draftText && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 mb-2 line-clamp-2">
                        <span className="font-medium text-gray-600">AI Draft:</span> {draftText}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{new Date(review.created_at).toLocaleDateString()}</span>
                      {review.assigned_to && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <User className="w-3 h-3" />
                          {getMemberName(review.assigned_to)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex flex-col gap-2">
                    {/* Assign dropdown */}
                    <select
                      value={review.assigned_to || ''}
                      onChange={(e) => assignReview(review.id, e.target.value || null)}
                      disabled={assigning === review.id}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white min-w-[140px]"
                    >
                      <option value="">Unassigned</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>

                    {/* Quick actions */}
                    {review.reply_status === 'drafted' && (
                      <button
                        onClick={() => approveReview(review.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </button>
                    )}

                    {!review.assigned_to && (
                      <button
                        onClick={() => assignReview(review.id, currentUserId)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
                      >
                        <UserPlus className="w-3 h-3" />
                        Take
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
