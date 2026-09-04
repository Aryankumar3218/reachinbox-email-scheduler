import redisClient from '../config/redis';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  nextWindowDelayMs: number;
  hourWindow: string;
}

export class RateLimiterService {
  /**
   * Generates a stable hour window identifier (e.g., "2026-09-04-22")
   */
  public static getHourWindowKey(date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `${year}-${month}-${day}-${hour}`;
  }

  /**
   * Calculates milliseconds remaining until the beginning of the next hour window.
   */
  public static getMsUntilNextHourWindow(date: Date = new Date()): number {
    const nextHour = new Date(date);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
    // Add 1.5 seconds safety margin so jobs run cleanly inside the new window
    return Math.max(1000, nextHour.getTime() - date.getTime() + 1500);
  }

  /**
   * Atomically checks and increments the email counter for a sender within the current hour.
   * Safe across multiple distributed workers and instances using Redis.
   */
  public static async checkAndIncrement(
    sender: string,
    customLimit?: number
  ): Promise<RateLimitCheckResult> {
    const defaultLimit = parseInt(process.env.DEFAULT_HOURLY_LIMIT_PER_SENDER || '20', 10);
    const limit = customLimit !== undefined && customLimit > 0 ? customLimit : defaultLimit;
    const now = new Date();
    const hourWindow = this.getHourWindowKey(now);
    const redisKey = `ratelimit:hourly:${sender.toLowerCase().trim()}:${hourWindow}`;

    // Atomic INCR and 2-hour TTL to prevent memory leaks
    const pipeline = redisClient.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, 7200);
    const results = await pipeline.exec();

    const currentCount = results && results[0] && results[0][1] ? Number(results[0][1]) : 1;

    if (currentCount > limit) {
      // Exceeded limit: do not drop job, calculate delay to next window
      const nextWindowDelayMs = this.getMsUntilNextHourWindow(now);
      return {
        allowed: false,
        currentCount,
        limit,
        nextWindowDelayMs,
        hourWindow,
      };
    }

    return {
      allowed: true,
      currentCount,
      limit,
      nextWindowDelayMs: 0,
      hourWindow,
    };
  }

  /**
   * Read-only inspect of current hour rate limit consumption for a sender.
   */
  public static async getCurrentUsage(sender: string, limit?: number): Promise<{
    currentCount: number;
    limit: number;
    remaining: number;
    hourWindow: string;
  }> {
    const defaultLimit = parseInt(process.env.DEFAULT_HOURLY_LIMIT_PER_SENDER || '20', 10);
    const effectiveLimit = limit !== undefined && limit > 0 ? limit : defaultLimit;
    const hourWindow = this.getHourWindowKey();
    const redisKey = `ratelimit:hourly:${sender.toLowerCase().trim()}:${hourWindow}`;

    const raw = await redisClient.get(redisKey);
    const currentCount = raw ? parseInt(raw, 10) : 0;
    const remaining = Math.max(0, effectiveLimit - currentCount);

    return {
      currentCount,
      limit: effectiveLimit,
      remaining,
      hourWindow,
    };
  }
}

export default RateLimiterService;
