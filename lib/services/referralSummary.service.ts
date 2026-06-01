"use server";

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";
import { normalizeHealthcareRole, CLINICAL_ROLES, ADMIN_ROLES } from "@/lib/locales/enums";

/**
 * Generate a cross-facility referral summary snapshot for a patient.
 * Restricts execution to users matching CLINICAL_ROLES.
 * Returns the created ReferralSummary ID or an error.
 */
export async function generateReferralSummary(params: {
  patientId: string;
  destinationOrganizationId?: string | null;
}) {
  try {
    const cookieStore = cookies();
    const userRole = cookieStore.get("userRole")?.value;
    const userOrgId = cookieStore.get("organizationId")?.value;
    const userId = cookieStore.get("userId")?.value;

    if (!userRole || !userOrgId || !userId) {
      return { success: false, error: "Unauthorized: Invalid session context. Please log in again." };
    }

    const normalizedRole = normalizeHealthcareRole(userRole);
    if (!CLINICAL_ROLES.includes(normalizedRole as any)) {
      return {
        success: false,
        error: `Unauthorized: Role ${normalizedRole} is not authorized to generate referral summaries.`,
      };
    }

    const { patientId, destinationOrganizationId } = params;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, organizationId: true },
    });

    if (!patient) {
      return { success: false, error: "Patient not found." };
    }

    // Verify patient belongs to the origin facility
    if (patient.organizationId !== userOrgId) {
      return {
        success: false,
        error: "Patient does not belong to your active facility.",
      };
    }

    // Query historical data vectors without altering/locking original source tables
    const [vitalsList, prescriptions, completedOrders] = await Promise.all([
      prisma.vitals.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.prescription.findMany({
        where: { patientId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.diagnosticOrder.findMany({
        where: {
          patientId,
          completedAt: { not: null },
        },
        include: {
          investigation: true,
          originOrganization: true,
          destinationOrganization: true,
        },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    // Map and serialize the arrays into a structured clinical snapshot
    const clinicalSnapshot = {
      vitals: vitalsList.map((v) => ({
        bp: v.bp,
        pulse: v.pulse,
        rr: v.rr,
        temp: v.temp,
        spO2: v.spO2,
        bmi: v.bmi,
        painLevel: v.painLevel,
        weightKg: v.weightKg,
        heightCm: v.heightCm,
        createdAt: v.createdAt.toISOString(),
      })),
      activeMeds: prescriptions.map((p) => ({
        drugName: p.drugName,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
      })),
      certifiedLabs: completedOrders.map((order) => ({
        testName: order.diagnosticType,
        result: order.investigation?.result || "N/A",
        completedAt: order.completedAt ? order.completedAt.toISOString() : null,
        facilityName: order.destinationOrganization?.name || order.originOrganization.name,
        priority: order.priority || "ROUTINE",
      })),
    };

    // Compute a secure SHA-256 hash string representing the immutable snapshot payload
    const payloadString = JSON.stringify(clinicalSnapshot);
    const documentHash = crypto.createHash("sha256").update(payloadString).digest("hex");

    // Write the ReferralSummary record to the database
    const referralSummary = await prisma.referralSummary.create({
      data: {
        patientId,
        originOrganizationId: userOrgId,
        destinationOrganizationId: destinationOrganizationId || null,
        clinicalSnapshot,
        issuedByUserId: userId,
        documentHash,
      },
    });

    return {
      success: true,
      referralSummaryId: referralSummary.id,
    };
  } catch (error: any) {
    console.error("[generateReferralSummary] error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate referral summary.",
    };
  }
}

/**
 * Retrieve a cross-facility referral summary record securely.
 * Enforces that summaries are only readable by users in CLINICAL_ROLES or ADMIN_ROLES
 * belonging to either the origin or destination facility boundaries.
 */
export async function getReferralSummary(id: string) {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userOrgId = cookieStore.get("organizationId")?.value;

  if (!userRole || !userOrgId) {
    throw new Error("Unauthorized: Invalid session context.");
  }

  const normalizedRole = normalizeHealthcareRole(userRole);
  const isAuthorized =
    CLINICAL_ROLES.includes(normalizedRole as any) || ADMIN_ROLES.includes(normalizedRole as any);

  if (!isAuthorized) {
    throw new Error(`Unauthorized: Role ${normalizedRole} does not have access to referral summaries.`);
  }

  const summary = await prisma.referralSummary.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true,
          fullName: true,
          nationalId: true,
          healthId: true,
          age: true,
          sex: true,
        },
      },
      originOrganization: {
        select: { name: true, serviceType: true },
      },
      destinationOrganization: {
        select: { name: true, serviceType: true },
      },
      issuedByUser: {
        select: { firstName: true, lastName: true, role: true },
      },
    },
  });

  if (!summary) {
    throw new Error("Referral summary not found.");
  }

  // Enforce facility boundaries
  if (
    summary.originOrganizationId !== userOrgId &&
    summary.destinationOrganizationId !== userOrgId
  ) {
    throw new Error(
      "Unauthorized: Access denied. You do not belong to either the origin or destination facility boundaries for this referral."
    );
  }

  return JSON.parse(JSON.stringify(summary));
}

/**
 * List referral summaries visible to the current facility.
 * Includes summaries where the org is the origin (sent) or destination (received).
 * Restricted to CLINICAL_ROLES and ADMIN_ROLES.
 */
export async function getFacilityReferralSummaries() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userOrgId = cookieStore.get("organizationId")?.value;

  if (!userRole || !userOrgId) {
    throw new Error("Unauthorized: Invalid session context.");
  }

  const normalizedRole = normalizeHealthcareRole(userRole);
  const isAuthorized =
    CLINICAL_ROLES.includes(normalizedRole as any) || ADMIN_ROLES.includes(normalizedRole as any);

  if (!isAuthorized) {
    throw new Error(`Unauthorized: Role ${normalizedRole} cannot list referral summaries.`);
  }

  const summaries = await prisma.referralSummary.findMany({
    where: {
      OR: [
        { originOrganizationId: userOrgId },
        { destinationOrganizationId: userOrgId },
      ],
    },
    include: {
      patient: {
        select: { id: true, fullName: true, healthId: true, age: true, sex: true },
      },
      originOrganization: { select: { name: true, serviceType: true } },
      destinationOrganization: { select: { name: true, serviceType: true } },
      issuedByUser: { select: { firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return JSON.parse(JSON.stringify(summaries));
}
