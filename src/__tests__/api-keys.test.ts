import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateApiKey,
  hashApiKey,
  isValidKeyFormat,
  hasScope,
  isKeyExpired,
  maskKey,
  checkRateLimit,
  resetRateLimits,
} from '@/lib/api-keys';

describe('generateApiKey', () => {
  it('generates key with correct prefix', () => {
    const { fullKey, keyPrefix } = generateApiKey();
    expect(fullKey).toMatch(/^rm_live_[a-f0-9]{32}$/);
    expect(keyPrefix).toBe(fullKey.slice(0, 12));
  });

  it('generates unique keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1.fullKey).not.toBe(key2.fullKey);
    expect(key1.keyHash).not.toBe(key2.keyHash);
  });

  it('generates deterministic hash', () => {
    const { fullKey, keyHash } = generateApiKey();
    expect(hashApiKey(fullKey)).toBe(keyHash);
  });
});

describe('hashApiKey', () => {
  it('produces consistent hash', () => {
    const key = 'rm_live_abcdef1234567890abcdef1234567890';
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it('produces different hashes for different keys', () => {
    expect(hashApiKey('rm_live_aaaa')).not.toBe(hashApiKey('rm_live_bbbb'));
  });
});

describe('isValidKeyFormat', () => {
  it('accepts valid key format', () => {
    expect(isValidKeyFormat('rm_live_abcdef1234567890abcdef1234567890')).toBe(true);
  });

  it('rejects invalid prefix', () => {
    expect(isValidKeyFormat('rm_test_abcdef1234567890abcdef1234567890')).toBe(false);
  });

  it('rejects short key', () => {
    expect(isValidKeyFormat('rm_live_abc')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidKeyFormat('')).toBe(false);
  });
});

describe('hasScope', () => {
  it('returns true for matching scope', () => {
    expect(hasScope(['read', 'write'], 'read')).toBe(true);
  });

  it('returns false for missing scope', () => {
    expect(hasScope(['read'], 'write')).toBe(false);
  });

  it('admin scope grants all permissions', () => {
    expect(hasScope(['admin'], 'read')).toBe(true);
    expect(hasScope(['admin'], 'write')).toBe(true);
    expect(hasScope(['admin'], 'analytics')).toBe(true);
  });
});

describe('isKeyExpired', () => {
  it('returns false for null expiry', () => {
    expect(isKeyExpired(null)).toBe(false);
  });

  it('returns false for future date', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isKeyExpired(future)).toBe(false);
  });

  it('returns true for past date', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isKeyExpired(past)).toBe(true);
  });
});

describe('maskKey', () => {
  it('shows prefix and masks rest', () => {
    const masked = maskKey('rm_live_abcd');
    expect(masked).toBe('rm_live_abcd' + '•'.repeat(28));
    expect(masked).not.toContain('efgh');
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('allows first request', () => {
    const result = checkRateLimit('key1', 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
  });

  it('blocks when limit exceeded', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('key2', 10);
    }
    const result = checkRateLimit('key2', 10);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks per-key limits independently', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit('key3', 5);
    }
    const result = checkRateLimit('key4', 5);
    expect(result.allowed).toBe(true);
  });
});
