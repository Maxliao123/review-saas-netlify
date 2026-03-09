import { describe, it, expect } from 'vitest';
import {
  computeTrend,
  percentChange,
  generateAlerts,
  type TrendDataPoint,
} from '@/lib/predictive';

function makePeriod(overrides: Partial<TrendDataPoint> = {}): TrendDataPoint {
  return {
    period: '2026-W10',
    avgRating: 4.5,
    count: 20,
    positiveRatio: 0.85,
    responseRate: 0.9,
    ...overrides,
  };
}

describe('computeTrend', () => {
  it('returns 0 for single value', () => {
    expect(computeTrend([5])).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(computeTrend([])).toBe(0);
  });

  it('returns positive slope for increasing values', () => {
    const slope = computeTrend([1, 2, 3, 4, 5]);
    expect(slope).toBeGreaterThan(0);
    expect(slope).toBeCloseTo(1, 5);
  });

  it('returns negative slope for decreasing values', () => {
    const slope = computeTrend([5, 4, 3, 2, 1]);
    expect(slope).toBeLessThan(0);
    expect(slope).toBeCloseTo(-1, 5);
  });

  it('returns 0 for constant values', () => {
    expect(computeTrend([3, 3, 3, 3])).toBe(0);
  });
});

describe('percentChange', () => {
  it('computes positive change', () => {
    expect(percentChange(120, 100)).toBe(20);
  });

  it('computes negative change', () => {
    expect(percentChange(80, 100)).toBe(-20);
  });

  it('handles zero previous value', () => {
    expect(percentChange(50, 0)).toBe(100);
    expect(percentChange(0, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(percentChange(133, 100)).toBe(33);
  });
});

describe('generateAlerts', () => {
  it('returns empty for no data', () => {
    expect(generateAlerts([], [])).toEqual([]);
  });

  it('detects rating decline', () => {
    const recent = [
      makePeriod({ avgRating: 3.0 }),
      makePeriod({ avgRating: 3.1 }),
      makePeriod({ avgRating: 2.9 }),
      makePeriod({ avgRating: 3.0 }),
    ];
    const previous = [
      makePeriod({ avgRating: 4.5 }),
      makePeriod({ avgRating: 4.4 }),
      makePeriod({ avgRating: 4.6 }),
      makePeriod({ avgRating: 4.5 }),
    ];
    const alerts = generateAlerts(recent, previous);
    const decline = alerts.find(a => a.type === 'rating_decline');
    expect(decline).toBeDefined();
    expect(decline!.severity).toBe('critical');
    expect(decline!.change).toBeLessThan(0);
  });

  it('detects rating improvement', () => {
    const recent = [
      makePeriod({ avgRating: 4.8 }),
      makePeriod({ avgRating: 4.9 }),
      makePeriod({ avgRating: 4.7 }),
      makePeriod({ avgRating: 4.8 }),
    ];
    const previous = [
      makePeriod({ avgRating: 3.5 }),
      makePeriod({ avgRating: 3.6 }),
      makePeriod({ avgRating: 3.4 }),
      makePeriod({ avgRating: 3.5 }),
    ];
    const alerts = generateAlerts(recent, previous);
    const improvement = alerts.find(a => a.type === 'rating_improvement');
    expect(improvement).toBeDefined();
    expect(improvement!.severity).toBe('positive');
  });

  it('detects volume drop', () => {
    const recent = [
      makePeriod({ count: 3 }),
      makePeriod({ count: 2 }),
      makePeriod({ count: 4 }),
      makePeriod({ count: 3 }),
    ];
    const previous = [
      makePeriod({ count: 20 }),
      makePeriod({ count: 18 }),
      makePeriod({ count: 22 }),
      makePeriod({ count: 20 }),
    ];
    const alerts = generateAlerts(recent, previous);
    expect(alerts.find(a => a.type === 'volume_drop')).toBeDefined();
  });

  it('detects volume surge', () => {
    const recent = [
      makePeriod({ count: 50 }),
      makePeriod({ count: 55 }),
      makePeriod({ count: 48 }),
      makePeriod({ count: 52 }),
    ];
    const previous = [
      makePeriod({ count: 10 }),
      makePeriod({ count: 12 }),
      makePeriod({ count: 11 }),
      makePeriod({ count: 10 }),
    ];
    const alerts = generateAlerts(recent, previous);
    expect(alerts.find(a => a.type === 'volume_surge')).toBeDefined();
  });

  it('detects low response rate', () => {
    const recent = [
      makePeriod({ responseRate: 0.2 }),
      makePeriod({ responseRate: 0.3 }),
      makePeriod({ responseRate: 0.1 }),
      makePeriod({ responseRate: 0.2 }),
    ];
    const previous = [
      makePeriod({ responseRate: 0.9 }),
    ];
    const alerts = generateAlerts(recent, previous);
    expect(alerts.find(a => a.type === 'response_rate_drop')).toBeDefined();
  });

  it('detects negative spike', () => {
    const recent = [
      makePeriod({ positiveRatio: 0.3 }),
      makePeriod({ positiveRatio: 0.4 }),
      makePeriod({ positiveRatio: 0.35 }),
      makePeriod({ positiveRatio: 0.3 }),
    ];
    const previous = [
      makePeriod({ positiveRatio: 0.85 }),
      makePeriod({ positiveRatio: 0.9 }),
      makePeriod({ positiveRatio: 0.88 }),
      makePeriod({ positiveRatio: 0.87 }),
    ];
    const alerts = generateAlerts(recent, previous);
    expect(alerts.find(a => a.type === 'negative_spike')).toBeDefined();
  });

  it('detects positive streak', () => {
    const recent = [
      makePeriod({ positiveRatio: 0.85 }),
      makePeriod({ positiveRatio: 0.9 }),
      makePeriod({ positiveRatio: 0.82 }),
      makePeriod({ positiveRatio: 0.88 }),
    ];
    const alerts = generateAlerts(recent, []);
    expect(alerts.find(a => a.type === 'positive_streak')).toBeDefined();
  });

  it('does not alert positive streak with < 3 periods', () => {
    const recent = [
      makePeriod({ positiveRatio: 0.9 }),
      makePeriod({ positiveRatio: 0.85 }),
    ];
    const alerts = generateAlerts(recent, []);
    expect(alerts.find(a => a.type === 'positive_streak')).toBeUndefined();
  });

  it('stable metrics produce no alerts', () => {
    const recent = [
      makePeriod({ avgRating: 4.2, count: 15, positiveRatio: 0.75, responseRate: 0.7 }),
      makePeriod({ avgRating: 4.3, count: 14, positiveRatio: 0.76, responseRate: 0.72 }),
      makePeriod({ avgRating: 4.1, count: 16, positiveRatio: 0.74, responseRate: 0.68 }),
      makePeriod({ avgRating: 4.2, count: 15, positiveRatio: 0.75, responseRate: 0.7 }),
    ];
    const previous = [
      makePeriod({ avgRating: 4.2, count: 15, positiveRatio: 0.75, responseRate: 0.7 }),
      makePeriod({ avgRating: 4.1, count: 16, positiveRatio: 0.74, responseRate: 0.72 }),
      makePeriod({ avgRating: 4.3, count: 14, positiveRatio: 0.76, responseRate: 0.68 }),
      makePeriod({ avgRating: 4.2, count: 15, positiveRatio: 0.75, responseRate: 0.7 }),
    ];
    const alerts = generateAlerts(recent, previous);
    // Should not have critical or warning alerts for stable metrics
    const warningOrCritical = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
    expect(warningOrCritical.length).toBe(0);
  });
});
