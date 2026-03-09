import { describe, it, expect } from 'vitest';
import {
  getPlanLimits,
  canAddStore,
  canGenerateReview,
  hasFeature,
  canUseNotificationChannel,
} from '@/lib/plan-limits';

describe('getPlanLimits', () => {
  it('returns free plan limits for unknown plans', () => {
    const limits = getPlanLimits('nonexistent');
    expect(limits.name).toBe('Free');
    expect(limits.maxStores).toBe(1);
  });

  it('returns correct limits for each plan', () => {
    expect(getPlanLimits('free').maxStores).toBe(1);
    expect(getPlanLimits('starter').maxStores).toBe(3);
    expect(getPlanLimits('pro').maxStores).toBe(10);
    expect(getPlanLimits('enterprise').maxStores).toBe(Infinity);
  });

  it('returns correct review limits', () => {
    expect(getPlanLimits('free').maxReviewsPerMonth).toBe(50);
    expect(getPlanLimits('starter').maxReviewsPerMonth).toBe(500);
    expect(getPlanLimits('pro').maxReviewsPerMonth).toBe(Infinity);
  });
});

describe('canAddStore', () => {
  it('allows adding stores within limit', () => {
    expect(canAddStore('free', 0)).toBe(true);
    expect(canAddStore('starter', 2)).toBe(true);
    expect(canAddStore('pro', 9)).toBe(true);
  });

  it('blocks adding stores at limit', () => {
    expect(canAddStore('free', 1)).toBe(false);
    expect(canAddStore('starter', 3)).toBe(false);
    expect(canAddStore('pro', 10)).toBe(false);
  });

  it('enterprise has unlimited stores', () => {
    expect(canAddStore('enterprise', 1000)).toBe(true);
  });
});

describe('canGenerateReview', () => {
  it('allows reviews within limit', () => {
    expect(canGenerateReview('free', 49)).toBe(true);
    expect(canGenerateReview('starter', 499)).toBe(true);
  });

  it('blocks reviews at limit', () => {
    expect(canGenerateReview('free', 50)).toBe(false);
    expect(canGenerateReview('starter', 500)).toBe(false);
  });

  it('pro and enterprise are unlimited', () => {
    expect(canGenerateReview('pro', 100000)).toBe(true);
    expect(canGenerateReview('enterprise', 100000)).toBe(true);
  });
});

describe('hasFeature', () => {
  it('free plan has limited features', () => {
    expect(hasFeature('free', 'aiReplyDrafts')).toBe(false);
    expect(hasFeature('free', 'autoPublishReplies')).toBe(false);
    expect(hasFeature('free', 'weeklyReports')).toBe(false);
  });

  it('starter plan has reply drafts and reports', () => {
    expect(hasFeature('starter', 'aiReplyDrafts')).toBe(true);
    expect(hasFeature('starter', 'weeklyReports')).toBe(true);
    expect(hasFeature('starter', 'autoPublishReplies')).toBe(false);
  });

  it('pro plan has all standard features', () => {
    expect(hasFeature('pro', 'aiReplyDrafts')).toBe(true);
    expect(hasFeature('pro', 'autoPublishReplies')).toBe(true);
    expect(hasFeature('pro', 'customHandbook')).toBe(true);
    expect(hasFeature('pro', 'prioritySupport')).toBe(true);
  });

  it('enterprise has everything', () => {
    expect(hasFeature('enterprise', 'apiAccess')).toBe(true);
    expect(hasFeature('enterprise', 'sso')).toBe(true);
    expect(hasFeature('enterprise', 'whiteLabel')).toBe(true);
  });
});

describe('canUseNotificationChannel', () => {
  it('free plan only has email', () => {
    expect(canUseNotificationChannel('free', 'email')).toBe(true);
    expect(canUseNotificationChannel('free', 'slack')).toBe(false);
    expect(canUseNotificationChannel('free', 'line')).toBe(false);
    expect(canUseNotificationChannel('free', 'whatsapp')).toBe(false);
  });

  it('starter has email and slack', () => {
    expect(canUseNotificationChannel('starter', 'email')).toBe(true);
    expect(canUseNotificationChannel('starter', 'slack')).toBe(true);
    expect(canUseNotificationChannel('starter', 'line')).toBe(false);
  });

  it('pro and enterprise have all channels', () => {
    expect(canUseNotificationChannel('pro', 'whatsapp')).toBe(true);
    expect(canUseNotificationChannel('enterprise', 'line')).toBe(true);
  });
});
