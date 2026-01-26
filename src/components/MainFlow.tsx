'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StarRating } from '@/components/StarRating';
import { FeedbackForm } from '@/components/FeedbackForm';
import { ReviewGenerator } from '@/components/ReviewGenerator';
import { Loader2 } from 'lucide-react';

function StoreLoader() {
    const params = useSearchParams();
    const storeId = params.get('store') || params.get('storeid') || 'decision'; // Default ?

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [storeData, setStoreData] = useState<any>(null);

    // Flow State
    const [view, setView] = useState<'rating' | 'feedback' | 'generator'>('rating');
    const [rating, setRating] = useState(0);

    useEffect(() => {
        if (!storeId) {
            // If no store param, maybe show a default or error
            // But for migration lets allow a default fallback fetch if needed
            // setStatus('error');
            // return;
        }

        fetch(`/api/store?store=${encodeURIComponent(storeId)}`)
            .then(r => {
                if (!r.ok) throw new Error('Store not found');
                return r.json();
            })
            .then(data => {
                setStoreData(data);
                setStatus('success');
            })
            .catch((e) => {
                console.error(e);
                setStatus('error');
            });
    }, [storeId]);

    function handleRating(r: number) {
        setRating(r);
        if (r <= 3) {
            setView('feedback');
        } else {
            setView('generator');
        }
    }

    if (status === 'loading') {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex h-screen items-center justify-center text-red-500">
                Store not found. Please check the URL.
            </div>
        );
    }

    // Dynamic Theme Colors
    const themeStyles = {
        '--blue-500': storeData.themeBlue || '#0A84FF',
        '--on-blue': storeData.themeOnBlue || '#FFFFFF',
    } as React.CSSProperties;

    return (
        <div className="min-h-screen bg-[#F5F7FB] font-sans pb-10" style={themeStyles}>
            <div className="mx-auto max-w-[760px] p-3 md:p-4">
                <div className="relative overflow-hidden rounded-[20px] bg-white shadow-xl ring-1 ring-black/5">

                    {/* Hero Section */}
                    <div className="relative h-[180px] md:h-[220px] w-full bg-slate-100">
                        {storeData.placePhotoUrl || storeData.heroUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={storeData.placePhotoUrl || storeData.heroUrl}
                                alt="Hero"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-300">
                                No Image
                            </div>
                        )}

                        {/* Logo Badge */}
                        {(storeData.logoUrl || storeData.placePhotoUrl) && (
                            <div className="absolute bottom-[-24px] left-1/2 h-16 w-16 -translate-x-1/2 transform rounded-xl bg-white p-2 shadow-lg md:h-[72px] md:w-[72px]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={storeData.logoUrl || storeData.placePhotoUrl}
                                    alt="Logo"
                                    className="h-full w-full rounded-lg object-contain"
                                />
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="px-4 pb-8 pt-12 md:px-8">

                        {view === 'rating' && (
                            <div className="animate-in fade-in duration-500">
                                <div className="text-center mb-6">
                                    <h1 className="text-2xl font-extrabold text-slate-900">{storeData.name}</h1>
                                    <p className="text-slate-500 mt-1">We value your feedback</p>
                                </div>
                                <StarRating onRatingSelect={handleRating} />
                            </div>
                        )}

                        {view === 'feedback' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <FeedbackForm
                                    storeId={storeData.id || storeId} // Use DB ID if available
                                    rating={rating}
                                    onClose={() => setView('rating')}
                                />
                            </div>
                        )}

                        {view === 'generator' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <ReviewGenerator
                                    storeId={storeId}
                                    storeData={storeData}
                                />
                            </div>
                        )}

                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-slate-400">
                    Powered by Smart Google Review
                </div>
            </div>
        </div>
    );
}

export function MainFlow() {
    return (
        <Suspense fallback={<div />}>
            <StoreLoader />
        </Suspense>
    );
}
