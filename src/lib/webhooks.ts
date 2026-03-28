/**
 * Webhook Event System
 *
 * Dispatches events to registered webhook endpoints.
 * Supports HMAC signing, retry logic, and delivery logging.
 *
 * Event types:
 *   - review.created       — New review received
 *   - review.replied       — Reply published to Google
 *   - review.flagged       — Review flagged for attention (negative/anomaly)
 *   - alert.triggered      — Predictive alert fired
 *   - invite.completed     — Customer completed review invite
 *   - experiment.completed — A/B experiment reached significance
 */

import { createHmac } from 'crypto';

export type WebhookEventType =
  | 'review.created'
  | 'review.replied'
  | 'review.negative_alert'
  | 'review.flagged'
  | 'alert.triggered'
  | 'invite.completed'
  | 'experiment.completed';

export const WEBHOOK_EVENT_TYPES: Record<WebhookEventType, { label: string; description: string }> = {
  'review.created': { label: 'Review Created', description: 'Fired when a new review is received from any platform' },
  'review.replied': { label: 'Reply Published', description: 'Fired when a reply is published to Google/Yelp/etc.' },
  'review.negative_alert': { label: 'Negative Review Alert', description: 'Fired when a negative review (1-2 stars) is detected' },
  'review.flagged': { label: 'Review Flagged', description: 'Fired when a review is flagged for manual attention' },
  'alert.triggered': { label: 'Alert Triggered', description: 'Fired when a predictive analytics alert is generated' },
  'invite.completed': { label: 'Invite Completed', description: 'Fired when a customer completes a review invite' },
  'experiment.completed': { label: 'Experiment Done', description: 'Fired when an A/B experiment reaches statistical significance' },
};

export interface WebhookPayload {
  id: string;          // Unique delivery ID
  event: WebhookEventType;
  timestamp: string;   // ISO 8601
  data: Record<string, unknown>;
}

export interface WebhookConfig {
  id: string;
  url: string;
  secret: string | null;
  events: WebhookEventType[];
  isActive: boolean;
}

export interface DeliveryResult {
  webhookId: string;
  statusCode: number | null;
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * Sign a webhook payload using HMAC-SHA256.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify a webhook signature.
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Build webhook payload for an event.
 */
export function buildPayload(
  event: WebhookEventType,
  data: Record<string, unknown>
): WebhookPayload {
  return {
    id: `whd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Filter webhooks that should receive a given event.
 */
export function filterWebhooksForEvent(
  webhooks: WebhookConfig[],
  event: WebhookEventType
): WebhookConfig[] {
  return webhooks.filter(wh =>
    wh.isActive && wh.events.includes(event)
  );
}

/**
 * Deliver a webhook payload to a single endpoint.
 * Returns delivery result for logging.
 */
export async function deliverWebhook(
  webhook: WebhookConfig,
  payload: WebhookPayload
): Promise<DeliveryResult> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ReplyWiseAI-Webhook/1.0',
    'X-Webhook-Event': payload.event,
    'X-Webhook-Delivery': payload.id,
  };

  if (webhook.secret) {
    headers['X-Webhook-Signature'] = signPayload(body, webhook.secret);
  }

  const start = Date.now();

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const durationMs = Date.now() - start;

    return {
      webhookId: webhook.id,
      statusCode: response.status,
      durationMs,
      success: response.status >= 200 && response.status < 300,
    };
  } catch (error: any) {
    return {
      webhookId: webhook.id,
      statusCode: null,
      durationMs: Date.now() - start,
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Dispatch an event to all matching webhooks.
 */
export async function dispatchEvent(
  webhooks: WebhookConfig[],
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<DeliveryResult[]> {
  const matching = filterWebhooksForEvent(webhooks, event);
  if (matching.length === 0) return [];

  const payload = buildPayload(event, data);

  const results = await Promise.allSettled(
    matching.map(wh => deliverWebhook(wh, payload))
  );

  return results.map(r =>
    r.status === 'fulfilled'
      ? r.value
      : { webhookId: 'unknown', statusCode: null, durationMs: 0, success: false, error: 'Dispatch failed' }
  );
}
