import { describe, it, expect } from 'vitest';
import { computePercentile, computeBenchmark, TIER_CONFIG, type BenchmarkMetrics } from '@/lib/benchmarking';

function makeMetrics(overrides: Partial<BenchmarkMetrics> = {}): BenchmarkMetrics {
  return {
    avgRating: 4.2,
    totalReviews: 50,
    responseRate: 70,
    avgResponseTime: 12,
    positiveRatio: 80,
    ...overrides,
  };
}

describe('computePercentile', () => {
  it('returns 50 for empty peer set', () => {
    expect(computePercentile(4.0, [])).toBe(50);
  });

  it('returns 100 when value is highest', () => {
    expect(computePercentile(10, [1, 2, 3, 4, 5])).toBe(100);
  });

  it('returns 0 when value is lowest', () => {
    expect(computePercentile(0, [1, 2, 3, 4, 5])).toBe(0);
  });

  it('returns correct percentile for middle value', () => {
    const result = computePercentile(3, [1, 2, 3, 4, 5]);
    expect(result).toBe(40); // 2 out of 5 values are below 3
  });

  it('handles duplicate values', () => {
    const result = computePercentile(3, [3, 3, 3, 3]);
    expect(result).toBe(0); // No values strictly below 3
  });
});

describe('computeBenchmark', () => {
  it('returns top10 tier for top performer', () => {
    const store = makeMetrics({ avgRating: 4.9, responseRate: 98, positiveRatio: 95 });
    const peers = Array.from({ length: 20 }, (_, i) =>
      makeMetrics({ avgRating: 3 + i * 0.05, responseRate: 30 + i * 2, positiveRatio: 40 + i * 2 })
    );
    const result = computeBenchmark(store, peers);
    expect(result.tier).toBe('top10');
    expect(result.percentiles.avgRating).toBeGreaterThanOrEqual(90);
  });

  it('returns bottom50 for poor performer', () => {
    const store = makeMetrics({ avgRating: 2.0, responseRate: 10, positiveRatio: 20 });
    const peers = Array.from({ length: 20 }, (_, i) =>
      makeMetrics({ avgRating: 3 + i * 0.1, responseRate: 50 + i * 2, positiveRatio: 60 + i * 2 })
    );
    const result = computeBenchmark(store, peers);
    expect(result.tier).toBe('bottom50');
  });

  it('includes metrics in result', () => {
    const store = makeMetrics({ avgRating: 4.5 });
    const result = computeBenchmark(store, [makeMetrics()]);
    expect(result.metrics.avgRating).toBe(4.5);
  });

  it('generates summary text with strengths', () => {
    const store = makeMetrics({ avgRating: 4.9, responseRate: 98, positiveRatio: 95 });
    const peers = Array.from({ length: 10 }, () =>
      makeMetrics({ avgRating: 3.0, responseRate: 30, positiveRatio: 40 })
    );
    const result = computeBenchmark(store, peers);
    expect(result.summary).toContain('Strengths');
  });

  it('generates summary text with improvements', () => {
    const store = makeMetrics({ avgRating: 2.0, responseRate: 10, positiveRatio: 20 });
    const peers = Array.from({ length: 10 }, () =>
      makeMetrics({ avgRating: 4.5, responseRate: 90, positiveRatio: 90 })
    );
    const result = computeBenchmark(store, peers);
    expect(result.summary).toContain('Improve');
  });

  it('handles empty peers gracefully', () => {
    const store = makeMetrics();
    const result = computeBenchmark(store, []);
    expect(result.tier).toBe('top50'); // 50th percentile default
    expect(result.percentiles.avgRating).toBe(50);
  });

  it('returns all four percentile values', () => {
    const store = makeMetrics();
    const result = computeBenchmark(store, [makeMetrics()]);
    expect(result.percentiles).toHaveProperty('avgRating');
    expect(result.percentiles).toHaveProperty('totalReviews');
    expect(result.percentiles).toHaveProperty('responseRate');
    expect(result.percentiles).toHaveProperty('positiveRatio');
  });
});

describe('TIER_CONFIG', () => {
  it('has all four tiers', () => {
    expect(TIER_CONFIG).toHaveProperty('top10');
    expect(TIER_CONFIG).toHaveProperty('top25');
    expect(TIER_CONFIG).toHaveProperty('top50');
    expect(TIER_CONFIG).toHaveProperty('bottom50');
  });

  it('each tier has label, color, emoji, description', () => {
    for (const tier of Object.values(TIER_CONFIG)) {
      expect(tier).toHaveProperty('label');
      expect(tier).toHaveProperty('color');
      expect(tier).toHaveProperty('emoji');
      expect(tier).toHaveProperty('description');
    }
  });
});
