/**
 * Lightweight server-side sliding-window rate limiter for API Route Handlers.
 * Protects registration, referral lookup, project submission, and admin endpoints.
 * Note: In multi-region serverless deployments, pair with Supabase Auth rate limits
 * or an edge KV store (documented in README).
 */

interface BucketEntry {
  timestamps: number[];
}

const buckets = new Map<string, BucketEntry>();

export function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const { key, limit, windowMs, nowMs = Date.now() } = params;
  const cutoff = nowMs - windowMs;

  const existing = buckets.get(key) ?? { timestamps: [] };
  const activeTimestamps = existing.timestamps.filter(ts => ts > cutoff);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0] ?? nowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
    buckets.set(key, { timestamps: activeTimestamps });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }

  activeTimestamps.push(nowMs);
  buckets.set(key, { timestamps: activeTimestamps });

  return {
    allowed: true,
    remaining: Math.max(0, limit - activeTimestamps.length),
    retryAfterSeconds: 0
  };
}

