"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Self-healing DB sync: Parses existing Organization name strings
 * and fills Kilil, Zone, Woreda, Kebele fields if they are empty.
 */
export async function syncOrganizationLocations() {
  try {
    const orgs = await prisma.organization.findMany({
      where: {
        OR: [
          { region: null },
          { zone: null },
          { woreda: null },
          { kebele: null },
        ]
      }
    });

    for (const org of orgs) {
      // Expected format: "Name (Type) - Kilil, Zone, Woreda, Kebele"
      const mainParts = org.name.split(" - ");
      if (mainParts.length > 1) {
        const locParts = mainParts[1].split(", ");
        const kilil = locParts[0]?.trim() || "Amhara";
        const zone = locParts[1]?.trim() || "Semien Shewa";
        const woreda = locParts[2]?.trim() || "Basona Worena";
        const kebele = locParts[3]?.trim() || "04";

        await prisma.organization.update({
          where: { id: org.id },
          data: {
            region: kilil,
            zone: zone,
            woreda: woreda,
            kebele: kebele,
          }
        });
      } else {
        // Fallback defaults for default organizations
        await prisma.organization.update({
          where: { id: org.id },
          data: {
            region: "Amhara",
            zone: "Semien Shewa",
            woreda: "Basona Worena",
            kebele: "04",
          }
        });
      }
    }
  } catch (error) {
    console.error("[syncOrganizationLocations] Error:", error);
  }
}

/**
 * Fetches all registered organizations/hospitals, optionally filtered by location parameters.
 */
export async function getHospitals(filter?: { kilil?: string; zone?: string; woreda?: string }) {
  try {
    // Run self-healing sync
    await syncOrganizationLocations();

    const where: any = {};
    if (filter?.kilil && filter.kilil !== "ALL") {
      where.region = { equals: filter.kilil, mode: "insensitive" };
    }
    if (filter?.zone && filter.zone !== "ALL") {
      where.zone = { equals: filter.zone, mode: "insensitive" };
    }
    if (filter?.woreda && filter.woreda !== "ALL") {
      where.woreda = { equals: filter.woreda, mode: "insensitive" };
    }

    const organizations = await prisma.organization.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        region: true,
        zone: true,
        woreda: true,
        kebele: true,
        isActive: true,
        isVerified: true,
      }
    });

    return { success: true, hospitals: JSON.parse(JSON.stringify(organizations)) };
  } catch (error: any) {
    console.error("[getHospitals] Error:", error);
    return { success: false, error: error.message || "Failed to fetch hospitals." };
  }
}

/**
 * Appends a pending appointment/intake request document linked to a hospital using Fayda National ID as anchor.
 */
export async function requestIntake(data: {
  nationalId: string;
  fullName: string;
  phoneNumber?: string;
  organizationId: string;
  notes?: string;
}) {
  try {
    const cleanId = data.nationalId.replace(/\s/g, "");
    if (!cleanId) {
      throw new Error("Fayda National ID is required.");
    }
    if (cleanId.length !== 12 && cleanId.length !== 16) {
      throw new Error("Fayda National ID must be a 12-digit FIN or 16-digit FCN.");
    }

    // Verify Organization exists
    const org = await prisma.organization.findUnique({
      where: { id: data.organizationId },
      select: { id: true, name: true }
    });
    if (!org) {
      throw new Error("Invalid facility selection.");
    }

    // Check if an active request already exists for this hospital
    const existing = await prisma.intakeRequest.findFirst({
      where: {
        nationalId: cleanId,
        organizationId: data.organizationId,
        status: "PENDING"
      }
    });
    if (existing) {
      return { success: false, error: `You already have a pending intake request at ${org.name}.` };
    }

    const intake = await prisma.intakeRequest.create({
      data: {
        nationalId: cleanId,
        fullName: data.fullName.trim(),
        phoneNumber: data.phoneNumber?.trim() || null,
        notes: data.notes?.trim() || null,
        organizationId: data.organizationId,
        status: "PENDING"
      }
    });

    return { success: true, request: JSON.parse(JSON.stringify(intake)) };
  } catch (error: any) {
    console.error("[requestIntake] Error:", error);
    return { success: false, error: error.message || "Failed to request intake." };
  }
}

/**
 * Fetches all existing intake requests for a given citizen's Fayda ID.
 */
export async function getExistingIntakeRequests(nationalId: string) {
  try {
    const cleanId = nationalId.replace(/\s/g, "");
    if (!cleanId) return [];

    const requests = await prisma.intakeRequest.findMany({
      where: { nationalId: cleanId },
      include: {
        organization: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return JSON.parse(JSON.stringify(requests));
  } catch (error) {
    console.error("[getExistingIntakeRequests] Error:", error);
    return [];
  }
}

/**
 * Fetches patient details to auto-populate the open intake form.
 */
export async function getCitizenProfile(patientId: string) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        fullName: true,
        faydaId: true,
        nationalId: true,
        phoneNumber: true,
      }
    });
    return { success: true, citizen: patient ? JSON.parse(JSON.stringify(patient)) : null };
  } catch (error: any) {
    console.error("[getCitizenProfile] Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches PENDING digital intake requests submitted by citizens targeting the given facility.
 * If organizationId is empty, resolves it from the session cookie.
 */
export async function getPendingDigitalIntakes(organizationId: string): Promise<{
  success: boolean;
  intakes?: any[];
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const resolvedOrgId = organizationId || cookieStore.get("organizationId")?.value || null;
    if (!resolvedOrgId) return { success: false, error: "Facility context missing." };

    const intakes = await prisma.intakeRequest.findMany({
      where: {
        organizationId: resolvedOrgId,
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, intakes: JSON.parse(JSON.stringify(intakes)) };
  } catch (error: any) {
    console.error("[getPendingDigitalIntakes] Error:", error);
    return { success: false, error: error.message || "Failed to fetch digital intakes." };
  }
}

/**
 * Confirms a digital intake check-in:
 *   1. Marks the IntakeRequest status as CHECKED_IN.
 *   2. Finds the patient by Fayda/national ID and links them to the facility.
 *   3. Inserts them into the live triage queue (Queue record).
 * If organizationId is empty, resolves it from the session cookie.
 */
export async function confirmDigitalIntakeCheckIn(
  intakeId: string,
  organizationId: string
): Promise<{ success: boolean; patientId?: string; error?: string }> {
  try {
    const cookieStore = await cookies();
    const resolvedOrgId = organizationId || cookieStore.get("organizationId")?.value || null;
    if (!intakeId || !resolvedOrgId) throw new Error("Missing required fields.");

    // 1. Load the intake record
    const intake = await prisma.intakeRequest.findUnique({ where: { id: intakeId } });
    if (!intake) throw new Error("Intake request not found.");
    if (intake.status !== "PENDING") throw new Error("This intake request has already been processed.");

    // 2. Find patient by nationalId / faydaId
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { nationalId: intake.nationalId },
          { faydaId: intake.nationalId },
        ],
      },
    });

    if (!patient) {
      throw new Error(
        "No registered patient found matching this Fayda ID. Ask the patient to complete full registration first."
      );
    }

    // 3. Run everything atomically
    await prisma.$transaction(async (tx) => {
      // a) Mark intake as CHECKED_IN
      await tx.intakeRequest.update({
        where: { id: intakeId },
        data: { status: "CHECKED_IN" },
      });

      // b) Link patient to this facility and set triage status
      await tx.patient.update({
        where: { id: patient.id },
        data: {
          organizationId: resolvedOrgId,
          status: "ACTIVE",
          triageStatus: "WAITING_FOR_TRIAGE" as any,
          examStatus: "PENDING",
          chiefComplaint: intake.notes || patient.chiefComplaint || "Digital intake check-in",
        },
      });

      // c) Insert into triage queue (upsert to avoid duplicates)
      const existingQueue = await tx.queue.findFirst({ where: { patientId: patient.id, status: "WAITING" } });
      if (!existingQueue) {
        await tx.queue.create({
          data: {
            patientId: patient.id,
            status: "WAITING",
          },
        });
      }
    });

    revalidatePath("/reception");
    revalidatePath("/triage");
    revalidatePath("/receptionist");

    return { success: true, patientId: patient.id };
  } catch (error: any) {
    console.error("[confirmDigitalIntakeCheckIn] Error:", error);
    return { success: false, error: error.message || "Failed to process check-in." };
  }
}

/**
 * Fetches active screening questions and their options for a given organizationId.
 */
export async function getScreeningQuestions(organizationId: string) {
  try {
    if (!organizationId) {
      return { success: true, questions: [] };
    }
    const questions = await prisma.screeningQuestion.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        options: {
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        order: "asc",
      },
    });
    return { success: true, questions: JSON.parse(JSON.stringify(questions)) };
  } catch (error: any) {
    console.error("[getScreeningQuestions] Error:", error);
    return { success: false, error: error.message || "Failed to fetch screening questions." };
  }
}


