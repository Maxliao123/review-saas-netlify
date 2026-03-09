'use client';

import { useState } from 'react';

interface FeedbackFormProps {
    storeId: string;
    rating: number;
    onClose: () => void;
}

export function FeedbackForm({ storeId, rating, onClose }: FeedbackFormProps) {
    const [feedback, setFeedback] = useState('');
    const [contact, setContact] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store_id: storeId,
                    rating,
                    feedback_text: feedback,
                    contact_info: contact,
                }),
            });
            if (res.ok) {
                setIsSent(true);
            } else {
                setError('Something went wrong. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('Network error. Please check your connection.');
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isSent) {
        return (
            <div className="text-center py-10 space-y-4">
                <div className="text-4xl">🙏</div>
                <h3 className="text-xl font-bold text-slate-800">Thank you for your feedback!</h3>
                <p className="text-slate-500 text-sm">感謝您的回饋！我們已收到您的訊息。</p>
                <p className="text-slate-500 text-sm">We will review your feedback and work to improve.</p>
                <button
                    onClick={onClose}
                    className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800"
                >
                    Done
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">We&apos;d love to hear from you</h3>
                <p className="text-slate-600">How can we improve? / 我們該如何改善？</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Feedback / 回饋
                </label>
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
                    placeholder="Tell us about your experience... / 請分享您的體驗..."
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact (Optional) / 聯絡方式（選填）
                </label>
                <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Phone or Email / 電話或 Email"
                />
            </div>

            {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? 'Sending...' : 'Send Feedback / 送出'}
                </button>
            </div>
        </form>
    );
}
