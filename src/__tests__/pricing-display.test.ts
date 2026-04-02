import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, PRICING_DISPLAY, getPlanLimits } from '@/lib/plan-limits';
import type { PlanId } from '@/lib/plan-limits';

describe('PRICING_DISPLAY consistency', () => {
  it('all PRICING_DISPLAY plans exist in PLAN_LIMITS', () => {
    for (const plan of PRICING_DISPLAY) {
      expect(PLAN_LIMITS[plan.id]).toBeDefined();
    }
  });

  it('plan names match between PRICING_DISPLAY and PLAN_LIMITS', () => {
    for (const plan of PRICING_DISPLAY) {
      expect(plan.name).toBe(PLAN_LIMITS[plan.id].name);
    }
  });

  it('free plan has price 0', () => {
    const freePlan = PRICING_DISPLAY.find(p => p.id === 'free');
    expect(freePlan?.price).toBe(0);
    expect(freePlan?.stripePriceId).toBeNull();
  });

  it('enterprise plan has a fixed price', () => {
    const enterprise = PRICING_DISPLAY.find(p => p.id === 'enterprise');
    expect(enterprise?.price).toBe(499);
    expect(enterprise?.stripePriceId).toBeNull();
  });

  it('pro plan is marked as popular', () => {
    const pro = PRICING_DISPLAY.find(p => p.id === 'pro');
    expect(pro?.popular).toBe(true);
  });
});

describe('plan feature consistency', () => {
  const planIds: PlanId[] = ['free', 'starter', 'pro', 'enterprise'];

  it('higher tiers have >= features than lower tiers', () => {
    for (let i = 1; i < planIds.length; i++) {
      const lower = getPlanLimits(planIds[i - 1]);
      const higher = getPlanLimits(planIds[i]);
      expect(higher.maxStores).toBeGreaterThanOrEqual(lower.maxStores);
      expect(higher.maxReviewsPerMonth).toBeGreaterThanOrEqual(lower.maxReviewsPerMonth);
    }
  });

  it('all plans have email notifications', () => {
    for (const id of planIds) {
      expect(getPlanLimits(id).notifications.email).toBe(true);
    }
  });
});
