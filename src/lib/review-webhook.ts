/**
 * Real-Time Review Webhook Engine
 *
 * Replaces cron polling with Google Cloud Pub/Sub push notifications.
 * When a new review is posted, Google sends a notification to our endpoint
 * within seconds instead of waiting for the next cron cycle.
 *
 * Architecture:
 *   Google Business Profile → Cloud Pub/Sub Topic → Push Subscription → Our API
 *   Fallback: Cron still runs every 5 min as a safety net
 *
 * Flow:
 *   1. Pub/Sub pushes notification with account/location info
 *   2. We fetch the specific review from Google API
 *   3. AI drafts reply + auto-approve + instant publish
 *   4. Total latency: < 30 seconds (vs 5-min cron)
 */

import { createHmac } from 'crypto';

// ============================================================
// Types
// ============================================================

export interface PubSubMessage {
  message: {
    data: string;        // Base64 encoded JSON
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
}

export interface ReviewNotification {
  account: string;       // "accounts/123456"
  location: string;      // "locations/789012"
  reviewId: string;      // The specific review that changed
  changeType: 'NEW_REVIEW' | 'UPDATED_REVIEW' | 'DELETED_REVIEW';
}

export interface WebhookHealthStatus {
  isActive: boolean;
  lastReceivedAt: string | null;
  lastProcessedAt: string | null;
  totalReceived: number;
  totalProcessed: number;
  totalErrors: number;
  avgProcessingMs: number;
  uptimePercent: number;
}

export interface WebhookConfig {
  enabled: boolean;
  pubsubTopic: string | null;
  pubsubSubscription: string | null;
  verificationToken: string;
  fallbackCronEnabled: boolean;
  maxRetries: number;
  processingTimeoutMs: number;
}

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  enabled: false,
  pubsubTopic: null,
  pubsubSubscription: null,
  verificationToken: '',
  fallbackCronEnabled: true,
  maxRetries: 3,
  processingTimeoutMs: 25000,
};

// ============================================================
// Pub/Sub Message Verification & Parsing
// ============================================================

/**
 * Verify that a Pub/Sub push message is authentic.
 * Google signs push messages with a JWT bearer token.
 */
export function verifyPubSubToken(authHeader: string | null, expectedAudience: string): boolean {
  if (!authHeader) return false;

  // Bearer token format
  const token = authHeader.replace('Bearer ', '');
  if (!token || token.length < 10) return false;

  // In production, verify the JWT signature against Google's public keys.
  // For now, we validate the token exists and check against our verification token.
  return token === expectedAudience;
}

/**
 * Parse a Pub/Sub push message body.
 */
export function parsePubSubMessage(body: PubSubMessage): ReviewNotification | null {
  try {
    if (!body.message?.data) return null;

    const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    // Google Business Profile notification format
    return {
      account: parsed.account || parsed.name?.split('/locations/')[0] || '',
      location: parsed.location || `locations/${parsed.name?.split('/locations/')[1]?.split('/')[0] || ''}`,
      reviewId: parsed.reviewId || parsed.review_id || parsed.name?.split('/reviews/')[1] || '',
      changeType: mapChangeType(parsed.changeType || parsed.type || 'NEW_REVIEW'),
    };
  } catch {
    return null;
  }
}

function mapChangeType(type: string): ReviewNotification['changeType'] {
  const typeMap: Record<string, ReviewNotification['changeType']> = {
    'NEW_REVIEW': 'NEW_REVIEW',
    'UPDATED_REVIEW': 'UPDATED_REVIEW',
    'DELETED_REVIEW': 'DELETED_REVIEW',
    'new': 'NEW_REVIEW',
    'updated': 'UPDATED_REVIEW',
    'deleted': 'DELETED_REVIEW',
  };
  return typeMap[type] || 'NEW_REVIEW';
}

// ============================================================
// Processing Metrics
// ============================================================

/** In-memory metrics (reset on serverless cold start) */
const metrics = {
  totalReceived: 0,
  totalProcessed: 0,
  totalErrors: 0,
  processingTimes: [] as number[],
  lastReceivedAt: null as string | null,
  lastProcessedAt: null as string | null,
};

export function recordReceived(): void {
  metrics.totalReceived++;
  metrics.lastReceivedAt = new Date().toISOString();
}

export function recordProcessed(durationMs: number): void {
  metrics.totalProcessed++;
  metrics.lastProcessedAt = new Date().toISOString();
  metrics.processingTimes.push(durationMs);
  // Keep only last 100 for avg calculation
  if (metrics.processingTimes.length > 100) {
    metrics.processingTimes.shift();
  }
}

export function recordError(): void {
  metrics.totalErrors++;
}

export function getHealthStatus(configEnabled: boolean): WebhookHealthStatus {
  const avgMs = metrics.processingTimes.length > 0
    ? metrics.processingTimes.reduce((a, b) => a + b, 0) / metrics.processingTimes.length
    : 0;

  const total = metrics.totalProcessed + metrics.totalErrors;
  const uptimePercent = total > 0
    ? Math.round((metrics.totalProcessed / total) * 100)
    : 100;

  return {
    isActive: configEnabled,
    lastReceivedAt: metrics.lastReceivedAt,
    lastProcessedAt: metrics.lastProcessedAt,
    totalReceived: metrics.totalReceived,
    totalProcessed: metrics.totalProcessed,
    totalErrors: metrics.totalErrors,
    avgProcessingMs: Math.round(avgMs),
    uptimePercent,
  };
}

export function resetMetrics(): void {
  metrics.totalReceived = 0;
  metrics.totalProcessed = 0;
  metrics.totalErrors = 0;
  metrics.processingTimes = [];
  metrics.lastReceivedAt = null;
  metrics.lastProcessedAt = null;
}

// ============================================================
// Pub/Sub Setup Helpers
// ============================================================

/**
 * Generate the Pub/Sub push endpoint URL for a tenant.
 */
export function getPushEndpointUrl(baseUrl: string): string {
  return `${baseUrl}/api/webhooks/google-reviews`;
}

/**
 * Generate a verification token for Pub/Sub push subscription.
 */
export function generateVerificationToken(tenantId: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`pubsub-verify-${tenantId}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Generate Pub/Sub setup instructions for a tenant.
 */
export function generateSetupInstructions(baseUrl: string, verificationToken: string): string[] {
  return [
    '1. Go to Google Cloud Console → Pub/Sub → Topics',
    '2. Create a topic named "google-reviews-notifications"',
    '3. In Google Business Profile API → Notifications settings:',
    '   Set the Pub/Sub topic to the one you created',
    '4. Create a Push Subscription:',
    `   Endpoint URL: ${getPushEndpointUrl(baseUrl)}`,
    `   Add header: Authorization: Bearer ${verificationToken}`,
    '5. Enable the webhook toggle below to start receiving real-time reviews',
  ];
}

/**
 * Estimate latency improvement from webhook vs cron.
 */
export function estimateLatencyImprovement(
  cronIntervalMinutes: number,
  avgWebhookProcessingMs: number
): {
  cronAvgLatency: string;
  webhookAvgLatency: string;
  improvement: string;
  speedupFactor: number;
} {
  const cronAvgMs = (cronIntervalMinutes * 60 * 1000) / 2; // Average is half the interval
  const cronAvgSeconds = cronAvgMs / 1000;
  const webhookAvgSeconds = avgWebhookProcessingMs / 1000;
  const speedup = cronAvgSeconds / (webhookAvgSeconds || 1);

  return {
    cronAvgLatency: `${Math.round(cronAvgSeconds)}s (~${Math.round(cronIntervalMinutes / 2)} min avg)`,
    webhookAvgLatency: `${webhookAvgSeconds.toFixed(1)}s`,
    improvement: `${Math.round(speedup)}x faster`,
    speedupFactor: Math.round(speedup),
  };
}
