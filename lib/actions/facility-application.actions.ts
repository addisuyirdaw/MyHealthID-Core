"use server";

/**
 * lib/actions/facility-application.actions.ts
 *
 * Gated Facility Onboarding workflow.
 *
 * PUBLIC (authenticated users):
 *   submitFacilityApplication  — create a PENDING application
 *
 * SYSTEM_ADMINISTRATOR only:
 *   getPendingApplications     — list PENDING applications
 *   getAllApplications          — list all applications (any status)
 *   approveFacilityApplication — validate → create Org → link user → notify
 *   rejectFacilityApplication  — update to REJECTED → notify
 *
 * ── TenantID format ────────────────────────────────────────────────────────
 * MH-{TYPE_CODE}-{REGION_CODE}-{UUID_SEGMENT}
 *
 * Where:
 *   TYPE_CODE    = first 4 chars of FacilityServiceType (e.g. "GENE" for GENERAL_HOSPITAL)
 *   REGION_CODE  = first 3 chars of region uppercased   (e.g. "ORM" for Oromia)
 *   UUID_SEGMENT = 12-char cryptographically secure hex segment
 *
 * Example: MH-GENE-ORM-a3f8c91d2b47
 *
 * This scheme is:
 *   • Unique     — UUID segment guarantees collision resistance
 *   • Readable   — type/region prefix aids support & operations
 *   • Stable     — deterministic structure (no random words) so future
 *                  multi-tenant routing can parse the prefix reliably
 */

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { SYSTEM_ADMIN_ROLES, normalizeFacilityServiceType, normalizeHealthcareRole } from "@/lib/locales/enums";
import { sendApplicationNotification } from "@/lib/mailService";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuthSession(): Promise<{
  userId: string;
  userName: string;
  userRole: string;
}> {
  const cookieStore = cookies();
  const userId = cookieStore.get("userId")?.value;
  const userRole = cookieStore.get("userRole")?.value;
  const userName = cookieStore.get("userName")?.value ?? "User";

  if (!userId || !userRole) {
    throw new Error("Unauthorized: you must be signed in to submit an application.");
  }
  return { userId, userName, userRole };
}

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
    throw new Error("Unauthorized: SYSTEM_ADMINISTRATOR role required.");
  }
  return { userId, userName, userRole };
}

// ─────────────────────────────────────────────────────────────────────────────
// TenantID generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a deterministic-structure, cryptographically unique TenantID.
 *
 * Format: MH-{TYPE_CODE}-{REGION_CODE}-{UUID_SEGMENT}
 *
 * The UUID segment is generated via crypto.randomUUID() which is
 * RFC 4122 compliant and collision-resistant. Stripping hyphens from the
 * last UUID segment gives a compact 12-char hex string.
 */
function generateTenantId(facilityType: string, region: string): string {
  const typeCode = facilityType.replace(/_/g, "").substring(0, 4).toUpperCase();
  const regionCode = (region || "ETH").replace(/\s+/g, "").substring(0, 3).toUpperCase();
  // Use crypto.randomUUID() — RFC 4122 v4, cryptographically secure
  const uuidSegment = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
  return `MH-${typeCode}-${regionCode}-${uuidSegment}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit log helper (mirrors system-admin.actions.ts)
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
    console.error("[writeAuditLog] Failed to persist audit entry:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC: Submit application (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────

export async function submitFacilityApplication(data: {
  businessLicenseNumber: string;
  contactEmail: string;
  officialName: string;
  facilityType: string;
  ownershipType?: string;
  region?: string;
  zone?: string;
  woreda?: string;
  kebele?: string;
  // Flexible verification payload
  metadata?: {
    license_url?: string;
    representative_id_type?: string;
    representative_id_url?: string;
    physician_lead_name?: string;
    notes?: string;
    [key: string]: unknown;
  };
}): Promise<{ success: boolean; applicationId?: string; error?: string }> {
  const { userId } = await requireAuthSession();

  // Basic validation
  if (!data.businessLicenseNumber?.trim())
    return { success: false, error: "Business license number is required." };
  if (!data.contactEmail?.trim() || !data.contactEmail.includes("@"))
    return { success: false, error: "A valid contact email is required." };
  if (!data.officialName?.trim())
    return { success: false, error: "Official facility name is required." };
  if (!data.facilityType?.trim())
    return { success: false, error: "Facility type is required." };

  try {
    const application = await prisma.facilityApplication.create({
      data: {
        businessLicenseNumber: data.businessLicenseNumber.trim(),
        contactEmail: data.contactEmail.trim().toLowerCase(),
        registeredBy: userId,
        officialName: data.officialName.trim(),
        facilityType: data.facilityType.trim(),
        ownershipType: data.ownershipType?.trim() || null,
        region: data.region?.trim() || null,
        zone: data.zone?.trim() || null,
        woreda: data.woreda?.trim() || null,
        kebele: data.kebele?.trim() || null,
        metadata: {
          license_url: data.metadata?.license_url ?? null,
          representative_id_type: data.metadata?.representative_id_type ?? null,
          representative_id_url: data.metadata?.representative_id_url ?? null,
          physician_lead_name: data.metadata?.physician_lead_name ?? null,
          notes: data.metadata?.notes ?? null,
          submitted_from_ip: null, // can be enriched server-side if needed
          ...data.metadata,
        },
        status: "PENDING",
      },
    });

    revalidatePath("/system-admin/applications");
    return { success: true, applicationId: application.id };
  } catch (err: any) {
    if (err.code === "P2002") {
      return {
        success: false,
        error: "An application with this business license number already exists.",
      };
    }
    console.error("[submitFacilityApplication]", err);
    return { success: false, error: err.message ?? "Unexpected error." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Query applications
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingApplications() {
  await requireSysAdminSession();
  const apps = await prisma.facilityApplication.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  return JSON.parse(JSON.stringify(apps));
}

export async function getAllApplications() {
  await requireSysAdminSession();
  const apps = await prisma.facilityApplication.findMany({
    orderBy: { createdAt: "desc" },
  });
  return JSON.parse(JSON.stringify(apps));
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Approve application
// ─────────────────────────────────────────────────────────────────────────────

export async function approveFacilityApplication(
  applicationId: string
): Promise<{ success: boolean; facilityId?: string; tenantId?: string; error?: string }> {
  const { userId, userName, userRole } = await requireSysAdminSession();

  // 1. Load and validate application
  const application = await prisma.facilityApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) return { success: false, error: "Application not found." };
  if (application.status !== "PENDING") {
    return {
      success: false,
      error: `Application is already ${application.status.toLowerCase()}. Cannot approve again.`,
    };
  }

  // 2. Generate a deterministic-structure, cryptographically unique TenantID
  const tenantId = generateTenantId(
    application.facilityType,
    application.region ?? "ETH"
  );

  // 3. Normalize facility type
  const normalizedFacilityType = normalizeFacilityServiceType(application.facilityType);
  const serializedName = `${application.officialName} (${normalizedFacilityType})`;
  const locationSuffix = [application.region, application.zone, application.woreda, application.kebele]
    .filter(Boolean)
    .join(", ");
  const fullName = locationSuffix ? `${serializedName} - ${locationSuffix}` : serializedName;

  try {
    // 4. Create the Organization (the actual facility record)
    const facility = await prisma.organization.create({
      data: {
        id: tenantId,         // TenantID is the primary key
        name: fullName,
        nameLng: { en: application.officialName, am: application.officialName },
        code: tenantId,
        registrationId: application.businessLicenseNumber,
        ownershipType: (application.ownershipType as any) ?? "PUBLIC",
        serviceType: normalizedFacilityType as any,
        region: application.region ?? null,
        zone: application.zone ?? null,
        woreda: application.woreda ?? null,
        email: application.contactEmail,
        isActive: true,
        isVerified: true,
      },
    });

    // 5. Seed the initial admin account for the applicant user
    //    Derive stable credentials from tenantId (same logic as registerOrganization)
    const adminLicenseNumber = `admin-${tenantId.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const adminEmail = `${adminLicenseNumber.replace(/[^a-z0-9]/g, "")}@myhealthid.gov.et`;
    const adminEmailOrUsername = adminLicenseNumber.replace(/[^a-z0-9]/g, "");
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(8);
    let activationCode = "";
    for (let i = 0; i < 8; i++) activationCode += chars[bytes[i] % chars.length];
    const nationalId = `fadmin-${tenantId.toLowerCase().replace(/[^a-z0-9]/g, "")}-${crypto.randomBytes(2).toString("hex")}`;

    const adminRole = normalizeHealthcareRole("ADMIN");

    // Link the applicant user to the new facility AND create a dedicated admin account
    await Promise.all([
      // Update the submitter's organization linkage
      prisma.user.update({
        where: { id: application.registeredBy },
        data: {
          organizationId: tenantId,
          hospitalId: tenantId,
          hospitalName: facility.name,
        },
      }).catch(() => {
        // Non-fatal: user may have been deleted or ID may be synthetic
        console.warn(`[approveFacility] Could not link registeredBy user ${application.registeredBy}`);
      }),

      // Create the dedicated facility admin account
      prisma.user.create({
        data: {
          email: adminEmail,
          emailOrUsername: adminEmailOrUsername,
          role: adminRole as any,
          firstName: "Facility",
          lastName: "Administrator",
          professionalLicenseNumber: adminLicenseNumber,
          hospitalId: tenantId,
          hospitalName: facility.name,
          organizationId: tenantId,
          nationalId,
          isFirstLogin: true,
          activationCode,
        },
      }),
    ]);

    // 6. Mark application APPROVED
    await prisma.facilityApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        approvedFacilityId: tenantId,
        approvedAt: new Date(),
        approvedBy: userId,
      },
    });

    // 7. Write audit log
    await writeAuditLog({
      actorId: userId,
      actorName: userName,
      actorRole: userRole,
      action: "APPROVE_FACILITY_APPLICATION",
      targetType: "FACILITY",
      targetId: tenantId,
      targetName: application.officialName,
      metadata: {
        applicationId,
        tenantId,
        businessLicenseNumber: application.businessLicenseNumber,
        adminEmail,
        adminActivationCode: activationCode,
      },
    });

    // 8. Send approval notification (non-fatal if email fails)
    sendApplicationNotification({
      toEmail: application.contactEmail,
      facilityName: application.officialName,
      decision: "approved",
      tenantId,
    }).catch((err) =>
      console.error("[approveFacilityApplication] Notification error:", err)
    );

    revalidatePath("/system-admin/applications");
    revalidatePath("/system-admin/facilities");
    revalidatePath("/system-admin/dashboard");

    return { success: true, facilityId: tenantId, tenantId };
  } catch (err: any) {
    if (err.code === "P2002") {
      return {
        success: false,
        error: "A facility with this registration ID or code already exists.",
      };
    }
    console.error("[approveFacilityApplication]", err);
    return { success: false, error: err.message ?? "Unexpected error." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Reject application
// ─────────────────────────────────────────────────────────────────────────────

export async function rejectFacilityApplication(
  applicationId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, userName, userRole } = await requireSysAdminSession();

  const application = await prisma.facilityApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) return { success: false, error: "Application not found." };
  if (application.status !== "PENDING") {
    return {
      success: false,
      error: `Application is already ${application.status.toLowerCase()}.`,
    };
  }

  await prisma.facilityApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      rejectionReason: reason?.trim() || "No reason provided.",
    },
  });

  await writeAuditLog({
    actorId: userId,
    actorName: userName,
    actorRole: userRole,
    action: "REJECT_FACILITY_APPLICATION",
    targetType: "FACILITY",
    targetId: applicationId,
    targetName: application.officialName,
    metadata: { reason },
  });

  // Send rejection notification (non-fatal)
  sendApplicationNotification({
    toEmail: application.contactEmail,
    facilityName: application.officialName,
    decision: "rejected",
    reason: reason?.trim() || "No reason provided.",
  }).catch((err) =>
    console.error("[rejectFacilityApplication] Notification error:", err)
  );

  revalidatePath("/system-admin/applications");
  revalidatePath("/system-admin/dashboard");

  return { success: true };
}
