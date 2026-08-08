import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiter.
 *
 * Order of backends:
 *  1. Upstash Redis / Vercel KV — optional, if env vars are set
 *  2. Supabase Postgres (`check_rate_limit` RPC) — default shared store
 *  3. In-memory Map — last resort (local / migration not applied yet)
 *
 * Postgres is enough at current scale; Redis is not required.
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
let loggedPgFallback = false;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

/**
 * Rate-limit key for a caller with no session (OTP request/verify, coupon
 * validation, banner beacons). Falls back to a single shared bucket rather than
 * a per-request unique one, so an absent header throttles instead of exempting.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** 429 with the Retry-After the limiter computed. */
export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
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
    timeout: 3000,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

type PgRateLimitRow = {
  ok: boolean;
  remaining: number;
  reset_at: number;
  retry_after: number;
};

async function postgresRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error || !data || typeof data !== "object") {
      if (!loggedPgFallback) {
        loggedPgFallback = true;
        console.error(
          "[rate-limit] Postgres check_rate_limit failed — apply migration 0027_rate_limits.sql. Falling back to memory.",
          error?.message ?? "empty response"
        );
      }
      return null;
    }

    const row = data as PgRateLimitRow;
    return {
      ok: Boolean(row.ok),
      remaining: Number(row.remaining) || 0,
      resetAt: Number(row.reset_at) || Date.now() + windowMs,
      retryAfter: Number(row.retry_after) || 0,
    };
  } catch (err) {
    if (!loggedPgFallback) {
      loggedPgFallback = true;
      console.error(
        "[rate-limit] Postgres rate limit threw — falling back to memory.",
        err instanceof Error ? err.message : err
      );
    }
    return null;
  }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  // Optional Redis — only when explicitly configured.
  const limiter = getLimiter(limit, windowMs);
  if (limiter) {
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
      // Fall through to Postgres / memory.
    }
  }

  const pg = await postgresRateLimit(key, limit, windowMs);
  if (pg) return pg;

  return memoryRateLimit(key, limit, windowMs);
}
