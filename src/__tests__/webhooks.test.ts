import { describe, it, expect } from 'vitest';
import {
  signPayload,
  verifySignature,
  buildPayload,
  filterWebhooksForEvent,
  WEBHOOK_EVENT_TYPES,
  type WebhookConfig,
  type WebhookEventType,
} from '@/lib/webhooks';

function makeWebhook(overrides: Partial<WebhookConfig> = {}): WebhookConfig {
  return {
    id: 'wh-1',
    url: 'https://example.com/webhook',
    secret: 'test-secret',
    events: ['review.created'] as WebhookEventType[],
    isActive: true,
    ...overrides,
  };
}

describe('signPayload', () => {
  it('produces consistent signatures', () => {
    const sig1 = signPayload('{"test":"data"}', 'secret');
    const sig2 = signPayload('{"test":"data"}', 'secret');
    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different payloads', () => {
    const sig1 = signPayload('{"a":1}', 'secret');
    const sig2 = signPayload('{"b":2}', 'secret');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different secrets', () => {
    const sig1 = signPayload('{"test":"data"}', 'secret1');
    const sig2 = signPayload('{"test":"data"}', 'secret2');
    expect(sig1).not.toBe(sig2);
  });
});

describe('verifySignature', () => {
  it('verifies valid signature', () => {
    const payload = '{"test":"data"}';
    const secret = 'my-secret';
    const sig = signPayload(payload, secret);
    expect(verifySignature(payload, sig, secret)).toBe(true);
  });

  it('rejects invalid signature', () => {
    expect(verifySignature('{"test":"data"}', 'invalid-sig', 'secret')).toBe(false);
  });

  it('rejects wrong secret', () => {
    const sig = signPayload('{"test":"data"}', 'correct-secret');
    expect(verifySignature('{"test":"data"}', sig, 'wrong-secret')).toBe(false);
  });
});

describe('buildPayload', () => {
  it('creates payload with correct event type', () => {
    const payload = buildPayload('review.created', { reviewId: '123' });
    expect(payload.event).toBe('review.created');
    expect(payload.data.reviewId).toBe('123');
    expect(payload.id).toMatch(/^whd_/);
    expect(payload.timestamp).toBeDefined();
  });
});

describe('filterWebhooksForEvent', () => {
  it('returns only matching webhooks', () => {
    const webhooks = [
      makeWebhook({ id: '1', events: ['review.created'] }),
      makeWebhook({ id: '2', events: ['review.replied'] }),
      makeWebhook({ id: '3', events: ['review.created', 'review.replied'] }),
    ];
    const matching = filterWebhooksForEvent(webhooks, 'review.created');
    expect(matching).toHaveLength(2);
    expect(matching.map(w => w.id)).toContain('1');
    expect(matching.map(w => w.id)).toContain('3');
  });

  it('excludes inactive webhooks', () => {
    const webhooks = [
      makeWebhook({ id: '1', isActive: false, events: ['review.created'] }),
      makeWebhook({ id: '2', isActive: true, events: ['review.created'] }),
    ];
    const matching = filterWebhooksForEvent(webhooks, 'review.created');
    expect(matching).toHaveLength(1);
    expect(matching[0].id).toBe('2');
  });

  it('returns empty for no matches', () => {
    const webhooks = [
      makeWebhook({ events: ['review.replied'] }),
    ];
    expect(filterWebhooksForEvent(webhooks, 'review.created')).toHaveLength(0);
  });
});

describe('WEBHOOK_EVENT_TYPES', () => {
  it('has all expected events', () => {
    const events: WebhookEventType[] = [
      'review.created', 'review.replied', 'review.flagged',
      'alert.triggered', 'invite.completed', 'experiment.completed',
    ];
    for (const event of events) {
      expect(WEBHOOK_EVENT_TYPES[event]).toBeDefined();
      expect(WEBHOOK_EVENT_TYPES[event].label).toBeTruthy();
    }
  });
});
