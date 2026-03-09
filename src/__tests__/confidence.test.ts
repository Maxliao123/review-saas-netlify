import { describe, it, expect } from 'vitest';
import { computeConfidence, shouldFlagForReview, type ConfidenceInput } from '@/lib/confidence';

function input(overrides: Partial<ConfidenceInput> = {}): ConfidenceInput {
  return {
    rating: 5,
    reviewText: 'Great food!',
    replySource: 'ai',
    autoReplyMode: 'auto_positive',
    minRatingThreshold: 4,
    sentimentScore: 0.8,
    sentimentLabel: 'positive',
    ...overrides,
  };
}

describe('computeConfidence', () => {
  it('returns high confidence for 5-star positive review with template', () => {
    const result = computeConfidence(input({ rating: 5, replySource: 'template' }));
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.level).toBe('high');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('returns high confidence for 5-star with short text', () => {
    const result = computeConfidence(input({ rating: 5, reviewText: 'Nice!' }));
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.level).toBe('high');
  });

  it('returns medium confidence for 4-star AI-generated reply', () => {
    const result = computeConfidence(input({ rating: 4, sentimentScore: 0.3 }));
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThan(85);
  });

  it('returns low confidence for 1-star review', () => {
    const result = computeConfidence(input({
      rating: 1,
      reviewText: 'Terrible experience, worst food ever. I want a refund!',
      sentimentScore: -0.9,
      sentimentLabel: 'negative',
    }));
    expect(result.score).toBeLessThan(40);
    expect(result.level).toBe('low');
  });

  it('drops content safety for escalation keywords', () => {
    const result = computeConfidence(input({
      rating: 3,
      reviewText: 'I want to speak to the manager about this issue',
    }));
    expect(result.breakdown.contentSafety).toBe(0);
    expect(result.reasons).toContain('Review mentions escalation — requires human attention');
  });

  it('gives max content safety for rating-only (no text) reviews', () => {
    const result = computeConfidence(input({ rating: 5, reviewText: '' }));
    expect(result.breakdown.contentSafety).toBe(25);
  });

  it('template source scores higher than AI', () => {
    const templateResult = computeConfidence(input({ replySource: 'template' }));
    const aiResult = computeConfidence(input({ replySource: 'ai' }));
    expect(templateResult.breakdown.templateMatch).toBeGreaterThan(aiResult.breakdown.templateMatch);
  });

  it('includes historical accuracy when provided', () => {
    const highRate = computeConfidence(input({ storeAutoApproveRate: 0.98 }));
    const lowRate = computeConfidence(input({ storeAutoApproveRate: 0.5 }));
    expect(highRate.breakdown.historicalAccuracy).toBeGreaterThan(lowRate.breakdown.historicalAccuracy);
  });

  it('handles null sentiment gracefully', () => {
    const result = computeConfidence(input({ sentimentScore: null, sentimentLabel: null }));
    expect(result.breakdown.sentimentAlignment).toBe(5); // default
  });

  it('detects sentiment-rating alignment', () => {
    const aligned = computeConfidence(input({ rating: 5, sentimentScore: 0.9 }));
    expect(aligned.breakdown.sentimentAlignment).toBe(10);
  });

  it('score is always between 0 and 100', () => {
    const combos = [
      input({ rating: 5, replySource: 'template', storeAutoApproveRate: 1.0 }),
      input({ rating: 1, reviewText: 'I want a refund and will call my lawyer', sentimentScore: -1 }),
      input({ rating: 3, reviewText: '', sentimentScore: 0 }),
    ];
    for (const combo of combos) {
      const result = computeConfidence(combo);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it('breakdown values sum to score', () => {
    const result = computeConfidence(input());
    const sum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBe(result.score);
  });
});

describe('shouldFlagForReview', () => {
  it('flags low confidence replies', () => {
    const result = computeConfidence(input({
      rating: 1,
      reviewText: 'Terrible, I want to speak to the manager about this refund',
      sentimentScore: -0.9,
    }));
    expect(shouldFlagForReview(result)).toBe(true);
  });

  it('does not flag high confidence replies', () => {
    const result = computeConfidence(input({ rating: 5, replySource: 'template' }));
    expect(shouldFlagForReview(result)).toBe(false);
  });
});
