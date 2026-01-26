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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
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
                alert('Something went wrong. Please try again.');
            }
        } catch (err) {
            console.error(err);
            alert('Network error.');
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isSent) {
        return (
            <div className="text-center py-10 space-y-4">
                <div className="text-4xl">🙏</div>
                <h3 className="text-xl font-bold text-slate-800">Thank you for your feedback!</h3>
                <p className="text-slate-600">We have received your message and will let the manager know.</p>
                <button
                    onClick={onClose}
                    className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800"
                >
                    Close
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">We are sorry to hear that.</h3>
                <p className="text-slate-600">How can we improve?</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feedback</label>
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
                    placeholder="Tell us about your experience..."
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact (Optional)</label>
                <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Phone or Email (if you'd like us to reach out)"
                />
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isSubmitting ? 'Sending...' : 'Send Feedback'}
                </button>
            </div>
        </form>
    );
}
