/**
 * API Key Management
 *
 * Generates, validates, and manages API keys for the public REST API.
 * Keys are stored as SHA-256 hashes; the full key is only shown once at creation.
 *
 * Key format: rm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (40 chars total)
 */

import { createHash, randomBytes } from 'crypto';

export interface ApiKey {
  id: string;
  tenantId: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitPerHour: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyCreateResult {
  key: ApiKey;
  fullKey: string;  // Only returned once at creation
}

export type ApiScope = 'read' | 'write' | 'analytics' | 'admin';

export const API_SCOPES: Record<ApiScope, { label: string; description: string }> = {
  read: { label: 'Read', description: 'Read reviews, stores, and basic data' },
  write: { label: 'Write', description: 'Create and update reviews, replies' },
  analytics: { label: 'Analytics', description: 'Access analytics and reports' },
  admin: { label: 'Admin', description: 'Full admin access (manage settings, team)' },
};

/**
 * Generate a new API key.
 * Returns the full key (shown once) and its hash (stored in DB).
 */
export function generateApiKey(): { fullKey: string; keyPrefix: string; keyHash: string } {
  const randomPart = randomBytes(24).toString('hex').slice(0, 32);
  const fullKey = `rm_live_${randomPart}`;
  const keyPrefix = fullKey.slice(0, 12); // "rm_live_xxxx"
  const keyHash = hashApiKey(fullKey);

  return { fullKey, keyPrefix, keyHash };
}

/**
 * Hash an API key for storage/lookup.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key format.
 */
export function isValidKeyFormat(key: string): boolean {
  return /^rm_live_[a-f0-9]{32}$/.test(key);
}

/**
 * Check if a key has the required scope.
 */
export function hasScope(keyScopes: string[], required: ApiScope): boolean {
  if (keyScopes.includes('admin')) return true; // Admin has all scopes
  return keyScopes.includes(required);
}

/**
 * Check if a key is expired.
 */
export function isKeyExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Mask a key for display (show prefix, mask the rest).
 */
export function maskKey(keyPrefix: string): string {
  return `${keyPrefix}${'•'.repeat(28)}`;
}

/**
 * Rate limit check — simple in-memory counter.
 * In production, use Redis (Upstash) for distributed rate limiting.
 */
const rateLimitCounters = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(keyId: string, limitPerHour: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitCounters.get(keyId);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + 60 * 60 * 1000; // 1 hour
    rateLimitCounters.set(keyId, { count: 1, resetAt });
    return { allowed: true, remaining: limitPerHour - 1, resetAt };
  }

  if (entry.count >= limitPerHour) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limitPerHour - entry.count, resetAt: entry.resetAt };
}

/**
 * Reset rate limit counters (for testing).
 */
export function resetRateLimits(): void {
  rateLimitCounters.clear();
}
