import { describe, it, expect } from 'vitest';
import {
  selectVariant,
  findActiveExperiment,
  computeABResults,
  PRESET_EXPERIMENTS,
  type ABExperiment,
  type ABVariant,
} from '@/lib/ab-testing';

function experiment(overrides: Partial<ABExperiment> = {}): ABExperiment {
  return {
    id: 'exp-1',
    tenant_id: 'tenant-1',
    store_id: null,
    name: 'Test Experiment',
    status: 'active',
    variants: [
      { id: 'a', label: 'Variant A', toneOverride: 'Formal', weight: 50 },
      { id: 'b', label: 'Variant B', toneOverride: 'Casual', weight: 50 },
    ],
    created_at: '2026-03-01',
    ...overrides,
  };
}

describe('selectVariant', () => {
  it('returns null for paused experiments', () => {
    expect(selectVariant(experiment({ status: 'paused' }))).toBeNull();
  });

  it('returns null for completed experiments', () => {
    expect(selectVariant(experiment({ status: 'completed' }))).toBeNull();
  });

  it('returns null for empty variants', () => {
    expect(selectVariant(experiment({ variants: [] }))).toBeNull();
  });

  it('returns a valid variant for active experiment', () => {
    const result = selectVariant(experiment());
    expect(result).not.toBeNull();
    expect(['a', 'b']).toContain(result!.id);
  });

  it('respects weighted selection over many runs', () => {
    const exp = experiment({
      variants: [
        { id: 'heavy', label: 'Heavy', toneOverride: 'X', weight: 90 },
        { id: 'light', label: 'Light', toneOverride: 'Y', weight: 10 },
      ],
    });

    const counts = { heavy: 0, light: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = selectVariant(exp);
      if (v) counts[v.id as keyof typeof counts]++;
    }

    // Heavy should be selected roughly 90% of the time
    expect(counts.heavy).toBeGreaterThan(700);
    expect(counts.light).toBeGreaterThan(20);
  });
});

describe('findActiveExperiment', () => {
  it('returns null when no experiments', () => {
    expect(findActiveExperiment([], 1)).toBeNull();
  });

  it('returns store-specific experiment over tenant-wide', () => {
    const exps = [
      experiment({ id: 'tenant-wide', store_id: null }),
      experiment({ id: 'store-specific', store_id: 5 }),
    ];
    const result = findActiveExperiment(exps, 5);
    expect(result!.id).toBe('store-specific');
  });

  it('falls back to tenant-wide when no store-specific match', () => {
    const exps = [
      experiment({ id: 'tenant-wide', store_id: null }),
      experiment({ id: 'other-store', store_id: 99 }),
    ];
    const result = findActiveExperiment(exps, 5);
    expect(result!.id).toBe('tenant-wide');
  });

  it('ignores paused experiments', () => {
    const exps = [experiment({ status: 'paused' })];
    expect(findActiveExperiment(exps, 1)).toBeNull();
  });
});

describe('computeABResults', () => {
  const variants: ABVariant[] = [
    { id: 'a', label: 'A', toneOverride: '', weight: 50 },
    { id: 'b', label: 'B', toneOverride: '', weight: 50 },
  ];

  it('returns empty results for no reviews', () => {
    const results = computeABResults(variants, []);
    expect(results).toHaveLength(2);
    expect(results[0].totalReplies).toBe(0);
    expect(results[1].totalReplies).toBe(0);
  });

  it('counts replies per variant correctly', () => {
    const reviews = [
      { ab_variant_id: 'a', rating: 5, reply_status: 'published' },
      { ab_variant_id: 'a', rating: 4, reply_status: 'published' },
      { ab_variant_id: 'b', rating: 5, reply_status: 'drafted' },
    ];
    const results = computeABResults(variants, reviews);
    expect(results[0].totalReplies).toBe(2);
    expect(results[0].publishedCount).toBe(2);
    expect(results[1].totalReplies).toBe(1);
    expect(results[1].publishedCount).toBe(0);
  });

  it('computes approval rate correctly', () => {
    const reviews = [
      { ab_variant_id: 'a', rating: 5, reply_status: 'approved' },
      { ab_variant_id: 'a', rating: 5, reply_status: 'published' },
      { ab_variant_id: 'a', rating: 5, reply_status: 'drafted' },
      { ab_variant_id: 'a', rating: 5, reply_status: 'drafted' },
    ];
    const results = computeABResults(variants, reviews);
    // 2 approved+published out of 4 total = 50%
    expect(results[0].approvalRate).toBe(50);
  });
});

describe('PRESET_EXPERIMENTS', () => {
  it('has at least 3 presets', () => {
    expect(PRESET_EXPERIMENTS.length).toBeGreaterThanOrEqual(3);
  });

  it('each preset has at least 2 variants', () => {
    for (const preset of PRESET_EXPERIMENTS) {
      expect(preset.variants.length).toBeGreaterThanOrEqual(2);
      for (const v of preset.variants) {
        expect(v.id).toBeTruthy();
        expect(v.label).toBeTruthy();
        expect(v.toneOverride).toBeTruthy();
        expect(v.weight).toBeGreaterThan(0);
      }
    }
  });
});
