/**
 * Plan-based feature gating configuration.
 * Used by middleware, API routes, and dashboard to enforce limits.
 */

export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export interface PlanLimits {
  name: string;
  maxStores: number;
  maxReviewsPerMonth: number;
  maxInvitesPerMonth: number;
  features: {
    aiReplyDrafts: boolean;
    autoPublishReplies: boolean;
    weeklyReports: boolean;
    advancedAnalytics: boolean;
    customHandbook: boolean;
    allNotificationChannels: boolean;
    apiAccess: boolean;
    sso: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
    multiPlatformReviews: boolean;
    sentimentAnalysis: boolean;
    reviewInvites: boolean;
    autoReplyMode: boolean;
    replyTemplates: boolean;
    webhooks: boolean;
    aiTraining: boolean;
    hardwareManagement: boolean;
  };
  notifications: {
    email: boolean;
    slack: boolean;
    line: boolean;
    whatsapp: boolean;
  };
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    name: 'Free',
    maxStores: 1,
    maxReviewsPerMonth: 50,
    maxInvitesPerMonth: 0,
    features: {
      aiReplyDrafts: false,
      autoPublishReplies: false,
      weeklyReports: false,
      advancedAnalytics: false,
      customHandbook: false,
      allNotificationChannels: false,
      apiAccess: false,
      sso: false,
      prioritySupport: false,
      whiteLabel: false,
      multiPlatformReviews: false,
      sentimentAnalysis: false,
      reviewInvites: false,
      autoReplyMode: false,
      replyTemplates: false,
      webhooks: false,
      aiTraining: false,
      hardwareManagement: false,
    },
    notifications: {
      email: true,
      slack: false,
      line: false,
      whatsapp: false,
    },
  },

  starter: {
    name: 'Starter',
    maxStores: 3,
    maxReviewsPerMonth: 500,
    maxInvitesPerMonth: 0,
    features: {
      aiReplyDrafts: true,
      autoPublishReplies: false,
      weeklyReports: true,
      advancedAnalytics: true,
      customHandbook: false,
      allNotificationChannels: false,
      apiAccess: false,
      sso: false,
      prioritySupport: false,
      whiteLabel: false,
      multiPlatformReviews: true,
      sentimentAnalysis: true,
      reviewInvites: false,
      autoReplyMode: false,
      replyTemplates: false,
      webhooks: false,
      aiTraining: false,
      hardwareManagement: false,
    },
    notifications: {
      email: true,
      slack: true,
      line: false,
      whatsapp: false,
    },
  },

  pro: {
    name: 'Pro',
    maxStores: 10,
    maxReviewsPerMonth: Infinity,
    maxInvitesPerMonth: 500,
    features: {
      aiReplyDrafts: true,
      autoPublishReplies: true,
      weeklyReports: true,
      advancedAnalytics: true,
      customHandbook: true,
      allNotificationChannels: true,
      apiAccess: false,
      sso: false,
      prioritySupport: true,
      whiteLabel: false,
      multiPlatformReviews: true,
      sentimentAnalysis: true,
      reviewInvites: true,
      autoReplyMode: true,
      replyTemplates: true,
      webhooks: true,
      aiTraining: true,
      hardwareManagement: true,
    },
    notifications: {
      email: true,
      slack: true,
      line: true,
      whatsapp: true,
    },
  },

  enterprise: {
    name: 'Enterprise',
    maxStores: Infinity,
    maxReviewsPerMonth: Infinity,
    maxInvitesPerMonth: Infinity,
    features: {
      aiReplyDrafts: true,
      autoPublishReplies: true,
      weeklyReports: true,
      advancedAnalytics: true,
      customHandbook: true,
      allNotificationChannels: true,
      apiAccess: true,
      sso: true,
      prioritySupport: true,
      whiteLabel: true,
      multiPlatformReviews: true,
      sentimentAnalysis: true,
      reviewInvites: true,
      autoReplyMode: true,
      replyTemplates: true,
      webhooks: true,
      aiTraining: true,
      hardwareManagement: true,
    },
    notifications: {
      email: true,
      slack: true,
      line: true,
      whatsapp: true,
    },
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanId)] || PLAN_LIMITS.free;
}

export function canAddStore(plan: string, currentStoreCount: number): boolean {
  const limits = getPlanLimits(plan);
  return currentStoreCount < limits.maxStores;
}

export function canGenerateReview(plan: string, currentMonthCount: number): boolean {
  const limits = getPlanLimits(plan);
  return currentMonthCount < limits.maxReviewsPerMonth;
}

export function hasFeature(plan: string, feature: keyof PlanLimits['features']): boolean {
  const limits = getPlanLimits(plan);
  return limits.features[feature];
}

export function canUseNotificationChannel(
  plan: string,
  channel: keyof PlanLimits['notifications']
): boolean {
  const limits = getPlanLimits(plan);
  return limits.notifications[channel];
}

/** Pricing display data for the pricing page */
export const PRICING_DISPLAY = [
  {
    id: 'free' as PlanId,
    name: 'Free',
    price: 0,
    period: 'forever',
    tagline: 'Perfect for trying it out',
    highlights: [
      '1 store location',
      '50 AI reviews / month',
      'Basic scan analytics',
      'Email notifications',
    ],
    stripePriceId: null,
  },
  {
    id: 'starter' as PlanId,
    name: 'Starter',
    price: 29,
    period: '/month',
    tagline: 'For growing restaurants',
    highlights: [
      'Up to 3 store locations',
      '500 AI reviews / month',
      'Full analytics dashboard',
      'Email + Slack notifications',
      'AI reply drafts',
      'Weekly reports',
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    price: 79,
    period: '/month',
    tagline: 'For multi-location businesses',
    highlights: [
      'Up to 10 store locations',
      'Unlimited AI reviews',
      'Advanced analytics & reports',
      'All notification channels',
      'Auto-publish AI replies',
      'Priority support',
      'Custom AI tone & handbook',
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    popular: true,
  },
  {
    id: 'enterprise' as PlanId,
    name: 'Enterprise',
    price: null,
    period: 'custom',
    tagline: 'For chains & franchises',
    highlights: [
      'Unlimited store locations',
      'Unlimited AI reviews',
      'API access',
      'SSO / SAML',
      'White-label option',
      'Dedicated account manager',
      'Custom AI model training',
    ],
    stripePriceId: null,
  },
];
