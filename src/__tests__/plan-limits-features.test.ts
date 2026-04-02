import { describe, it, expect } from 'vitest';
import { getPlanLimits, hasFeature, PLAN_LIMITS, type PlanId } from '@/lib/plan-limits';

describe('Plan Limits - New Features', () => {
  const plans: PlanId[] = ['free', 'starter', 'pro', 'enterprise'];

  it('free plan has no new features', () => {
    const limits = getPlanLimits('free');
    expect(limits.features.multiPlatformReviews).toBe(false);
    expect(limits.features.sentimentAnalysis).toBe(false);
    expect(limits.features.reviewInvites).toBe(false);
    expect(limits.maxInvitesPerMonth).toBe(0);
  });

  it('starter plan has multi-platform and sentiment but no invites', () => {
    const limits = getPlanLimits('starter');
    expect(limits.features.multiPlatformReviews).toBe(true);
    expect(limits.features.sentimentAnalysis).toBe(true);
    expect(limits.features.reviewInvites).toBe(false);
    expect(limits.maxInvitesPerMonth).toBe(100);
  });

  it('pro plan has all new features with 1000 invite limit', () => {
    const limits = getPlanLimits('pro');
    expect(limits.features.multiPlatformReviews).toBe(true);
    expect(limits.features.sentimentAnalysis).toBe(true);
    expect(limits.features.reviewInvites).toBe(true);
    expect(limits.maxInvitesPerMonth).toBe(1000);
  });

  it('enterprise plan has unlimited invites', () => {
    const limits = getPlanLimits('enterprise');
    expect(limits.features.reviewInvites).toBe(true);
    expect(limits.maxInvitesPerMonth).toBe(Infinity);
  });

  it('hasFeature helper works for new features', () => {
    expect(hasFeature('free', 'multiPlatformReviews')).toBe(false);
    expect(hasFeature('starter', 'multiPlatformReviews')).toBe(true);
    expect(hasFeature('pro', 'reviewInvites')).toBe(true);
    expect(hasFeature('free', 'sentimentAnalysis')).toBe(false);
  });

  it('all plans define all 3 new feature flags', () => {
    for (const plan of plans) {
      const limits = PLAN_LIMITS[plan];
      expect(limits.features).toHaveProperty('multiPlatformReviews');
      expect(limits.features).toHaveProperty('sentimentAnalysis');
      expect(limits.features).toHaveProperty('reviewInvites');
      expect(typeof limits.maxInvitesPerMonth).toBe('number');
    }
  });

  it('feature hierarchy is consistent (enterprise >= pro >= starter >= free)', () => {
    const featureCount = (plan: PlanId) =>
      Object.values(PLAN_LIMITS[plan].features).filter(Boolean).length;

    expect(featureCount('enterprise')).toBeGreaterThanOrEqual(featureCount('pro'));
    expect(featureCount('pro')).toBeGreaterThanOrEqual(featureCount('starter'));
    expect(featureCount('starter')).toBeGreaterThanOrEqual(featureCount('free'));
  });
});
