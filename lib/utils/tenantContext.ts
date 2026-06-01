/**
 * lib/utils/tenantContext.ts
 *
 * Lightweight server-safe tenant context extractor.
 * Reads the active session cookies set by auth.actions.ts on login
 * and returns a typed TenantContext for use in server actions and
 * the Prisma client extension.
 *
 * Cookie contract (written in loginUser):
 *   userRole       — e.g. "GENERAL_PRACTITIONER"
 *   organizationId — facility-scoped MongoDB org ID
 *   userId         — authenticated user's MongoDB User.id
 */

import { cookies } from "next/headers";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TenantContext = {
  userId: string;
  organizationId: string;
  role: string;
};

// ─── Error ───────────────────────────────────────────────────────────────────

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantContextError";
  }
}

// ─── Hard Extractor ──────────────────────────────────────────────────────────

/**
 * getTenantContext()
 *
 * Reads session cookies and returns the active TenantContext.
 * Throws TenantContextError if organizationId is absent — use this in
 * any Server Action that MUST operate within a facility boundary.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const cookieStore = cookies();
  const organizationId = cookieStore.get("organizationId")?.value?.trim();
  const userId = cookieStore.get("userId")?.value?.trim();
  const role = cookieStore.get("userRole")?.value?.trim();

  if (!organizationId) {
    throw new TenantContextError(
      "[TenantContext] No active organizationId found in session. " +
        "Ensure the user is authenticated and has a facility context."
    );
  }

  return {
    userId: userId ?? "",
    organizationId,
    role: role ?? "",
  };
}

// ─── Soft Extractor ──────────────────────────────────────────────────────────

/**
 * getTenantContextOrNull()
 *
 * Returns the TenantContext or null if the session is absent.
 * Use this for:
 *   - Public routes (e.g. citizen self-service)
 *   - Cross-facility operations that bypass org isolation
 *   - System tasks / cron jobs without a user session
 */
export async function getTenantContextOrNull(): Promise<TenantContext | null> {
  try {
    const cookieStore = cookies();
    const organizationId = cookieStore.get("organizationId")?.value?.trim();
    const userId = cookieStore.get("userId")?.value?.trim();
    const role = cookieStore.get("userRole")?.value?.trim();

    if (!organizationId) return null;

    return {
      userId: userId ?? "",
      organizationId,
      role: role ?? "",
    };
  } catch {
    // In non-request contexts (e.g. build time, scripts) cookies() throws —
    // treat as unauthenticated.
    return null;
  }
}

// ─── Cross-Facility Bypass Spread ────────────────────────────────────────────

/**
 * CROSS_FACILITY
 *
 * Spread this into any Prisma `where` clause to skip the tenant isolation
 * layer and execute a globally-scoped query.
 *
 * Usage:
 *   prisma.patient.findMany({ where: { ...CROSS_FACILITY, OR: [...] } })
 *
 * TypeScript sees `{}` (empty object — harmless to spread), but at runtime
 * the extension reads `__bypassTenantFilter: true` and skips org injection.
 * The flag is stripped before the query reaches the database driver.
 *
 * Use ONLY for:
 *   - Cross-facility referral / diagnostic order lookups
 *   - Citizen self-service identity searches (no staff session)
 *   - System / cron tasks that operate across all organizations
 */
export const CROSS_FACILITY: {} = {
  __bypassTenantFilter: true,
} as {};
