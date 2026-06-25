"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { SYSTEM_ADMIN_ROLES } from "@/lib/locales/enums";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Auth guard — throws immediately if caller is not SYSTEM_ADMINISTRATOR.
// ─────────────────────────────────────────────────────────────────────────────
async function requireSysAdminSession(): Promise<{
  userId: string;
  userName: string;
  userRole: string;
}> {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userId = cookieStore.get("userId")?.value;
  const userName = cookieStore.get("userName")?.value ?? "System Administrator";

  if (
    !userRole ||
    !userId ||
    !SYSTEM_ADMIN_ROLES.includes(userRole as (typeof SYSTEM_ADMIN_ROLES)[number])
  ) {
    throw new Error(
      "Unauthorized: SYSTEM_ADMINISTRATOR role required."
    );
  }

  return { userId, userName, userRole };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: write an audit log entry synchronously before returning.
// ─────────────────────────────────────────────────────────────────────────────
async function writeAuditLog(opts: {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: "USER" | "FACILITY" | "SYSTEM";
  targetId: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const headerStore = headers();
    const ipAddress =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      "unknown";

    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId,
        actorName: opts.actorName,
        actorRole: opts.actorRole,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        targetName: opts.targetName,
        metadata: (opts.metadata as any) ?? {},
        ipAddress,
      },
    });
  } catch (err) {
    // Audit log failures must never silently break the primary action.
    console.error("[writeAuditLog] Failed to persist audit entry:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────
export async function getSysAdminDashboardStats() {
  await requireSysAdminSession();

  const [
    totalFacilities,
    activeFacilities,
    totalUsers,
    activeUsers,
    totalPatients,
    recentAuditLogs,
    pendingApplications,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.patient.count(),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
    prisma.facilityApplication.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalFacilities,
    activeFacilities,
    totalUsers,
    activeUsers,
    totalPatients,
    pendingApplications,
    recentAuditLogs: JSON.parse(JSON.stringify(recentAuditLogs)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Facilities CRUD
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllFacilities() {
  await requireSysAdminSession();

  const facilities = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          patients: true,
          users: true,
        },
      },
    },
  });

  return JSON.parse(JSON.stringify(facilities));
}

export async function createFacility(data: {
  name: string;
  nameAm: string;
  code: string;
  registrationId: string;
  ownershipType: string;
  serviceType: string;
  region?: string;
  zone?: string;
  woreda?: string;
  email?: string;
  phone?: string;
  website?: string;
}) {
  const { userId, userName, userRole } = await requireSysAdminSession();

  if (!data.name?.trim()) return { success: false, error: "Facility name is required." };
  if (!data.code?.trim()) return { success: false, error: "Facility code is required." };
  if (!data.registrationId?.trim()) return { success: false, error: "Registration ID is required." };
  if (!data.ownershipType) return { success: false, error: "Ownership type is required." };
  if (!data.serviceType) return { success: false, error: "Service type is required." };

  try {
    const facility = await prisma.organization.create({
      data: {
        name: data.name.trim(),
        nameLng: { en: data.name.trim(), am: data.nameAm?.trim() || data.name.trim() },
        code: data.code.trim().toUpperCase(),
        registrationId: data.registrationId.trim(),
        ownershipType: data.ownershipType as any,
        serviceType: data.serviceType as any,
        region: data.region?.trim() || null,
        zone: data.zone?.trim() || null,
        woreda: data.woreda?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        website: data.website?.trim() || null,
        isActive: true,
        isVerified: false,
      },
    });

    await writeAuditLog({
      actorId: userId,
      actorName: userName,
      actorRole: userRole,
      action: "CREATE_FACILITY",
      targetType: "FACILITY",
      targetId: facility.id,
      targetName: facility.name,
      metadata: { code: facility.code, serviceType: facility.serviceType },
    });

    revalidatePath("/system-admin/facilities");
    return { success: true, facilityId: facility.id };
  } catch (err: any) {
    if (err.code === "P2002") {
      return { success: false, error: "A facility with that code or registration ID already exists." };
    }
    console.error("[createFacility]", err);
    return { success: false, error: err.message ?? "Unexpected error." };
  }
}

export async function deleteFacility(
  facilityId: string
): Promise<{ success: boolean; blocked?: boolean; error?: string }> {
  const { userId, userName, userRole } = await requireSysAdminSession();

  const facility = await prisma.organization.findUnique({
    where: { id: facilityId },
    select: { id: true, name: true },
  });

  if (!facility) return { success: false, error: "Facility not found." };

  // Guard: check for active patients
  const [patientCount, userCount] = await Promise.all([
    prisma.patient.count({ where: { organizationId: facilityId } }),
    prisma.user.count({ where: { organizationId: facilityId } }),
  ]);

  if (patientCount > 0) {
    return {
      success: false,
      blocked: true,
      error: `Cannot delete "${facility.name}" — it has ${patientCount} patient record(s). Deactivate it instead.`,
    };
  }

  // Cascade-delete staff members (safe — no patients exist at this point)
  if (userCount > 0) {
    await prisma.user.deleteMany({ where: { organizationId: facilityId } });
  }

  await prisma.organization.delete({ where: { id: facilityId } });

  await writeAuditLog({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    action: "DELETE_FACILITY",
    targetType: "FACILITY",
    targetId: facilityId,
    targetName: facility.name,
    metadata: userCount > 0 ? { staffDeleted: userCount } : undefined,
  });

  revalidatePath("/system-admin/facilities");
  return { success: true };
}

export async function toggleFacilityActive(
  facilityId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { userId, userName, userRole } = await requireSysAdminSession();

  const facility = await prisma.organization.findUnique({
    where: { id: facilityId },
    select: { id: true, name: true },
  });

  if (!facility) return { success: false, error: "Facility not found." };

  await prisma.organization.update({
    where: { id: facilityId },
    data: { isActive },
  });

  await writeAuditLog({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    action: isActive ? "ACTIVATE_FACILITY" : "DEACTIVATE_FACILITY",
    targetType: "FACILITY",
    targetId: facilityId,
    targetName: facility.name,
  });

  revalidatePath("/system-admin/facilities");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Users management
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllUsers(search?: string) {
  await requireSysAdminSession();

  const q = search?.trim();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      fullName: true,
      isActive: true,
      isTempPassword: true,
      createdAt: true,
      lastLoginAt: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return JSON.parse(JSON.stringify(users));
}

export async function resetUserPasswordSysAdmin(
  targetUserId: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  const { userId, userName, userRole } = await requireSysAdminSession();

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, fullName: true, firstName: true, lastName: true, email: true },
  });

  if (!targetUser) return { success: false, error: "User not found." };

  const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  const code = Array.from(bytes)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      resetRequestCode: code,
      isTempPassword: true,
    },
  });

  const displayName =
    targetUser.fullName ??
    [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") ??
    targetUser.email;

  await writeAuditLog({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    action: "RESET_PASSWORD",
    targetType: "USER",
    targetId: targetUserId,
    targetName: displayName,
    metadata: { email: targetUser.email },
  });

  revalidatePath("/system-admin/users");
  return { success: true, code };
}

export async function toggleUserActiveSysAdmin(
  targetUserId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { userId, userName, userRole } = await requireSysAdminSession();

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, fullName: true, firstName: true, lastName: true, email: true },
  });

  if (!targetUser) return { success: false, error: "User not found." };

  await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive },
  });

  const displayName =
    targetUser.fullName ??
    [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") ??
    targetUser.email;

  await writeAuditLog({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    targetType: "USER",
    targetId: targetUserId,
    targetName: displayName,
    metadata: { email: targetUser.email },
  });

  revalidatePath("/system-admin/users");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────────────────────────────────────
export async function getAuditLogs(opts?: {
  limit?: number;
  targetType?: string;
}) {
  await requireSysAdminSession();

  const logs = await prisma.auditLog.findMany({
    where: opts?.targetType ? { targetType: opts.targetType } : {},
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 100,
  });

  return JSON.parse(JSON.stringify(logs));
}
