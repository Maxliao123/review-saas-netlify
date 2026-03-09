/**
 * Simple in-memory rate limiter for Vercel serverless functions.
 * Uses a sliding window approach. In production, replace with Redis (Upstash).
 *
 * Note: This works per-instance. On Vercel, each cold start gets a fresh map.
 * For strict rate limiting across instances, use Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries periodically
const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier (IP, API key, user ID, etc.)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `${identifier}`;

  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (existing.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count++;
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Extract client IP from request headers.
 * Works with Vercel's x-forwarded-for header.
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

/**
 * Rate limit response helper — returns a 429 Response if limit exceeded.
 */
export function rateLimitResponse(result: RateLimitResult): Response | null {
  if (result.success) return null;

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    }
  );
}

/** Preconfigured limits for different API tiers */
export const RATE_LIMITS = {
  /** Public review generation: 20 requests per minute per IP */
  generate: { limit: 20, windowSeconds: 60 } as RateLimitConfig,
  /** Public scan tracking: 60 requests per minute per IP */
  scan: { limit: 60, windowSeconds: 60 } as RateLimitConfig,
  /** Public store lookup: 30 requests per minute per IP */
  store: { limit: 30, windowSeconds: 60 } as RateLimitConfig,
  /** Public feedback submission: 10 requests per minute per IP */
  feedback: { limit: 10, windowSeconds: 60 } as RateLimitConfig,
  /** Admin API: 60 requests per minute per user */
  admin: { limit: 60, windowSeconds: 60 } as RateLimitConfig,
  /** Auth: 10 attempts per 15 minutes per IP */
  auth: { limit: 10, windowSeconds: 900 } as RateLimitConfig,
} as const;
