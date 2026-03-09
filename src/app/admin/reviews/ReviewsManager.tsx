'use client';

import { useState, useEffect } from 'react';
import { updateReviewStatus, updateReviewDraft, approveReviews } from './actions';
import { getStores } from '../stores/actions';

interface Review {
    id: number;
    author_name: string;
    rating: number;
    content: string;
    reply_draft: string;
    reply_status: string;
    google_review_id?: string;
    store_name?: string;
    platform?: string;
}

interface Store {
    id: number;
    name: string;
    slug?: string;
}

interface ReviewsManagerProps {
    reviews: Review[];
    stores?: Store[];
    role?: 'owner' | 'manager' | 'staff';
}

const PAGE_SIZE = 30;

export default function ReviewsManager({ reviews, stores: propStores, role }: ReviewsManagerProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draftText, setDraftText] = useState('');
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [isBulkApproving, setIsBulkApproving] = useState(false);
    const [stores, setStores] = useState<Store[]>(propStores || []);
    const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
    const [selectedPlatform, setSelectedPlatform] = useState<string | 'all'>('all');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    useEffect(() => {
        if (!propStores) {
            getStores().then(setStores);
        }
    }, [propStores]);

    // Helper to parse draft
    const parseDraft = (raw: string) => {
        try {
            const parsed = JSON.parse(raw);
            return {
                body: parsed.draft,
                category: parsed.category || 'Legacy/Manual'
            };
        } catch {
            return { body: raw, category: 'Legacy/Manual' };
        }
    };

    // 1. Filter by Store first
    const storeFilteredReviews = selectedStoreId === 'all'
        ? reviews
        : reviews.filter(r => {
            const store = stores.find(s => s.id === selectedStoreId);
            return store && r.store_name === store.name;
        });

    // 2. Filter by Platform
    const platformFilteredReviews = selectedPlatform === 'all'
        ? storeFilteredReviews
        : storeFilteredReviews.filter(r => (r.platform || 'google') === selectedPlatform);

    // 3. Filter by Category
    const filteredReviews = selectedCategory === 'all'
        ? platformFilteredReviews
        : platformFilteredReviews.filter(r => {
            const { category } = parseDraft(r.reply_draft || '');
            return category === selectedCategory;
        });

    // Platform counts
    const platformCounts = storeFilteredReviews.reduce((acc, r) => {
        const p = r.platform || 'google';
        acc[p] = (acc[p] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const platformKeys = Object.keys(platformCounts).sort();

    // Counts Logic
    const storeCounts = stores.reduce((acc, store) => {
        const count = reviews.filter(r => r.store_name === store.name).length;
        acc[store.id] = count;
        return acc;
    }, {} as Record<number, number>);

    // Category Counts (based on current store selection)
    const categoryCounts = storeFilteredReviews.reduce((acc, r) => {
        const { category } = parseDraft(r.reply_draft || '');
        const cat = category || 'Unknown';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Get sorted categories
    const categories = Object.keys(categoryCounts).sort();

    const handleEdit = (review: Review) => {
        setEditingId(review.id);
        const { body } = parseDraft(review.reply_draft || '');
        setDraftText(body || '');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setDraftText('');
    };

    const handleSaveDraft = async (id: number) => {
        if (loadingId) return;
        setLoadingId(id);
        // Note: Saving as plain text, effectively removing the JSON structure.
        // This marks it as "Manual" for future renders.
        await updateReviewDraft(id, draftText);
        setEditingId(null);
        setLoadingId(null);
    };

    const handleApprove = async (id: number) => {
        if (loadingId) return;
        setLoadingId(id);
        await updateReviewStatus(id, 'approved');
        setLoadingId(null);
    };

    // Count how many filtered reviews are approvable
    const approvableFilteredCount = filteredReviews.filter(
        r => r.reply_status === 'drafted' || r.reply_status === 'pending'
    ).length;

    const handleBulkApprove = async () => {
        if (isBulkApproving) return;
        const confirm = window.confirm(
            `Approve ${approvableFilteredCount} review${approvableFilteredCount > 1 ? 's' : ''} currently shown? They will be queued for daily publishing.`
        );
        if (!confirm) return;

        setIsBulkApproving(true);
        // Only approve reviews that match current filters (store + category)
        const draftIds = filteredReviews
            .filter(r => r.reply_status === 'drafted' || r.reply_status === 'pending')
            .map(r => r.id);

        await approveReviews(draftIds);
        setIsBulkApproving(false);
    };

    return (
        <div>
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBulkApprove}
                        disabled={isBulkApproving || approvableFilteredCount === 0}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isBulkApproving ? 'Approving...' : `Approve All (${approvableFilteredCount})`}
                    </button>
                    <div className="text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded border border-blue-100 max-w-md">
                        ℹ️ Approved replies are queued for daily automated publishing.</div>
                </div>
                <div className="text-sm text-gray-500">
                    Showing {filteredReviews.length} reviews
                </div>
            </div>

            {/* Store Filter */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Store</label>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => { setSelectedStoreId('all'); setSelectedCategory('all'); setVisibleCount(PAGE_SIZE); }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedStoreId === 'all'
                            ? 'bg-gray-800 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        All Stores ({reviews.length})
                    </button>
                    {stores.map(store => (
                        <button
                            key={store.id}
                            onClick={() => { setSelectedStoreId(store.id); setSelectedCategory('all'); setVisibleCount(PAGE_SIZE); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedStoreId === store.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {store.name} ({storeCounts[store.id] || 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Platform Filter */}
            {platformKeys.length > 1 && (
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Platform</label>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => { setSelectedPlatform('all'); setVisibleCount(PAGE_SIZE); }}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedPlatform === 'all'
                                ? 'bg-gray-800 text-white border-gray-800'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            All Platforms ({storeFilteredReviews.length})
                        </button>
                        {platformKeys.map(p => (
                            <button
                                key={p}
                                onClick={() => { setSelectedPlatform(p); setVisibleCount(PAGE_SIZE); }}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${selectedPlatform === p
                                    ? 'bg-gray-800 text-white border-gray-800'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {p} ({platformCounts[p]})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Category Filter */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => { setSelectedCategory('all'); setVisibleCount(PAGE_SIZE); }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedCategory === 'all'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        All Categories ({storeFilteredReviews.length})
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => { setSelectedCategory(cat); setVisibleCount(PAGE_SIZE); }}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedCategory === cat
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {cat} ({categoryCounts[cat]})
                        </button>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {reviews.length === 0 && (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                    <div className="text-5xl mb-4">📭</div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">No reviews yet</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        Reviews will appear here once your Google Business reviews are synced.
                        Make sure you&apos;ve connected your Google Business profile in{' '}
                        <a href="/admin/settings/google" className="text-blue-600 underline">Settings</a>.
                    </p>
                </div>
            )}

            {reviews.length > 0 && filteredReviews.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No reviews match the current filters.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReviews.slice(0, visibleCount).map((review) => {
                    const { body: draftBody, category } = parseDraft(review.reply_draft || '');

                    return (
                        <div key={review.id} className="bg-white shadow rounded-lg p-6 flex flex-col border border-gray-200 relative overflow-hidden">
                            {/* Store + Platform Label */}
                            <div className="absolute top-0 left-0 flex items-center gap-1 z-10">
                                <div className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-br-lg font-mono max-w-[50%] truncate">
                                    {review.store_name || 'Unknown Store'}
                                </div>
                                {review.platform && review.platform !== 'google' && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded text-white font-bold ${
                                        review.platform === 'facebook' ? 'bg-blue-600' :
                                        review.platform === 'yelp' ? 'bg-red-600' :
                                        'bg-green-600'
                                    }`}>
                                        {review.platform.toUpperCase()}
                                    </span>
                                )}
                            </div>

                            {/* Category Label */}
                            {category && category !== 'Legacy/Manual' && (
                                <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-bl-lg font-medium border-l border-b border-purple-200 z-10">
                                    AI: {category}
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4 mt-6">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{review.author_name}</h3>
                                    <div className="flex text-yellow-500">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                                        ))}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${review.reply_status === 'approved' ? 'bg-green-100 text-green-800' :
                                    review.reply_status === 'published' ? 'bg-blue-100 text-blue-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {review.reply_status}
                                </span>
                            </div>

                            <p className="text-gray-700 mb-4 italic">"{review.content}"</p>

                            <div className="mt-auto">
                                <label className="block text-sm font-medium text-gray-700 mb-1">AI Draft Reply:</label>

                                {editingId === review.id ? (
                                    <div className="mb-4">
                                        <textarea
                                            className="w-full border rounded p-2 text-sm h-32 mb-2"
                                            value={draftText}
                                            onChange={(e) => setDraftText(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveDraft(review.id)}
                                                disabled={!!loadingId}
                                                className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={!!loadingId}
                                                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <div
                                            className="p-3 bg-gray-50 rounded text-sm text-gray-800 border border-gray-100 min-h-[4rem] cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors whitespace-pre-wrap relative group"
                                            onClick={() => handleEdit(review)}
                                        >
                                            {draftBody || <span className="text-gray-400 italic">(Generating draft...)</span>}
                                            <span className="absolute bottom-1 right-2 text-[10px] text-gray-400 group-hover:text-blue-500">✎ click to edit</span>
                                        </div>
                                    </div>
                                )}

                                {review.reply_status !== 'approved' && review.reply_status !== 'published' && (
                                    <button
                                        onClick={() => handleApprove(review.id)}
                                        disabled={!!loadingId}
                                        className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {loadingId === review.id ? 'Processing...' : '✓ Approve'}
                                    </button>
                                )}

                                {review.reply_status === 'approved' && (
                                    <div className="text-center text-sm text-green-600 font-medium py-2 border border-green-200 rounded bg-green-50">
                                        Ready for Auto-Publish
                                    </div>
                                )}
                                {review.reply_status === 'published' && (
                                    <div className="text-center text-sm text-blue-600 font-medium py-2 border border-blue-200 rounded bg-blue-50">
                                        Published on Google
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Load More */}
            {filteredReviews.length > visibleCount && (
                <div className="text-center mt-8">
                    <button
                        onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                        Load More ({filteredReviews.length - visibleCount} remaining)
                    </button>
                </div>
            )}
        </div>
    );
}
