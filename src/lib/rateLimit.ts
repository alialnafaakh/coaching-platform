import { createHmac } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

/** Login: failed attempts per IP / 15 minutes */
export const LOGIN_IP_MAX = 5;
export const LOGIN_IP_WINDOW_SECONDS = 15 * 60;

/** Login: failed attempts per username digest / 15 minutes */
export const LOGIN_USER_MAX = 8;
export const LOGIN_USER_WINDOW_SECONDS = 15 * 60;

/** Booking: attempts per IP / 10 minutes */
export const BOOKING_IP_MAX = 8;
export const BOOKING_IP_WINDOW_SECONDS = 10 * 60;

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: string | null;
  retryAfterSeconds: number;
};

export type RateLimitResult =
  | { ok: true; decision: RateLimitDecision }
  | { ok: false; reason: "misconfigured" | "backend_error" };

function getRateLimitSecret(): string | null {
  const secret = process.env.RATE_LIMIT_SECRET?.trim();
  if (!secret) return null;
  return secret;
}

/**
 * Opaque HMAC key material for DB storage.
 * Never pass raw IP / username / email into Postgres.
 */
export function hashRateLimitPart(part: string): string {
  const secret = getRateLimitSecret();
  if (!secret) {
    throw new Error("RATE_LIMIT_SECRET is not configured");
  }
  return createHmac("sha256", secret).update(part, "utf8").digest("hex");
}

export function loginIpBucketKey(ip: string): string {
  return `login:ip:${hashRateLimitPart(ip)}`;
}

export function loginUserBucketKey(username: string): string {
  const normalized = username.trim().toLowerCase();
  return `login:user:${hashRateLimitPart(normalized)}`;
}

export function bookingIpBucketKey(ip: string): string {
  return `booking:ip:${hashRateLimitPart(ip)}`;
}

/**
 * Client IP on Vercel.
 *
 * Trust assumption: when the deployment terminates TLS on Vercel,
 * `x-vercel-forwarded-for` / platform-managed `x-forwarded-for` reflect the
 * connecting client. We do not accept arbitrary custom client headers.
 * Local/dev may have no IP — callers must handle null safely.
 */
export function getClientIpFromHeaders(headerStore: Headers): string | null {
  const vercelForwarded = headerStore.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headerStore.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
}

export function getClientIpFromRequest(req: Request): string | null {
  return getClientIpFromHeaders(req.headers);
}

function parseDecision(raw: unknown): RateLimitDecision | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.allowed !== "boolean") return null;

  const remaining =
    typeof row.remaining === "number" && Number.isFinite(row.remaining)
      ? Math.max(0, Math.floor(row.remaining))
      : 0;
  const retryAfterSeconds =
    typeof row.retry_after_seconds === "number" && Number.isFinite(row.retry_after_seconds)
      ? Math.max(0, Math.floor(row.retry_after_seconds))
      : 0;
  const resetAt =
    typeof row.reset_at === "string"
      ? row.reset_at
      : row.reset_at == null
        ? null
        : String(row.reset_at);

  return {
    allowed: row.allowed,
    remaining,
    resetAt,
    retryAfterSeconds,
  };
}

async function rpcRateLimit(
  fn: "peek_rate_limit" | "consume_rate_limit",
  bucketKey: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!getRateLimitSecret()) {
    return { ok: false, reason: "misconfigured" };
  }

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.rpc(fn, {
      p_bucket_key: bucketKey,
      p_max_attempts: maxAttempts,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error("Rate limit RPC error", { fn, code: error.code });
      return { ok: false, reason: "backend_error" };
    }

    const decision = parseDecision(data);
    if (!decision) {
      console.error("Rate limit RPC returned unexpected payload", { fn });
      return { ok: false, reason: "backend_error" };
    }

    return { ok: true, decision };
  } catch {
    console.error("Rate limit RPC unexpected failure", { fn });
    return { ok: false, reason: "backend_error" };
  }
}

export async function peekRateLimit(
  bucketKey: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  return rpcRateLimit("peek_rate_limit", bucketKey, maxAttempts, windowSeconds);
}

export async function consumeRateLimit(
  bucketKey: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  return rpcRateLimit("consume_rate_limit", bucketKey, maxAttempts, windowSeconds);
}

export async function resetRateLimitBucket(bucketKey: string): Promise<RateLimitResult> {
  if (!getRateLimitSecret()) {
    return { ok: false, reason: "misconfigured" };
  }

  try {
    const db = getSupabaseAdmin();
    const { error } = await db.rpc("reset_rate_limit", {
      p_bucket_key: bucketKey,
    });
    if (error) {
      console.error("Rate limit reset RPC error", { code: error.code });
      return { ok: false, reason: "backend_error" };
    }
    return {
      ok: true,
      decision: { allowed: true, remaining: 0, resetAt: null, retryAfterSeconds: 0 },
    };
  } catch {
    console.error("Rate limit reset RPC unexpected failure");
    return { ok: false, reason: "backend_error" };
  }
}

/**
 * Login pre-check: deny if IP or username bucket already exhausted.
 * Fail-closed on limiter misconfiguration / backend errors.
 */
export async function assertLoginNotRateLimited(input: {
  ip: string | null;
  username: string;
}): Promise<{ blocked: boolean; limiterError: boolean }> {
  const username = input.username.trim();
  if (!username) {
    // Empty username is a normal auth failure, not a limiter outage.
    return { blocked: false, limiterError: false };
  }

  if (!getRateLimitSecret()) {
    console.error("Login rate limit unavailable: RATE_LIMIT_SECRET missing");
    return { blocked: true, limiterError: true };
  }

  try {
    const userKey = loginUserBucketKey(username);
    const userPeek = await peekRateLimit(userKey, LOGIN_USER_MAX, LOGIN_USER_WINDOW_SECONDS);
    if (!userPeek.ok) {
      return { blocked: true, limiterError: true };
    }
    if (!userPeek.decision.allowed) {
      return { blocked: true, limiterError: false };
    }

    if (input.ip) {
      const ipKey = loginIpBucketKey(input.ip);
      const ipPeek = await peekRateLimit(ipKey, LOGIN_IP_MAX, LOGIN_IP_WINDOW_SECONDS);
      if (!ipPeek.ok) {
        return { blocked: true, limiterError: true };
      }
      if (!ipPeek.decision.allowed) {
        return { blocked: true, limiterError: false };
      }
    }

    return { blocked: false, limiterError: false };
  } catch {
    console.error("Login rate limit pre-check failed");
    return { blocked: true, limiterError: true };
  }
}

/** Record a failed login against IP (if known) and username buckets. */
export async function recordFailedLoginAttempt(input: {
  ip: string | null;
  username: string;
}): Promise<void> {
  const username = input.username.trim();
  if (!username || !getRateLimitSecret()) return;

  try {
    await consumeRateLimit(
      loginUserBucketKey(username),
      LOGIN_USER_MAX,
      LOGIN_USER_WINDOW_SECONDS
    );
    if (input.ip) {
      await consumeRateLimit(loginIpBucketKey(input.ip), LOGIN_IP_MAX, LOGIN_IP_WINDOW_SECONDS);
    }
  } catch {
    console.error("Login rate limit consume failed");
  }
}

/** Clear login buckets after successful authentication. */
export async function clearLoginRateLimits(input: {
  ip: string | null;
  username: string;
}): Promise<void> {
  const username = input.username.trim();
  if (!username || !getRateLimitSecret()) return;

  try {
    await resetRateLimitBucket(loginUserBucketKey(username));
    if (input.ip) {
      await resetRateLimitBucket(loginIpBucketKey(input.ip));
    }
  } catch {
    console.error("Login rate limit reset failed");
  }
}

/**
 * Booking IP limiter. Fail-open when IP missing, secret missing, or backend errors.
 * When limited, returns decision for Retry-After.
 */
export async function enforceBookingIpRateLimit(
  ip: string | null
): Promise<
  | { action: "allow" }
  | { action: "deny"; decision: RateLimitDecision }
  | { action: "skip"; reason: "missing_ip" | "misconfigured" | "backend_error" }
> {
  if (!ip) {
    return { action: "skip", reason: "missing_ip" };
  }
  if (!getRateLimitSecret()) {
    console.warn("Booking rate limit skipped: RATE_LIMIT_SECRET missing");
    return { action: "skip", reason: "misconfigured" };
  }

  const result = await consumeRateLimit(
    bookingIpBucketKey(ip),
    BOOKING_IP_MAX,
    BOOKING_IP_WINDOW_SECONDS
  );

  if (!result.ok) {
    console.warn("Booking rate limit skipped: backend unavailable");
    return { action: "skip", reason: "backend_error" };
  }

  if (!result.decision.allowed) {
    return { action: "deny", decision: result.decision };
  }

  return { action: "allow" };
}
