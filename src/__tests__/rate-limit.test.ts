import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  it('allows requests within limit', () => {
    const result = checkRateLimit('test-ip-1', { limit: 5, windowSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('tracks remaining requests', () => {
    const config = { limit: 3, windowSeconds: 60 };
    const id = 'test-ip-track-' + Date.now();

    const r1 = checkRateLimit(id, config);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(id, config);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(id, config);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests over limit', () => {
    const config = { limit: 2, windowSeconds: 60 };
    const id = 'test-ip-block-' + Date.now();

    checkRateLimit(id, config);
    checkRateLimit(id, config);

    const r3 = checkRateLimit(id, config);
    expect(r3.success).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('different identifiers have separate limits', () => {
    const config = { limit: 1, windowSeconds: 60 };
    const ts = Date.now();

    const r1 = checkRateLimit(`user-a-${ts}`, config);
    expect(r1.success).toBe(true);

    const r2 = checkRateLimit(`user-b-${ts}`, config);
    expect(r2.success).toBe(true);
  });
});
