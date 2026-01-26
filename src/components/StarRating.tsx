'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
    onRatingSelect: (rating: number) => void;
}

export function StarRating({ onRatingSelect }: StarRatingProps) {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">How was your experience?</h2>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                    <button
                        key={val}
                        type="button"
                        className="transition-transform hover:scale-110 focus:outline-none p-1"
                        onMouseEnter={() => setHover(val)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => onRatingSelect(val)}
                    >
                        <Star
                            size={48}
                            className={`transition-colors duration-200 ${val <= hover ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'
                                }`}
                        />
                    </button>
                ))}
            </div>
            <p className="text-sm text-slate-500">Click to rate</p>
        </div>
    );
}
