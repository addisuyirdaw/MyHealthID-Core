"use server";

import prisma from "@/lib/prisma";
import { CROSS_FACILITY } from "@/lib/utils/tenantContext";
import { auditCrossFacilityAccess } from "@/lib/services/audit.service";
import { cookies } from "next/headers";
import { generateAIBrief } from "@/lib/ai-service";

export interface PatientDataInput {
  id: string;
  fullName: string;
  age: number;
  sex: string;
  chiefComplaint?: string | null;
  suspectedDisease?: string | null;
  detailedSituation?: string | null;
  preExistingConditions?: string | null;
  allergyInformation?: string | null;
  legacyProviderName?: string | null;
  vitals?: any[];
  prescriptions?: any[];
  investigations?: any[];
  journals?: any[];
}

/**
 * Next.js Server Action to generate clinical AI brief after verifying privacy consent
 * and writing an immutable audit log entry.
 */
export async function generateClinicalContextStream(patientData: PatientDataInput) {
  if (!patientData || !patientData.id) {
    throw new Error("Invalid patient data provided.");
  }

  // 1. Consent Verification (Estonian Model Compliance)
  // Fetch patient from DB globally using CROSS_FACILITY bypass to verify restriction flag
  const patient = await prisma.patient.findFirst({
    where: {
      ...CROSS_FACILITY,
      id: patientData.id,
    } as any,
    select: {
      isRestricted: true,
      organizationId: true,
    },
  });

  if (!patient) {
    throw new Error("Patient record not found.");
  }

  if (patient.isRestricted) {
    throw new Error(
      "Cross-Facility Access Restricted: Patient opted out of cross-facility data sharing under Estonian Model regulations."
    );
  }

  // 2. Immutable Audit Logging
  let userId = "system-ai";
  let employeeName = "AI Support System";
  let organizationId = patient.organizationId || "system-org";
  let userRole = "GENERAL_PRACTITIONER";

  try {
    const cookieStore = cookies();
    userId = cookieStore.get("userId")?.value || userId;
    employeeName = cookieStore.get("professionalName")?.value || employeeName;
    organizationId = cookieStore.get("organizationId")?.value || organizationId;
    userRole = cookieStore.get("userRole")?.value || userRole;
  } catch {
    // Non-request context fallback
  }

  try {
    await auditCrossFacilityAccess({
      userId,
      employeeName,
      organizationId,
      patientId: patientData.id,
      userRole,
      actionType: "CROSS_FACILITY_ACCESS",
      metadata: {
        action: "generateClinicalContextStream",
        timestamp: new Date().toISOString(),
        clientAccess: true,
      },
    });
  } catch (auditError) {
    // Audit log write failure must block access for strict compliance
    console.error("❌ Failed to write clinical support audit log:", auditError);
    throw new Error("Security Access Log failure. Transaction aborted.");
  }

  // 3. Generate the AI Brief Context
  const bullets = generateAIBrief(patientData);

  return {
    success: true,
    bullets,
    timestamp: new Date().toISOString(),
  };
}
