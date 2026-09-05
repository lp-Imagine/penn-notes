/**
 * Simple in-memory IP rate limiter (sliding fixed window).
 */

export function createRateLimiter({ windowMs = 60_000, max = 20 } = {}) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const buckets = new Map();

  function prune(now) {
    if (buckets.size < 2000) return;
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  return {
    /**
     * @param {string} key
     * @returns {{ ok: boolean, remaining: number, retryAfterSec: number }}
     */
    check(key) {
      const now = Date.now();
      prune(now);
      const cur = buckets.get(key);
      if (!cur || cur.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: max - 1, retryAfterSec: 0 };
      }
      if (cur.count >= max) {
        return {
          ok: false,
          remaining: 0,
          retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)),
        };
      }
      cur.count += 1;
      return { ok: true, remaining: max - cur.count, retryAfterSec: 0 };
    },
  };
}

/**
 * Per-IP daily quota. Resets at local midnight (server TZ) or after 24h window
 * from first hit — we use calendar day in UTC+8 for CN blogs.
 */
export function createDailyLimiter({
  max = 80,
  timeZone = "Asia/Shanghai",
} = {}) {
  /** @type {Map<string, { count: number, day: string }>} */
  const buckets = new Map();

  function dayKey(now = Date.now()) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
    } catch {
      return new Date(now).toISOString().slice(0, 10);
    }
  }

  function msUntilNextDay(now = Date.now()) {
    const today = dayKey(now);
    // probe next hours until day changes
    for (let h = 1; h <= 48; h++) {
      const t = now + h * 3600_000;
      if (dayKey(t) !== today) {
        // binary-ish refine within the hour
        let lo = now + (h - 1) * 3600_000;
        let hi = t;
        while (hi - lo > 1000) {
          const mid = Math.floor((lo + hi) / 2);
          if (dayKey(mid) === today) lo = mid;
          else hi = mid;
        }
        return Math.max(1000, hi - now);
      }
    }
    return 24 * 3600_000;
  }

  return {
    /**
     * @param {string} key
     * @returns {{ ok: boolean, remaining: number, retryAfterSec: number, day: string }}
     */
    check(key) {
      const now = Date.now();
      const day = dayKey(now);
      if (buckets.size > 5000) {
        for (const [k, v] of buckets) {
          if (v.day !== day) buckets.delete(k);
        }
      }
      const cur = buckets.get(key);
      if (!cur || cur.day !== day) {
        buckets.set(key, { count: 1, day });
        return { ok: true, remaining: max - 1, retryAfterSec: 0, day };
      }
      if (cur.count >= max) {
        return {
          ok: false,
          remaining: 0,
          retryAfterSec: Math.max(1, Math.ceil(msUntilNextDay(now) / 1000)),
          day,
        };
      }
      cur.count += 1;
      return { ok: true, remaining: max - cur.count, retryAfterSec: 0, day };
    },
  };
}
