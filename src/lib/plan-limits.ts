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
  maxCompetitorsPerStore: number;
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
    maxInvitesPerMonth: 100,
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
    maxInvitesPerMonth: 1000,
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
    price: 49,
    period: '/month',
    tagline: 'For growing businesses',
    highlights: [
      'Up to 3 store locations',
      '500 AI reviews / month',
      'AI reply drafts',
      'Review monitoring & alerts',
      'Sentiment analysis & insights',
      'Weekly reports',
      'Email + Slack notifications',
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    price: 149,
    period: '/month',
    tagline: 'For serious reputation growth',
    highlights: [
      'Up to 10 store locations',
      'Unlimited AI reviews',
      'AI auto-reply',
      'Google Maps analytics',
      'Competitor tracking',
      'All notification channels',
      'Custom AI tone & handbook',
      'White-label branding',
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    popular: true,
  },
  {
    id: 'enterprise' as PlanId,
    name: 'Enterprise',
    price: 499,
    period: '/month',
    tagline: 'For chains & franchises',
    highlights: [
      'Unlimited store locations',
      'Unlimited AI reviews',
      'Everything in Pro',
      'API access',
      'SSO / SAML',
      'Dedicated account manager',
      'Priority support',
    ],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
  },
];
