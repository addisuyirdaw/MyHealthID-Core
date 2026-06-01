import { prisma } from "@/lib/prisma";
import { auditCrossFacilityAccess } from "./audit.service";
import { normalizeHealthcareRole } from "@/lib/locales/enums";
import { Role, MedicalAuditLogAction } from "@prisma/client";

const REDACTION_TEXT = "Locked by Patient / በባለቤቱ የተቆለፈ";

export async function getPatientTimeline(opts: {
  requesterId: string;
  requesterOrganizationId?: string | null;
  requesterRole?: string;
  patientId: string;
  emergency?: boolean;
}) {
  const { requesterId, requesterOrganizationId = null, requesterRole, patientId, emergency = false } = opts;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new Error("Patient not found");

  // Log the access for audit when accessing across hospitals or when not public
  if (requesterOrganizationId && requesterOrganizationId !== patient.organizationId) {
    // Normalize role if provided
    const normalizedRole = requesterRole ? (normalizeHealthcareRole(requesterRole) as Role) : undefined;

    // Get facility service type from requester organization
    let facilityServiceType = undefined;
    const requesterOrg = await prisma.organization.findUnique({
      where: { id: requesterOrganizationId },
      select: { serviceType: true },
    });
    facilityServiceType = requesterOrg?.serviceType;

    await auditCrossFacilityAccess({
      userId: requesterId,
      employeeName: "Unknown",
      organizationId: requesterOrganizationId,
      patientId,
      userRole: normalizedRole,
      facilityServiceType: facilityServiceType,
      actionType: "VIEW_TIMELINE" as MedicalAuditLogAction,
      emergency: !!emergency,
    });
  }

  // If patient history is public, return all entries; otherwise redact entries from other hospitals
  const entries = await prisma.medicalTimelineEntry.findMany({ where: { patientId }, orderBy: { createdAt: "desc" } });

  if (patient.isHistoryPublic || emergency) return entries;

  // Redact entries authored by other hospitals
  const redacted = entries.map((e) => {
    const orgId = (e as any).organizationId as string | null;
    if (orgId && orgId !== patient.organizationId) {
      return {
        id: e.id,
        patientId: e.patientId,
        createdAt: e.createdAt,
        professionalName: REDACTION_TEXT,
        logEntry: REDACTION_TEXT,
        entryType: e.entryType,
        emrSection: e.emrSection,
        title: null,
        body: REDACTION_TEXT,
        structuredData: null,
        relatedVitalsId: null,
      } as any;
    }
    return e;
  });

  return redacted;
}
