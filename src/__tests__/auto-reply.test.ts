import { describe, it, expect } from 'vitest';
import { hasFeature, getPlanLimits, PLAN_LIMITS, type PlanId } from '@/lib/plan-limits';

describe('Auto-Reply Feature Gating', () => {
  it('free plan cannot use autoReplyMode', () => {
    expect(hasFeature('free', 'autoReplyMode')).toBe(false);
  });

  it('starter plan cannot use autoReplyMode', () => {
    expect(hasFeature('starter', 'autoReplyMode')).toBe(false);
  });

  it('pro plan can use autoReplyMode', () => {
    expect(hasFeature('pro', 'autoReplyMode')).toBe(true);
  });

  it('enterprise plan can use autoReplyMode', () => {
    expect(hasFeature('enterprise', 'autoReplyMode')).toBe(true);
  });

  it('all plans have autoReplyMode defined', () => {
    const plans: PlanId[] = ['free', 'starter', 'pro', 'enterprise'];
    for (const plan of plans) {
      expect(PLAN_LIMITS[plan].features).toHaveProperty('autoReplyMode');
    }
  });
});

describe('Auto-Reply Logic', () => {
  /**
   * Simulates the auto-approve decision logic from fetch-reviews cron.
   * Extracted here for unit testing without needing OpenAI/Supabase.
   */
  function shouldAutoApprove(
    storeMode: string,
    storeMinRating: number,
    tenantPlan: string,
    reviewRating: number
  ): boolean {
    if (!hasFeature(tenantPlan, 'autoReplyMode')) return false;

    if (storeMode === 'auto_all') return true;
    if (storeMode === 'auto_positive' && reviewRating >= storeMinRating) return true;
    return false;
  }

  it('manual mode never auto-approves', () => {
    expect(shouldAutoApprove('manual', 4, 'pro', 5)).toBe(false);
    expect(shouldAutoApprove('manual', 4, 'enterprise', 5)).toBe(false);
  });

  it('auto_positive approves 5-star with min_rating 4', () => {
    expect(shouldAutoApprove('auto_positive', 4, 'pro', 5)).toBe(true);
  });

  it('auto_positive approves 4-star with min_rating 4', () => {
    expect(shouldAutoApprove('auto_positive', 4, 'pro', 4)).toBe(true);
  });

  it('auto_positive rejects 3-star with min_rating 4', () => {
    expect(shouldAutoApprove('auto_positive', 4, 'pro', 3)).toBe(false);
  });

  it('auto_positive rejects 1-star with min_rating 4', () => {
    expect(shouldAutoApprove('auto_positive', 4, 'pro', 1)).toBe(false);
  });

  it('auto_positive with min_rating 3 approves 3-star', () => {
    expect(shouldAutoApprove('auto_positive', 3, 'pro', 3)).toBe(true);
  });

  it('auto_all approves everything on pro', () => {
    expect(shouldAutoApprove('auto_all', 4, 'pro', 1)).toBe(true);
    expect(shouldAutoApprove('auto_all', 4, 'pro', 3)).toBe(true);
    expect(shouldAutoApprove('auto_all', 4, 'pro', 5)).toBe(true);
  });

  it('auto_positive on free plan still rejects (plan gating)', () => {
    expect(shouldAutoApprove('auto_positive', 4, 'free', 5)).toBe(false);
  });

  it('auto_all on starter plan still rejects (plan gating)', () => {
    expect(shouldAutoApprove('auto_all', 4, 'starter', 5)).toBe(false);
  });

  it('auto_positive on enterprise approves high ratings', () => {
    expect(shouldAutoApprove('auto_positive', 4, 'enterprise', 4)).toBe(true);
    expect(shouldAutoApprove('auto_positive', 4, 'enterprise', 5)).toBe(true);
  });
});
