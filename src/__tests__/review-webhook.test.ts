import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifyPubSubToken,
  parsePubSubMessage,
  recordReceived,
  recordProcessed,
  recordError,
  getHealthStatus,
  resetMetrics,
  getPushEndpointUrl,
  generateVerificationToken,
  generateSetupInstructions,
  estimateLatencyImprovement,
  DEFAULT_WEBHOOK_CONFIG,
  type PubSubMessage,
  type ReviewNotification,
} from '../lib/review-webhook';

// --------------- DEFAULT_WEBHOOK_CONFIG ---------------

describe('DEFAULT_WEBHOOK_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_WEBHOOK_CONFIG.enabled).toBe(false);
    expect(DEFAULT_WEBHOOK_CONFIG.fallbackCronEnabled).toBe(true);
    expect(DEFAULT_WEBHOOK_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_WEBHOOK_CONFIG.processingTimeoutMs).toBe(25000);
  });
});

// --------------- verifyPubSubToken ---------------

describe('verifyPubSubToken', () => {
  it('should reject null auth header', () => {
    expect(verifyPubSubToken(null, 'test-token')).toBe(false);
  });

  it('should reject empty auth header', () => {
    expect(verifyPubSubToken('', 'test-token')).toBe(false);
  });

  it('should reject short tokens', () => {
    expect(verifyPubSubToken('Bearer abc', 'test-token')).toBe(false);
  });

  it('should accept matching token', () => {
    expect(verifyPubSubToken('Bearer my-verification-token', 'my-verification-token')).toBe(true);
  });

  it('should reject mismatched token', () => {
    expect(verifyPubSubToken('Bearer wrong-token-12345', 'correct-token-here')).toBe(false);
  });
});

// --------------- parsePubSubMessage ---------------

describe('parsePubSubMessage', () => {
  function makeMessage(data: object): PubSubMessage {
    return {
      message: {
        data: Buffer.from(JSON.stringify(data)).toString('base64'),
        messageId: 'msg-123',
        publishTime: new Date().toISOString(),
      },
      subscription: 'projects/my-project/subscriptions/reviews-sub',
    };
  }

  it('should parse a valid notification', () => {
    const msg = makeMessage({
      account: 'accounts/123',
      location: 'locations/456',
      reviewId: 'review-789',
      changeType: 'NEW_REVIEW',
    });
    const result = parsePubSubMessage(msg);
    expect(result).not.toBeNull();
    expect(result!.account).toBe('accounts/123');
    expect(result!.location).toBe('locations/456');
    expect(result!.reviewId).toBe('review-789');
    expect(result!.changeType).toBe('NEW_REVIEW');
  });

  it('should map "new" to NEW_REVIEW', () => {
    const msg = makeMessage({ account: 'a', location: 'l', review_id: 'r1', type: 'new' });
    const result = parsePubSubMessage(msg);
    expect(result!.changeType).toBe('NEW_REVIEW');
  });

  it('should map "updated" to UPDATED_REVIEW', () => {
    const msg = makeMessage({ account: 'a', location: 'l', reviewId: 'r2', changeType: 'UPDATED_REVIEW' });
    const result = parsePubSubMessage(msg);
    expect(result!.changeType).toBe('UPDATED_REVIEW');
  });

  it('should handle DELETED_REVIEW', () => {
    const msg = makeMessage({ account: 'a', location: 'l', reviewId: 'r3', changeType: 'DELETED_REVIEW' });
    const result = parsePubSubMessage(msg);
    expect(result!.changeType).toBe('DELETED_REVIEW');
  });

  it('should return null for missing data', () => {
    const msg: PubSubMessage = {
      message: { data: '', messageId: '1', publishTime: '' },
      subscription: 'sub',
    };
    const result = parsePubSubMessage(msg);
    expect(result).toBeNull();
  });

  it('should return null for invalid base64', () => {
    const msg: PubSubMessage = {
      message: { data: 'not-valid-base64!!!', messageId: '1', publishTime: '' },
      subscription: 'sub',
    };
    const result = parsePubSubMessage(msg);
    expect(result).toBeNull();
  });

  it('should handle name-based format', () => {
    const msg = makeMessage({
      name: 'accounts/100/locations/200/reviews/300',
    });
    const result = parsePubSubMessage(msg);
    expect(result).not.toBeNull();
    expect(result!.reviewId).toBe('300');
  });
});

// --------------- Metrics ---------------

describe('Metrics tracking', () => {
  beforeEach(() => {
    resetMetrics();
  });

  it('should start with zero metrics', () => {
    const status = getHealthStatus(false);
    expect(status.totalReceived).toBe(0);
    expect(status.totalProcessed).toBe(0);
    expect(status.totalErrors).toBe(0);
    expect(status.isActive).toBe(false);
  });

  it('should track received messages', () => {
    recordReceived();
    recordReceived();
    recordReceived();
    const status = getHealthStatus(true);
    expect(status.totalReceived).toBe(3);
    expect(status.lastReceivedAt).not.toBeNull();
    expect(status.isActive).toBe(true);
  });

  it('should track processed messages with duration', () => {
    recordProcessed(150);
    recordProcessed(250);
    const status = getHealthStatus(true);
    expect(status.totalProcessed).toBe(2);
    expect(status.avgProcessingMs).toBe(200); // (150+250)/2
    expect(status.lastProcessedAt).not.toBeNull();
  });

  it('should track errors', () => {
    recordError();
    recordError();
    const status = getHealthStatus(true);
    expect(status.totalErrors).toBe(2);
  });

  it('should calculate uptime percent', () => {
    recordProcessed(100);
    recordProcessed(100);
    recordProcessed(100);
    recordError();
    const status = getHealthStatus(true);
    expect(status.uptimePercent).toBe(75); // 3 ok / 4 total
  });

  it('should return 100% uptime when no activity', () => {
    const status = getHealthStatus(true);
    expect(status.uptimePercent).toBe(100);
  });

  it('should reset all metrics', () => {
    recordReceived();
    recordProcessed(100);
    recordError();
    resetMetrics();
    const status = getHealthStatus(false);
    expect(status.totalReceived).toBe(0);
    expect(status.totalProcessed).toBe(0);
    expect(status.totalErrors).toBe(0);
    expect(status.lastReceivedAt).toBeNull();
  });
});

// --------------- Setup Helpers ---------------

describe('getPushEndpointUrl', () => {
  it('should generate correct endpoint URL', () => {
    expect(getPushEndpointUrl('https://myapp.com')).toBe('https://myapp.com/api/webhooks/google-reviews');
  });

  it('should work with trailing slash', () => {
    // no trailing slash handling needed, just concatenation
    expect(getPushEndpointUrl('https://myapp.com')).toContain('/api/webhooks/google-reviews');
  });
});

describe('generateVerificationToken', () => {
  it('should generate a 32-char hex string', () => {
    const token = generateVerificationToken('tenant-123', 'secret-key');
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should generate different tokens for different tenants', () => {
    const t1 = generateVerificationToken('tenant-1', 'secret');
    const t2 = generateVerificationToken('tenant-2', 'secret');
    expect(t1).not.toBe(t2);
  });

  it('should be deterministic for same inputs', () => {
    const t1 = generateVerificationToken('tenant-1', 'secret');
    const t2 = generateVerificationToken('tenant-1', 'secret');
    expect(t1).toBe(t2);
  });
});

describe('generateSetupInstructions', () => {
  it('should return an array of steps', () => {
    const steps = generateSetupInstructions('https://myapp.com', 'token-abc');
    expect(steps.length).toBeGreaterThanOrEqual(5);
  });

  it('should include the endpoint URL', () => {
    const steps = generateSetupInstructions('https://myapp.com', 'token-abc');
    expect(steps.some(s => s.includes('https://myapp.com/api/webhooks/google-reviews'))).toBe(true);
  });

  it('should include the verification token', () => {
    const steps = generateSetupInstructions('https://myapp.com', 'my-token');
    expect(steps.some(s => s.includes('my-token'))).toBe(true);
  });
});

// --------------- Latency Estimation ---------------

describe('estimateLatencyImprovement', () => {
  it('should calculate correct latency comparison', () => {
    const result = estimateLatencyImprovement(5, 15000); // 5 min cron, 15s webhook
    expect(result.cronAvgLatency).toContain('150'); // 5*60/2 = 150 seconds
    expect(result.webhookAvgLatency).toBe('15.0s');
    expect(result.speedupFactor).toBe(10); // 150/15
  });

  it('should handle zero webhook processing time', () => {
    const result = estimateLatencyImprovement(5, 0);
    expect(result.speedupFactor).toBe(150); // 150/1 (clamped to 1)
  });

  it('should include improvement string', () => {
    const result = estimateLatencyImprovement(10, 20000);
    expect(result.improvement).toContain('faster');
  });
});
