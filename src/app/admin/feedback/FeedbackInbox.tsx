'use client';

import { useState } from 'react';

interface FeedbackItem {
  id: number;
  store_id: number;
  store_name: string;
  rating: number;
  feedback_text: string | null;
  contact_info: string | null;
  status: string;
  created_at: string;
}

interface Store {
  id: number;
  name: string;
}

export default function FeedbackInbox({ feedback, stores }: { feedback: FeedbackItem[]; stores: Store[] }) {
  const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');

  const filtered = feedback.filter(f => {
    if (selectedStoreId !== 'all' && f.store_id !== selectedStoreId) return false;
    if (selectedStatus !== 'all' && f.status !== selectedStatus) return false;
    return true;
  });

  const statusCounts = feedback.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (feedback.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="text-5xl mb-4">💬</div>
        <h3 className="text-lg font-bold text-gray-700 mb-2">No feedback yet</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Customer feedback will appear here when customers submit the survey form with low ratings.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-6 mb-6">
        {/* Store filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Store</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedStoreId('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedStoreId === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({feedback.length})
            </button>
            {stores.map(s => {
              const count = feedback.filter(f => f.store_id === s.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStoreId(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedStoreId === s.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedStatus === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {['new', 'read', 'resolved'].map(s => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedStatus === s ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s} ({statusCounts[s] || 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback list */}
      <div className="space-y-4">
        {filtered.map(f => (
          <div
            key={f.id}
            className={`bg-white rounded-lg border p-5 ${
              f.status === 'new' ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Rating */}
                <div className="flex text-yellow-500 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < f.rating ? '★' : '☆'}</span>
                  ))}
                </div>
                {/* Store */}
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {f.store_name}
                </span>
                {/* Status badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  f.status === 'new' ? 'bg-orange-100 text-orange-700' :
                  f.status === 'read' ? 'bg-gray-100 text-gray-600' :
                  'bg-green-100 text-green-700'
                }`}>
                  {f.status}
                </span>
              </div>
              <time className="text-xs text-gray-400">
                {new Date(f.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </time>
            </div>

            {/* Feedback text */}
            {f.feedback_text ? (
              <p className="text-gray-800 text-sm leading-relaxed">{f.feedback_text}</p>
            ) : (
              <p className="text-gray-400 text-sm italic">No text provided (rating only)</p>
            )}

            {/* Contact info */}
            {f.contact_info && (
              <div className="mt-3 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded border border-gray-100">
                Contact: <span className="font-medium text-gray-700">{f.contact_info}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No feedback matches the current filters.</p>
        </div>
      )}
    </div>
  );
}
