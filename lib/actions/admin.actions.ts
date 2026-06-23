"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_ROLES } from "@/lib/locales/enums";

// ─────────────────────────────────────────────────────────────────────────────
// Shared RBAC guard — throws immediately if the caller is not an admin.
// ─────────────────────────────────────────────────────────────────────────────
async function requireAdminSession(): Promise<{ userId: string; facilityId: string }> {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userId = cookieStore.get("userId")?.value;
  const facilityId = cookieStore.get("organizationId")?.value;

  if (
    !userRole ||
    !userId ||
    !facilityId ||
    !ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number])
  ) {
    throw new Error("Unauthorized Access Error: Administrator role required.");
  }

  return { userId, facilityId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared type exported for the UI layer.
// ─────────────────────────────────────────────────────────────────────────────
export type AccountType = "STAFF" | "PATIENT";

export interface DirectoryRecord {
  id: string;
  type: AccountType;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string; // ISO string — safe to pass from server to client
}

// ─────────────────────────────────────────────────────────────────────────────
// E.164 phone normalisation helper (mirrors patient.actions.ts logic).
// ─────────────────────────────────────────────────────────────────────────────
function normalizeToE164(raw: string): string | null {
  const stripped = raw.replace(/[\s\-().]/g, "");
  if (!stripped) return null;

  // Already a valid E.164 number
  if (/^\+\d{10,15}$/.test(stripped)) return stripped;

  // Ethiopian local formats
  if (/^09\d{8}$/.test(stripped)) return `+251${stripped.slice(1)}`;
  if (/^07\d{8}$/.test(stripped)) return `+251${stripped.slice(1)}`;
  if (/^9\d{8}$/.test(stripped))  return `+2519${stripped}`;
  if (/^7\d{8}$/.test(stripped))  return `+2517${stripped}`;
  if (/^251\d{9}$/.test(stripped)) return `+${stripped}`;

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORIGINAL ACTIONS (preserved)
// ─────────────────────────────────────────────────────────────────────────────

export async function getHospitalStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const totalPatientsToday = await prisma.patient.count({
    where: {
      createdAt: { gte: startOfDay }
    }
  });

  const wardSaturationRaw = await prisma.patient.groupBy({
    by: ["ward"],
    _count: { ward: true },
    where: {
      createdAt: { gte: startOfDay }
    }
  });

  const wardSaturation = wardSaturationRaw
    .map((w) => ({ ward: w.ward, count: w._count.ward }))
    .sort((a, b) => b.count - a.count);

  const queues = await prisma.queue.findMany({
    where: {
      status: { in: ["IN_PROGRESS", "COMPLETED"] },
      createdAt: { gte: startOfDay }
    },
    select: { checkInTime: true, updatedAt: true }
  });

  let totalWaitMs = 0;
  queues.forEach((q) => {
    totalWaitMs += q.updatedAt.getTime() - q.checkInTime.getTime();
  });
  const avgWaitMs = queues.length > 0 ? totalWaitMs / queues.length : 0;
  const avgWaitMinutes = Math.floor(avgWaitMs / 60000);

  return { totalPatientsToday, wardSaturation, avgWaitMinutes };
}

export async function getLiveActivity() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [queues, prescriptions, investigations, patients] = await Promise.all([
    prisma.queue.findMany({
      take: 10,
      where: { updatedAt: { gte: startOfDay } },
      orderBy: { updatedAt: "desc" },
      include: { patient: { select: { fullName: true } } }
    }),
    prisma.prescription.findMany({
      take: 10,
      where: { updatedAt: { gte: startOfDay } },
      orderBy: { updatedAt: "desc" },
      include: { patient: { select: { fullName: true } } }
    }),
    prisma.investigation.findMany({
      take: 10,
      where: { updatedAt: { gte: startOfDay } },
      orderBy: { updatedAt: "desc" },
      include: { patient: { select: { fullName: true } } }
    }),
    prisma.patient.findMany({
      take: 10,
      where: { createdAt: { gte: startOfDay } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const activity: Array<{ date: Date; title: string; description: string }> = [];

  queues.forEach((q) => {
    if (q.status === "COMPLETED")
      activity.push({ date: q.updatedAt, title: "Doctor finished visit", description: `Visit completed for ${q.patient.fullName}` });
    else if (q.status === "IN_PROGRESS")
      activity.push({ date: q.updatedAt, title: "Patient called", description: `Doctor called ${q.patient.fullName}` });
  });

  prescriptions.forEach((p) => {
    if (p.status === "DISPENSED")
      activity.push({ date: p.updatedAt, title: "Prescription Dispensed", description: `Pharmacist dispensed ${p.drugName} for ${p.patient.fullName}` });
    else
      activity.push({ date: p.createdAt, title: "Prescription Ordered", description: `Doctor ordered ${p.drugName} for ${p.patient.fullName}` });
  });

  investigations.forEach((i) => {
    if (i.status === "COMPLETED")
      activity.push({ date: i.updatedAt, title: "Lab Results Ready", description: `Results uploaded for ${i.testName} (${i.patient.fullName})` });
    else
      activity.push({ date: i.createdAt, title: "Lab Order Placed", description: `Test ${i.testName} requested for ${i.patient.fullName}` });
  });

  patients.forEach((p) => {
    activity.push({ date: p.createdAt, title: "Patient Registered", description: `New registration: ${p.fullName} (${p.ward.replace(/_/g, " ")})` });
  });

  activity.sort((a, b) => b.date.getTime() - a.date.getTime());

  return JSON.parse(JSON.stringify(activity.slice(0, 10)));
}

export async function getTriageHeatmap() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const patients = await prisma.patient.findMany({
    where: { createdAt: { gte: startOfDay }, chiefComplaint: { not: null } },
    select: { chiefComplaint: true }
  });

  const keywordCounts: Record<string, number> = {};
  const commonKeywords = ["chest","pain","fever","cough","breath","blood","headache","stomach","accident","unconscious","severe","vomiting","nausea","dizzy","injury"];

  patients.forEach((p) => {
    if (p.chiefComplaint) {
      const lower = p.chiefComplaint.toLowerCase();
      const seen = new Set<string>();
      commonKeywords.forEach((kw) => {
        if (lower.includes(kw) && !seen.has(kw)) {
          keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
          seen.add(kw);
        }
      });
    }
  });

  return Object.entries(keywordCounts)
    .map(([keyword, count]) => ({ keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1), count }))
    .sort((a, b) => b.count - a.count);
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW ACTIONS — Administrative User Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Local Facility Summary Matrix Counters
 */
export async function getFacilityOperationalMetrics(facilityId: string) {
  try {
    const [totalStaff, activeClinicalWorkers, localConsultations] = await Promise.all([
      // Total Registered Facility Staff
      prisma.user.count({
        where: { organizationId: facilityId }
      }),
      // Active Clinical Workers (GENERAL_PRACTITIONER, CLINICAL_NURSE, PHARMACIST)
      prisma.user.count({
        where: {
          organizationId: facilityId,
          isActive: true,
          role: {
            in: ["GENERAL_PRACTITIONER", "CLINICAL_NURSE", "PHARMACIST"]
          }
        }
      }),
      // Local Patient Consultations Count (Clinical examinations)
      prisma.clinicalExamination.count({
        where: { organizationId: facilityId }
      })
    ]);

    return { totalStaff, activeClinicalWorkers, localConsultations };
  } catch (err) {
    console.error("Error fetching facility operational metrics:", err);
    return { totalStaff: 0, activeClinicalWorkers: 0, localConsultations: 0 };
  }
}

/**
 * Returns a polymorphic combined directory of clinical staff (User) and
 * patients (Patient) belonging to the administrator's organization.
 * Supports optional text search against name, phone, and email indices.
 */
export async function getAdministrativeDirectory(
  searchQuery?: string
): Promise<DirectoryRecord[]> {
  const { facilityId } = await requireAdminSession();

  const q = searchQuery?.trim();

  const [staffList, patientList] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId: facilityId,
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        fullName: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.patient.findMany({
      where: {
        organizationId: facilityId,
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phoneNumber: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const staffRecords: DirectoryRecord[] = staffList.map((u) => ({
    id: u.id,
    type: "STAFF",
    name: (u.fullName ?? [u.firstName, u.lastName].filter(Boolean).join(" ")) || "—",
    email: u.email,
    phone: null,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));

  const patientRecords: DirectoryRecord[] = patientList.map((p) => ({
    id: p.id,
    type: "PATIENT",
    name: p.fullName,
    email: p.email ?? null,
    phone: p.phoneNumber ?? null,
    role: "CITIZEN",
    isActive: (p.status ?? "ACTIVE") === "ACTIVE",
    createdAt: p.createdAt.toISOString(),
  }));

  return JSON.parse(JSON.stringify([...staffRecords, ...patientRecords]));
}

/**
 * Modifies the primary contact fields of the targeted profile record.
 * Phone is validated and normalised to E.164 before persistence.
 * For STAFF accounts, only name and email are updated (no phone field on User model).
 */
export async function updateUserProfileFields(
  targetId: string,
  updatedData: { name: string; email: string; phone: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { facilityId } = await requireAdminSession();

    const { name, email, phone } = updatedData;

    if (!name.trim()) return { success: false, error: "Name is required." };
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "A valid email address is required." };
    }

    // ── Tenant boundary verification ──────────────────────────────────────────
    const globalStaff = await prisma.user.findUnique({
      where: { id: targetId },
      select: { organizationId: true }
    });

    if (globalStaff) {
      if (globalStaff.organizationId !== facilityId) {
        throw new Error("Unauthorized Access Error: Cross-tenant operation detected. Administrative actions are restricted to your own facility context.");
      }

      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ") || "";

      await prisma.user.update({
        where: { id: targetId },
        data: { fullName: name.trim(), firstName, lastName, email: email.trim() },
      });

      revalidatePath("/admin/users");
      return { success: true };
    }

    const globalPatient = await prisma.patient.findUnique({
      where: { id: targetId },
      select: { organizationId: true, phoneNumber: true }
    });

    if (globalPatient) {
      if (globalPatient.organizationId !== facilityId) {
        throw new Error("Unauthorized Access Error: Cross-tenant operation detected. Administrative actions are restricted to your own facility context.");
      }

      let normalizedPhone: string | null = null;
      if (phone.trim()) {
        normalizedPhone = normalizeToE164(phone.trim());
        if (!normalizedPhone) {
          return { success: false, error: "Phone number could not be formatted to E.164. Use +251XXXXXXXXX or 09XXXXXXXX." };
        }
      }

      await prisma.patient.update({
        where: { id: targetId },
        data: {
          fullName: name.trim(),
          email: email.trim() || null,
          phoneNumber: normalizedPhone ?? globalPatient.phoneNumber,
        },
      });

      revalidatePath("/admin/users");
      return { success: true };
    }

    return { success: false, error: "Profile record not found." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[updateUserProfileFields]", message);
    if (err instanceof Error && err.message.includes("Cross-tenant operation detected")) {
      throw err;
    }
    return { success: false, error: message };
  }
}

/**
 * Flips the operational active state of a Staff or Patient account.
 * For Staff: mutates User.isActive.
 * For Patients: mutates Patient.status ("ACTIVE" | "INACTIVE").
 */
export async function toggleAccountState(
  targetId: string,
  activeState: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { facilityId } = await requireAdminSession();

    const globalStaff = await prisma.user.findUnique({
      where: { id: targetId },
      select: { organizationId: true }
    });

    if (globalStaff) {
      if (globalStaff.organizationId !== facilityId) {
        throw new Error("Unauthorized Access Error: Cross-tenant operation detected. Administrative actions are restricted to your own facility context.");
      }

      await prisma.user.update({
        where: { id: targetId },
        data: { isActive: activeState },
      });
      revalidatePath("/admin/users");
      return { success: true };
    }

    const globalPatient = await prisma.patient.findUnique({
      where: { id: targetId },
      select: { organizationId: true }
    });

    if (globalPatient) {
      if (globalPatient.organizationId !== facilityId) {
        throw new Error("Unauthorized Access Error: Cross-tenant operation detected. Administrative actions are restricted to your own facility context.");
      }

      await prisma.patient.update({
        where: { id: targetId },
        data: { status: activeState ? "ACTIVE" : "INACTIVE" },
      });
      revalidatePath("/admin/users");
      return { success: true };
    }

    return { success: false, error: "Profile record not found." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[toggleAccountState]", message);
    if (err instanceof Error && err.message.includes("Cross-tenant operation detected")) {
      throw err;
    }
    return { success: false, error: message };
  }
}

/**
 * Checks for active clinical dependencies before deletion.
 * If any child records exist across core healthcare collections, the purge is
 * aborted and a descriptive error is returned.
 * If no dependencies are found (e.g., test or duplicate data), the record is
 * hard-deleted and the path is revalidated.
 */
export async function safePurgeAccount(
  targetId: string
): Promise<{ success: boolean; blocked?: boolean; error?: string }> {
  try {
    const { facilityId } = await requireAdminSession();

    // ── Resolve as Staff User ──────────────────────────────────────────────
    const globalStaff = await prisma.user.findUnique({
      where: { id: targetId },
      select: { organizationId: true }
    });

    if (globalStaff) {
      if (globalStaff.organizationId !== facilityId) {
        throw new Error("Unauthorized Access Error: Cross-tenant operation detected. Administrative actions are restricted to your own facility context.");
      }

      const [investigations, auditLogs, diagnosticOrders, referralSummaries, verificationAttempts] =
        await Promise.all([
          prisma.investigation.count({ where: { doctorId: targetId } }),
          prisma.medicalAuditLog.count({ where: { userId: targetId } }),
          prisma.diagnosticOrder.count({ where: { referredByUserId: targetId } }),
          prisma.referralSummary.count({ where: { issuedByUserId: targetId } }),
          prisma.verificationAttempt.count({ where: { userId: targetId } }),
        ]);

      const total =
        investigations + auditLogs + diagnosticOrders + referralSummaries + verificationAttempts;

      if (total > 0) {
        return {
          success: false,
          blocked: true,
          error:
            `This staff profile has ${total} linked clinical record(s) across ${[
              investigations > 0 && `${investigations} investigation order(s)`,
              auditLogs > 0 && `${auditLogs} audit log(s)`,
              diagnosticOrders > 0 && `${diagnosticOrders} diagnostic order(s)`,
              referralSummaries > 0 && `${referralSummaries} referral summary(s)`,
              verificationAttempts > 0 && `${verificationAttempts} verification attempt(s)`,
            ]
              .filter(Boolean)
              .join(", ")}. It cannot be permanently deleted. Deactivate the account instead.`,
        };
      }

      await prisma.user.delete({ where: { id: targetId } });
      revalidatePath("/admin/users");
      return { success: true };
    }

    // ── Resolve as Patient ─────────────────────────────────────────────────
    const globalPatient = await prisma.patient.findUnique({
      where: { id: targetId },
      select: { organizationId: true }
    });

    if (globalPatient) {
      if (globalPatient.organizationId !== facilityId) {
        throw new Error("Unauthorized Access Error: Cross-tenant operation detected. Administrative actions are restricted to your own facility context.");
      }

      const [
        investigations,
        prescriptions,
        labRequests,
        appointments,
        queues,
        verificationAttempts,
        vitals,
        referrals,
        journals,
        screenings,
        medicalRecords,
      ] = await Promise.all([
        prisma.investigation.count({ where: { patientId: targetId } }),
        prisma.prescription.count({ where: { patientId: targetId } }),
        prisma.labRequest.count({ where: { patientId: targetId } }),
        prisma.appointment.count({ where: { patientId: targetId } }),
        prisma.queue.count({ where: { patientId: targetId } }),
        prisma.verificationAttempt.count({ where: { patientId: targetId } }),
        prisma.vitals.count({ where: { patientId: targetId } }),
        prisma.referral.count({ where: { patientId: targetId } }),
        prisma.patientJournal.count({ where: { patientId: targetId } }),
        prisma.screening.count({ where: { patientId: targetId } }),
        prisma.medicalRecord.count({ where: { patientId: targetId } }),
      ]);

      const total =
        investigations +
        prescriptions +
        labRequests +
        appointments +
        queues +
        verificationAttempts +
        vitals +
        referrals +
        journals +
        screenings +
        medicalRecords;

      if (total > 0) {
        return {
          success: false,
          blocked: true,
          error:
            `This patient profile has ${total} linked clinical record(s) across ${[
              investigations > 0 && `${investigations} clinical note(s)`,
              prescriptions > 0 && `${prescriptions} prescription(s)`,
              labRequests > 0 && `${labRequests} lab result(s)`,
              appointments > 0 && `${appointments} appointment(s)`,
              queues > 0 && `${queues} triage/queue entry(s)`,
              vitals > 0 && `${vitals} vital record(s)`,
              referrals > 0 && `${referrals} referral(s)`,
              screenings > 0 && `${screenings} screening(s)`,
              medicalRecords > 0 && `${medicalRecords} medical record(s)`,
            ]
              .filter(Boolean)
              .join(", ")}. Permanently deleting this profile is not allowed. Deactivate the account instead to block access while preserving medical history.`,
        };
      }

      await prisma.patient.delete({ where: { id: targetId } });
      revalidatePath("/admin/users");
      return { success: true };
    }

    return { success: false, error: "Profile record not found." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("[safePurgeAccount]", message);
    if (err instanceof Error && err.message.includes("Cross-tenant operation detected")) {
      throw err;
    }
    return { success: false, error: message };
  }
}
