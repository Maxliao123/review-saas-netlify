import { describe, it, expect } from 'vitest';
import { normalizeFacebookRating } from '@/lib/facebook';

describe('Facebook Rating Normalization', () => {
  it('normalizes positive recommendation to 5.0', () => {
    expect(normalizeFacebookRating('positive')).toBe(5.0);
  });

  it('normalizes negative recommendation to 1.0', () => {
    expect(normalizeFacebookRating('negative')).toBe(1.0);
  });
});
