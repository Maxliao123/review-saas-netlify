/**
 * Webhook Dispatch Utility
 *
 * Server-side function to dispatch webhook events to all matching
 * webhook_configs for a given tenant. Uses supabaseAdmin (service role)
 * to bypass RLS for DB operations.
 *
 * Usage:
 *   import { dispatchWebhookEvent } from '@/lib/webhooks-dispatch';
 *   await dispatchWebhookEvent(tenantId, 'review.created', { review_id: '...', rating: 5 });
 */

import { createHmac } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { WebhookEventType } from '@/lib/webhooks';

interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
}

/**
 * Dispatch a webhook event to all matching configs for a tenant.
 * Signs each payload with HMAC-SHA256 using the webhook's secret,
 * sends POST requests, and records delivery results.
 */
export async function dispatchWebhookEvent(
  tenantId: string | number,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  // 1. Fetch active webhook configs that subscribe to this event
  const { data: configs, error } = await supabaseAdmin
    .from('webhook_configs')
    .select('id, url, secret, events, enabled')
    .eq('tenant_id', tenantId)
    .eq('enabled', true);

  if (error || !configs || configs.length === 0) return;

  // 2. Filter to configs that include this event
  const matching = (configs as WebhookConfig[]).filter(
    (c) => c.events.includes(event)
  );
  if (matching.length === 0) return;

  // 3. Build payload
  const payload = {
    id: `whd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  // 4. Dispatch to each matching webhook in parallel
  const results = await Promise.allSettled(
    matching.map(async (config) => {
      const signature = createHmac('sha256', config.secret)
        .update(body)
        .digest('hex');

      const start = Date.now();
      let statusCode: number | null = null;
      let responseBody = '';
      let success = false;

      try {
        const response = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ReplyWiseAI-Webhook/1.0',
            'X-ReplyWise-Signature': signature,
            'X-Webhook-Event': event,
            'X-Webhook-Delivery': payload.id,
          },
          body,
          signal: AbortSignal.timeout(10_000), // 10s timeout
        });

        statusCode = response.status;
        success = response.status >= 200 && response.status < 300;

        // Read up to 1KB of response body for debugging
        try {
          const text = await response.text();
          responseBody = text.slice(0, 1024);
        } catch {
          // ignore body read errors
        }
      } catch (err: any) {
        responseBody = err.message || 'Network error';
      }

      // 5. Record delivery in webhook_config_deliveries
      await supabaseAdmin.from('webhook_config_deliveries').insert({
        webhook_config_id: config.id,
        event,
        payload,
        status_code: statusCode,
        response_body: responseBody,
        success,
      });

      return { configId: config.id, statusCode, success };
    })
  );

  // Log any dispatch failures (non-fatal)
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[webhooks-dispatch] Delivery error:', result.reason);
    }
  }
}
