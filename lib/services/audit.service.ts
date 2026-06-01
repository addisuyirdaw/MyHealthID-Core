import { prisma } from "@/lib/prisma";
import { Role, FacilityServiceType, MedicalAuditLogAction } from "@prisma/client";
import { normalizeHealthcareRole } from "@/lib/locales/enums";

export type AuditAction =
  | "view_timeline"
  | "view_record"
  | "override_privacy"
  | "break_glass"
  | "download_record"
  | "other";

export async function auditCrossFacilityAccess(params: {
  userId: string;
  employeeName: string;
  organizationId: string;
  patientId: string;
  userRole?: Role | string;
  facilityServiceType?: FacilityServiceType;
  actionType: MedicalAuditLogAction | string;
  emergency?: boolean;
  metadata?: any;
}) {
  // Immutable audit: write MUST happen for any cross-facility access
  const {
    userId,
    employeeName,
    organizationId,
    patientId,
    userRole,
    facilityServiceType,
    actionType,
    emergency = false,
    metadata = null,
  } = params;

  // Normalize role to canonical enum if provided
  const normalizedRole = userRole ? (normalizeHealthcareRole(userRole) as Role | undefined) : undefined;

  // Map action string to enum if necessary
  let action: MedicalAuditLogAction;
  if (typeof actionType === "string") {
    const actionMap: Record<string, MedicalAuditLogAction> = {
      view_timeline: "VIEW_TIMELINE",
      view_record: "VIEW_RECORD",
      override_privacy: "OVERRIDE_PRIVACY",
      break_glass: "BREAK_GLASS",
      download_record: "DOWNLOAD_RECORD",
      cross_facility_access: "CROSS_FACILITY_ACCESS",
      other: "OTHER",
    };
    action = actionMap[actionType.toLowerCase()] || "OTHER";
  } else {
    action = actionType as MedicalAuditLogAction;
  }

  // Ensure this write is not bypassable; no additional checks here.
  const log = await prisma.medicalAuditLog.create({
    data: {
      userId,
      employeeName,
      organizationId,
      patientId,
      employeeRole: normalizedRole,
      facilityServiceType,
      actionType: action,
      emergency,
      metadata: metadata ? metadata : undefined,
    },
  });

  return log;
}

export async function fetchAuditEntriesForPatient(patientId: string) {
  return prisma.medicalAuditLog.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { id: true, name: true, serviceType: true } },
      user: { select: { id: true, fullName: true, role: true } },
    },
  });
}
