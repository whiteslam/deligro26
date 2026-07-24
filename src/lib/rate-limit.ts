import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Fixed-window rate limiter (checklist §4).
 *
 * Uses Upstash Redis / Vercel KV when `UPSTASH_REDIS_REST_*` or `KV_REST_API_*`
 * env vars are set, so limits hold across serverless instances. Falls back to
 * an in-memory Map for local/demo when KV is not configured.
 *
 * Supabase Auth already rate-limits login/OTP server-side, which covers the
 * highest-risk endpoints out of the box.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number; // seconds
}

type Bucket = { count: number; resetAt: number };

const memoryStore = new Map<string, Bucket>();
const limiterCache = new Map<string, Ratelimit>();

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = memoryStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
    retryAfter: 0,
  };
}

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;

  const cacheKey = `${limit}:${windowMs}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.fixedWindow(limit, `${windowSec} s`),
    prefix: "deligro:ratelimit",
    // Fail open if Redis is slow — prefer availability over hard deny.
    timeout: 3000,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const limiter = getLimiter(limit, windowMs);
  if (!limiter) {
    return memoryRateLimit(key, limit, windowMs);
  }

  try {
    const result = await limiter.limit(key);
    const now = Date.now();
    return {
      ok: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
      retryAfter: result.success
        ? 0
        : Math.max(0, Math.ceil((result.reset - now) / 1000)),
    };
  } catch {
    // Redis unreachable — degrade to per-instance memory so the API stays up.
    return memoryRateLimit(key, limit, windowMs);
  }
}
