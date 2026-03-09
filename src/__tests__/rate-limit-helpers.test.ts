import { describe, it, expect } from 'vitest';
import { getClientIP, rateLimitResponse, checkRateLimit } from '@/lib/rate-limit';

describe('getClientIP', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('extracts IP from x-real-ip header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(getClientIP(req)).toBe('10.0.0.1');
  });

  it('falls back to 127.0.0.1 when no IP headers', () => {
    const req = new Request('http://localhost');
    expect(getClientIP(req)).toBe('127.0.0.1');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
      },
    });
    expect(getClientIP(req)).toBe('1.1.1.1');
  });
});

describe('rateLimitResponse', () => {
  it('returns null when rate limit not exceeded', () => {
    const result = checkRateLimit(`helpers-ok-${Date.now()}`, { limit: 10, windowSeconds: 60 });
    expect(rateLimitResponse(result)).toBeNull();
  });

  it('returns 429 Response when rate limit exceeded', () => {
    const id = `helpers-block-${Date.now()}`;
    const config = { limit: 1, windowSeconds: 60 };
    checkRateLimit(id, config);
    const blocked = checkRateLimit(id, config);
    const response = rateLimitResponse(blocked);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
    expect(response!.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response!.headers.get('Retry-After')).toBeTruthy();
  });
});
