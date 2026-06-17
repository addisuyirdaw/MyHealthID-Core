import prisma from "@/lib/prisma";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}

/**
 * Checks and increments the rate limit for a given key.
 * 
 * @param key Unique rate limit key (e.g. `rate_limit:login:192.168.1.1`)
 * @param limit Maximum allowed points within the window
 * @param durationSeconds Expiration window in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  durationSeconds: number
): Promise<RateLimitResult> {
  const now = new Date();
  
  // 1. Fetch current rate limit record using bypass flag to avoid any multi-tenant rules
  // (We use __bypassTenantFilter: true to ensure global database access bypasses any tenant injection)
  const record = await prisma.rateLimit.findUnique({
    where: {
      key,
      // @ts-ignore
      __bypassTenantFilter: true
    }
  });

  const expireAt = new Date(now.getTime() + durationSeconds * 1000);

  // 2. If record doesn't exist or is expired, reset/create it
  if (!record || now > record.expireAt) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: {
        key,
        points: 1,
        expireAt,
      },
      update: {
        points: 1,
        expireAt,
      }
    });

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: expireAt,
    };
  }

  // 3. If record exists and is active, check limit
  if (record.points >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.expireAt,
    };
  }

  // 4. Increment points
  const updated = await prisma.rateLimit.update({
    where: { key },
    data: {
      points: { increment: 1 }
    }
  });

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - updated.points),
    reset: record.expireAt,
  };
}
