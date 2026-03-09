import { describe, it, expect } from 'vitest';
import {
  detectAnomaly,
  textSimilarity,
  batchDetectAnomalies,
  ANOMALY_LEVEL_CONFIG,
  type AnomalyInput,
} from '@/lib/anomaly-detection';

function input(overrides: Partial<AnomalyInput> = {}): AnomalyInput {
  return {
    reviewId: 'rev-1',
    authorName: 'John Smith',
    rating: 5,
    content: 'Had a wonderful dinner with my family. The pasta was fantastic and service was top notch.',
    createdAt: '2026-03-08T12:00:00Z',
    ...overrides,
  };
}

describe('detectAnomaly', () => {
  it('returns clean for normal review', () => {
    const result = detectAnomaly(input());
    expect(result.level).toBe('clean');
    expect(result.score).toBeLessThan(25);
  });

  it('flags very short generic text', () => {
    const result = detectAnomaly(input({ content: 'Great!' }));
    expect(result.breakdown.textQuality).toBeGreaterThan(10);
    expect(result.flags.some(f => f.includes('short') || f.includes('generic'))).toBe(true);
  });

  it('flags generic phrases', () => {
    const result = detectAnomaly(input({ content: 'Amazing!' }));
    expect(result.flags.some(f => f.includes('generic'))).toBe(true);
  });

  it('flags all-caps reviews', () => {
    const result = detectAnomaly(input({ content: 'THIS PLACE IS TERRIBLE AND I HATE IT' }));
    expect(result.flags.some(f => f.includes('CAPS'))).toBe(true);
  });

  it('flags rating-only review as low suspicion', () => {
    const result = detectAnomaly(input({ content: '' }));
    expect(result.breakdown.textQuality).toBeLessThanOrEqual(5);
  });

  it('flags sentiment mismatch — positive text with low rating', () => {
    const result = detectAnomaly(input({
      content: 'The food was absolutely delicious and the staff was wonderful!',
      rating: 1,
      sentimentScore: 0.8,
    }));
    expect(result.breakdown.sentimentMismatch).toBeGreaterThan(10);
    expect(result.flags.some(f => f.includes('manipulation') || f.includes('mismatch'))).toBe(true);
  });

  it('flags sentiment mismatch — negative text with high rating', () => {
    const result = detectAnomaly(input({
      content: 'Terrible food, disgusting service, never coming back again.',
      rating: 5,
      sentimentScore: -0.8,
    }));
    expect(result.breakdown.sentimentMismatch).toBeGreaterThan(10);
  });

  it('flags suspicious author names', () => {
    const result = detectAnomaly(input({ authorName: 'A Google User' }));
    expect(result.breakdown.profileSignal).toBeGreaterThan(0);
    expect(result.flags.some(f => f.includes('suspicious pattern'))).toBe(true);
  });

  it('flags single-initial names', () => {
    const result = detectAnomaly(input({ authorName: 'J K' }));
    expect(result.breakdown.profileSignal).toBeGreaterThan(0);
  });

  it('detects duplicate content in recent reviews', () => {
    const content = 'Had a wonderful dinner with my family. The pasta was fantastic and service was top notch.';
    const result = detectAnomaly(input({
      content,
      recentReviews: [
        { authorName: 'Jane', rating: 5, content, createdAt: '2026-03-08T11:00:00Z' },
      ],
    }));
    expect(result.breakdown.patternSignal).toBeGreaterThan(0);
    expect(result.flags.some(f => f.includes('similar'))).toBe(true);
  });

  it('detects burst pattern', () => {
    const recentReviews = Array.from({ length: 6 }, (_, i) => ({
      authorName: `User ${i}`,
      rating: 5,
      content: `Review text ${i} about the restaurant`,
      createdAt: new Date(new Date('2026-03-08T12:00:00Z').getTime() + i * 10 * 60 * 1000).toISOString(),
    }));
    const result = detectAnomaly(input({ recentReviews }));
    expect(result.breakdown.patternSignal).toBeGreaterThan(0);
    expect(result.flags.some(f => f.includes('burst') || f.includes('window'))).toBe(true);
  });

  it('detects duplicate author name', () => {
    const result = detectAnomaly(input({
      authorName: 'John Smith',
      recentReviews: [
        { authorName: 'John Smith', rating: 4, content: 'Different review text', createdAt: '2026-03-07T12:00:00Z' },
        { authorName: 'John Smith', rating: 5, content: 'Another different text', createdAt: '2026-03-06T12:00:00Z' },
      ],
    }));
    expect(result.breakdown.profileSignal).toBeGreaterThan(0);
    expect(result.flags.some(f => f.includes('author name'))).toBe(true);
  });

  it('score is always between 0 and 100', () => {
    const cases = [
      input(),
      input({ content: 'Great!', authorName: 'A Google User', rating: 1, sentimentScore: 0.9 }),
      input({ content: '' }),
    ];
    for (const c of cases) {
      const result = detectAnomaly(c);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it('breakdown values sum to score', () => {
    const result = detectAnomaly(input({ content: 'Great!', authorName: 'user123' }));
    const sum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBe(result.score);
  });
});

describe('textSimilarity', () => {
  it('returns 1 for identical texts', () => {
    expect(textSimilarity('hello world foo', 'hello world foo')).toBe(1);
  });

  it('returns 0 for completely different texts', () => {
    const sim = textSimilarity(
      'the quick brown fox jumps over lazy dog',
      'completely unrelated sentence about mathematics and physics'
    );
    expect(sim).toBeLessThan(0.3);
  });

  it('returns 0 for empty strings', () => {
    expect(textSimilarity('', 'hello')).toBe(0);
    expect(textSimilarity('hello', '')).toBe(0);
  });

  it('returns high similarity for near-identical texts', () => {
    const sim = textSimilarity(
      'the food was great and the service was wonderful',
      'the food was great and the service was amazing'
    );
    expect(sim).toBeGreaterThan(0.5);
  });
});

describe('batchDetectAnomalies', () => {
  it('returns results sorted by score descending', () => {
    const reviews = [
      { id: '1', authorName: 'John', rating: 5, content: 'Wonderful experience at this restaurant', createdAt: '2026-03-08T10:00:00Z' },
      { id: '2', authorName: 'A Google User', rating: 1, content: 'Great!', createdAt: '2026-03-08T10:05:00Z', sentimentScore: 0.9 },
      { id: '3', authorName: 'Jane', rating: 4, content: 'Nice ambiance and friendly staff, will come back again', createdAt: '2026-03-08T08:00:00Z' },
    ];
    const results = batchDetectAnomalies(reviews);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
  });

  it('handles empty array', () => {
    expect(batchDetectAnomalies([])).toEqual([]);
  });
});

describe('ANOMALY_LEVEL_CONFIG', () => {
  it('has all three levels', () => {
    expect(ANOMALY_LEVEL_CONFIG).toHaveProperty('flagged');
    expect(ANOMALY_LEVEL_CONFIG).toHaveProperty('suspect');
    expect(ANOMALY_LEVEL_CONFIG).toHaveProperty('clean');
  });
});
