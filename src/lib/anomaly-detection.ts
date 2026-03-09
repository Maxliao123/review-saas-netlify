/**
 * Anomaly Detection Engine
 *
 * Scores reviews for suspicious patterns that may indicate
 * fake, manipulated, or competitor-planted reviews.
 *
 * Score breakdown (0-100, higher = more suspicious):
 *   - Text quality signal (0-25): Generic, very short, all caps
 *   - Pattern signal (0-25): Duplicate/similar content, burst timing
 *   - Sentiment mismatch (0-25): Rating vs sentiment disagreement
 *   - Profile signal (0-25): Generic names, suspicious patterns
 */

export interface AnomalyInput {
  reviewId: string;
  authorName: string;
  rating: number;
  content: string;
  createdAt: string;                    // ISO date
  sentimentScore?: number | null;       // -1 to 1
  sentimentLabel?: string | null;
  // Context from other reviews (same store, recent)
  recentReviews?: Array<{
    authorName: string;
    rating: number;
    content: string;
    createdAt: string;
  }>;
}

export interface AnomalyResult {
  score: number;                        // 0-100 (higher = more suspicious)
  level: 'clean' | 'suspect' | 'flagged';
  flags: string[];                      // Human-readable red flags
  breakdown: {
    textQuality: number;
    patternSignal: number;
    sentimentMismatch: number;
    profileSignal: number;
  };
}

// Generic/spam phrases commonly found in fake reviews
const GENERIC_PHRASES = [
  /^great\s*(place|food|service|experience)?!*$/i,
  /^amazing!*$/i,
  /^awesome!*$/i,
  /^terrible!*$/i,
  /^worst\s*(ever|place)?!*$/i,
  /^good$/i,
  /^bad$/i,
  /^nice$/i,
  /^excellent!*$/i,
  /^horrible!*$/i,
  /^love\s*(it|this\s*place)?!*$/i,
  /^best\s*(ever|place)?!*$/i,
  /^highly\s*recommend!*$/i,
  /^do\s*not\s*(go|visit|recommend)!*$/i,
  /^5\s*stars?!*$/i,
  /^1\s*star!*$/i,
];

// Suspicious author name patterns
const SUSPICIOUS_NAME_PATTERNS = [
  /^[A-Z]\s[A-Z]$/,                     // Single initial names like "J K"
  /^user\d+$/i,                          // "user123"
  /^google\s*user/i,                     // "Google User"
  /^a\s*google\s*user/i,                 // "A Google User"
  /^customer$/i,
  /^anonymous$/i,
  /^reviewer$/i,
  /^\w{1,2}$/,                           // 1-2 character names
];

/**
 * Compute anomaly score for a single review.
 */
export function detectAnomaly(input: AnomalyInput): AnomalyResult {
  const flags: string[] = [];
  const breakdown = {
    textQuality: 0,
    patternSignal: 0,
    sentimentMismatch: 0,
    profileSignal: 0,
  };

  const text = (input.content || '').trim();

  // === 1. Text Quality Signal (0-25) ===
  if (text.length === 0) {
    // Rating-only reviews are normal, not suspicious
    breakdown.textQuality = 2;
  } else if (text.length < 10) {
    breakdown.textQuality = 15;
    flags.push('Extremely short review text');
  } else if (text.length < 20) {
    breakdown.textQuality = 8;
    flags.push('Very short review text');
  }

  // Generic phrase check
  const isGeneric = GENERIC_PHRASES.some(pattern => pattern.test(text));
  if (isGeneric) {
    breakdown.textQuality = Math.min(25, breakdown.textQuality + 12);
    flags.push('Review uses generic/template-like phrase');
  }

  // All caps check
  if (text.length > 5 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    breakdown.textQuality = Math.min(25, breakdown.textQuality + 8);
    flags.push('Review is entirely in CAPS');
  }

  // Excessive punctuation (!!!, ???, ...)
  const excessivePunctuation = (text.match(/[!?]{3,}/g) || []).length;
  if (excessivePunctuation >= 2) {
    breakdown.textQuality = Math.min(25, breakdown.textQuality + 5);
    flags.push('Excessive punctuation usage');
  }

  // === 2. Pattern Signal (0-25) ===
  if (input.recentReviews && input.recentReviews.length > 0) {
    // Check for duplicate/very similar content
    const similarCount = input.recentReviews.filter(r =>
      textSimilarity(text, r.content) > 0.8
    ).length;
    if (similarCount > 0 && text.length > 0) {
      breakdown.patternSignal = Math.min(25, 15 + similarCount * 5);
      flags.push(`Content highly similar to ${similarCount} other review(s)`);
    }

    // Burst detection: many reviews in short window
    const reviewDate = new Date(input.createdAt).getTime();
    const burstWindow = 2 * 60 * 60 * 1000; // 2 hours
    const burstCount = input.recentReviews.filter(r => {
      const diff = Math.abs(new Date(r.createdAt).getTime() - reviewDate);
      return diff < burstWindow;
    }).length;

    if (burstCount >= 5) {
      breakdown.patternSignal = Math.min(25, breakdown.patternSignal + 15);
      flags.push(`${burstCount + 1} reviews within 2-hour window (burst pattern)`);
    } else if (burstCount >= 3) {
      breakdown.patternSignal = Math.min(25, breakdown.patternSignal + 8);
      flags.push(`${burstCount + 1} reviews within 2-hour window`);
    }

    // Same rating pattern (all 5-star or all 1-star in burst)
    if (burstCount >= 2) {
      const burstReviews = input.recentReviews.filter(r => {
        const diff = Math.abs(new Date(r.createdAt).getTime() - reviewDate);
        return diff < burstWindow;
      });
      const allSameRating = burstReviews.every(r => r.rating === input.rating);
      if (allSameRating && (input.rating === 5 || input.rating === 1)) {
        breakdown.patternSignal = Math.min(25, breakdown.patternSignal + 5);
        flags.push('Burst of identical ratings detected');
      }
    }
  }

  // === 3. Sentiment Mismatch (0-25) ===
  if (input.sentimentScore !== undefined && input.sentimentScore !== null && text.length > 10) {
    // Positive text + low rating
    if (input.sentimentScore > 0.5 && input.rating <= 2) {
      breakdown.sentimentMismatch = 20;
      flags.push('Positive sentiment but low rating — possible manipulation');
    } else if (input.sentimentScore < -0.5 && input.rating >= 4) {
      // Negative text + high rating (possible sarcasm or competitor with good star)
      breakdown.sentimentMismatch = 18;
      flags.push('Negative sentiment but high rating — unusual pattern');
    } else if (input.sentimentScore > 0.3 && input.rating === 1) {
      breakdown.sentimentMismatch = 15;
      flags.push('Sentiment does not align with 1-star rating');
    } else if (input.sentimentScore < -0.3 && input.rating === 5) {
      breakdown.sentimentMismatch = 15;
      flags.push('Sentiment does not align with 5-star rating');
    }
  }

  // === 4. Profile Signal (0-25) ===
  const isSuspiciousName = SUSPICIOUS_NAME_PATTERNS.some(pattern =>
    pattern.test(input.authorName.trim())
  );
  if (isSuspiciousName) {
    breakdown.profileSignal = 12;
    flags.push('Author name matches suspicious pattern');
  }

  // Duplicate author names in recent reviews
  if (input.recentReviews) {
    const sameAuthorCount = input.recentReviews.filter(r =>
      r.authorName.toLowerCase() === input.authorName.toLowerCase()
    ).length;
    if (sameAuthorCount >= 2) {
      breakdown.profileSignal = Math.min(25, breakdown.profileSignal + 15);
      flags.push(`Same author name appears ${sameAuthorCount + 1} times`);
    } else if (sameAuthorCount === 1) {
      breakdown.profileSignal = Math.min(25, breakdown.profileSignal + 8);
      flags.push('Duplicate author name found');
    }
  }

  // === Compute total ===
  const score = breakdown.textQuality + breakdown.patternSignal +
    breakdown.sentimentMismatch + breakdown.profileSignal;

  const clampedScore = Math.min(100, Math.max(0, score));

  const level: AnomalyResult['level'] =
    clampedScore >= 50 ? 'flagged' :
    clampedScore >= 25 ? 'suspect' : 'clean';

  return { score: clampedScore, level, flags, breakdown };
}

/**
 * Simple text similarity using Jaccard index on word trigrams.
 * Returns 0-1 where 1 = identical.
 */
export function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const trigramsA = getWordTrigrams(a.toLowerCase());
  const trigramsB = getWordTrigrams(b.toLowerCase());

  if (trigramsA.size === 0 || trigramsB.size === 0) {
    // Fallback to exact match for very short texts
    return a.toLowerCase().trim() === b.toLowerCase().trim() ? 1 : 0;
  }

  let intersection = 0;
  for (const trigram of trigramsA) {
    if (trigramsB.has(trigram)) intersection++;
  }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getWordTrigrams(text: string): Set<string> {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const trigrams = new Set<string>();
  for (let i = 0; i <= words.length - 3; i++) {
    trigrams.add(words.slice(i, i + 3).join(' '));
  }
  // Also add bigrams for shorter texts
  for (let i = 0; i <= words.length - 2; i++) {
    trigrams.add(words.slice(i, i + 2).join(' '));
  }
  return trigrams;
}

/**
 * Batch analyze reviews and return sorted by suspicion score.
 */
export function batchDetectAnomalies(
  reviews: Array<{
    id: string;
    authorName: string;
    rating: number;
    content: string;
    createdAt: string;
    sentimentScore?: number | null;
    sentimentLabel?: string | null;
  }>
): Array<{ reviewId: string; authorName: string; rating: number; content: string } & AnomalyResult> {
  return reviews.map(review => {
    const result = detectAnomaly({
      reviewId: review.id,
      authorName: review.authorName,
      rating: review.rating,
      content: review.content,
      createdAt: review.createdAt,
      sentimentScore: review.sentimentScore,
      sentimentLabel: review.sentimentLabel,
      recentReviews: reviews
        .filter(r => r.id !== review.id)
        .map(r => ({
          authorName: r.authorName,
          rating: r.rating,
          content: r.content,
          createdAt: r.createdAt,
        })),
    });
    return {
      reviewId: review.id,
      authorName: review.authorName,
      rating: review.rating,
      content: review.content,
      ...result,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Anomaly level display config.
 */
export const ANOMALY_LEVEL_CONFIG = {
  flagged: { color: 'red', icon: '🚩', label: 'Flagged', bgClass: 'bg-red-50 border-red-200' },
  suspect: { color: 'yellow', icon: '⚠️', label: 'Suspect', bgClass: 'bg-yellow-50 border-yellow-200' },
  clean: { color: 'green', icon: '✅', label: 'Clean', bgClass: 'bg-green-50 border-green-200' },
};
