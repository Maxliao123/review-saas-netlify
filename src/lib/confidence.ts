/**
 * Auto-Reply Confidence Scoring
 *
 * Computes a confidence score (0-100) explaining *why* a reply
 * was auto-approved. Displayed in the admin dashboard so owners
 * can trust the system and fine-tune thresholds.
 *
 * Score breakdown:
 *   - Rating signal (0-30): Higher rating = safer to auto-reply
 *   - Content safety (0-25): Short/generic reviews are safer
 *   - Template match (0-20): Template-based replies are more predictable
 *   - Historical accuracy (0-15): Store's auto-reply track record
 *   - Sentiment alignment (0-10): Positive sentiment + high rating = aligned
 */

export interface ConfidenceResult {
  score: number;           // 0-100 overall confidence
  level: 'high' | 'medium' | 'low';
  reasons: string[];       // Human-readable reasons
  breakdown: {
    ratingSignal: number;
    contentSafety: number;
    templateMatch: number;
    historicalAccuracy: number;
    sentimentAlignment: number;
  };
}

export interface ConfidenceInput {
  rating: number;                // 1-5
  reviewText: string;            // Customer review content
  replySource: 'template' | 'ai'; // How the reply was generated
  autoReplyMode: string;         // manual | auto_positive | auto_all
  minRatingThreshold: number;    // Store's min rating for auto-reply
  sentimentScore?: number | null;  // -1 to 1 if available
  sentimentLabel?: string | null;  // positive | neutral | negative
  storeAutoApproveRate?: number;   // 0-1 historical rate (optional)
}

/**
 * Compute confidence score for an auto-approved reply.
 */
export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];
  const breakdown = {
    ratingSignal: 0,
    contentSafety: 0,
    templateMatch: 0,
    historicalAccuracy: 0,
    sentimentAlignment: 0,
  };

  // 1. Rating Signal (0-30)
  if (input.rating === 5) {
    breakdown.ratingSignal = 30;
    reasons.push('5-star review — highest safety for auto-reply');
  } else if (input.rating === 4) {
    breakdown.ratingSignal = 22;
    reasons.push('4-star review — positive intent, safe to auto-reply');
  } else if (input.rating === 3) {
    breakdown.ratingSignal = 10;
    reasons.push('3-star review — mixed, moderate confidence');
  } else if (input.rating === 2) {
    breakdown.ratingSignal = 4;
    reasons.push('2-star review — negative, low confidence');
  } else {
    breakdown.ratingSignal = 0;
    reasons.push('1-star review — requires careful human review');
  }

  // 2. Content Safety (0-25)
  const textLength = (input.reviewText || '').trim().length;
  const hasNegativeKeywords = /complain|terrible|awful|worst|disgust|never again|refund|lawsuit|health department|food poison/i.test(input.reviewText);
  const hasEscalationKeywords = /manager|corporate|lawyer|attorney|health inspector|sue|report/i.test(input.reviewText);

  if (hasEscalationKeywords) {
    breakdown.contentSafety = 0;
    reasons.push('Review mentions escalation — requires human attention');
  } else if (hasNegativeKeywords) {
    breakdown.contentSafety = 5;
    reasons.push('Review contains strong negative language');
  } else if (textLength === 0) {
    breakdown.contentSafety = 25;
    reasons.push('No review text — rating-only, safe to auto-reply');
  } else if (textLength < 50) {
    breakdown.contentSafety = 22;
    reasons.push('Short review text — low risk content');
  } else if (textLength < 200) {
    breakdown.contentSafety = 18;
    reasons.push('Medium-length review — standard content');
  } else {
    breakdown.contentSafety = 12;
    reasons.push('Long review — more content to potentially mismatch');
  }

  // 3. Template Match (0-20)
  if (input.replySource === 'template') {
    breakdown.templateMatch = 20;
    reasons.push('Reply from pre-approved template — highly predictable');
  } else {
    breakdown.templateMatch = 10;
    reasons.push('AI-generated reply — may need review for tone accuracy');
  }

  // 4. Historical Accuracy (0-15)
  if (input.storeAutoApproveRate !== undefined && input.storeAutoApproveRate !== null) {
    if (input.storeAutoApproveRate >= 0.95) {
      breakdown.historicalAccuracy = 15;
      reasons.push('Store has 95%+ auto-approve success rate');
    } else if (input.storeAutoApproveRate >= 0.8) {
      breakdown.historicalAccuracy = 10;
      reasons.push('Store has 80%+ auto-approve success rate');
    } else {
      breakdown.historicalAccuracy = 5;
      reasons.push('Store has <80% auto-approve rate — building history');
    }
  } else {
    breakdown.historicalAccuracy = 8;
    reasons.push('No historical data yet — default confidence');
  }

  // 5. Sentiment Alignment (0-10)
  if (input.sentimentScore !== undefined && input.sentimentScore !== null) {
    if (input.rating >= 4 && input.sentimentScore > 0.3) {
      breakdown.sentimentAlignment = 10;
      reasons.push('Positive sentiment aligns with high rating');
    } else if (input.rating >= 4 && input.sentimentScore > 0) {
      breakdown.sentimentAlignment = 7;
      reasons.push('Mildly positive sentiment with good rating');
    } else if (input.rating <= 2 && input.sentimentScore < -0.3) {
      breakdown.sentimentAlignment = 5;
      reasons.push('Negative sentiment matches low rating — consistent');
    } else if (Math.abs((input.sentimentScore || 0)) < 0.2) {
      breakdown.sentimentAlignment = 6;
      reasons.push('Neutral sentiment — no red flags');
    } else {
      breakdown.sentimentAlignment = 3;
      reasons.push('Sentiment-rating mismatch — exercise caution');
    }
  } else {
    breakdown.sentimentAlignment = 5;
    reasons.push('Sentiment not yet analyzed');
  }

  // Total
  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const level = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';

  return { score, level, reasons, breakdown };
}

/**
 * Quick check: should this review be flagged for manual review
 * even though auto-approve rules say it's okay?
 */
export function shouldFlagForReview(confidence: ConfidenceResult): boolean {
  return confidence.score < 40;
}
