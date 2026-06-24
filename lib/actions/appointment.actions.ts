"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkInToQueue } from "@/lib/actions/queue.actions";
import { CROSS_FACILITY } from "@/lib/utils/tenantContext";

/**
 * bookAppointment
 * Enforces rate limit (< 2 pending or scheduled appointments) and creates a new appointment.
 */
export async function bookAppointment(data: {
  patientId: string;
  facilityId: string;
  department: string;
  dateTime: string; // ISO date string
}): Promise<{ success: boolean; appointment?: any; error?: string }> {
  try {
    const { patientId, facilityId, department, dateTime } = data;
    if (!patientId || !facilityId || !department || !dateTime) {
      throw new Error("Missing required fields for booking.");
    }

    // 1. Check active safeguard limit: count existing appointments in PENDING_CONFIRMATION or SCHEDULED state
    const pendingCount = await prisma.appointment.count({
      where: {
        patientId,
        status: {
          in: ["PENDING_CONFIRMATION", "SCHEDULED"],
        },
      },
    });

    if (pendingCount >= 2) {
      return {
        success: false,
        error: "Spam Limit Reached: You have reached the maximum limit of 2 active (pending or scheduled) appointment requests.",
      };
    }

    const appDate = new Date(dateTime);
    if (isNaN(appDate.getTime())) {
      throw new Error("Invalid date-time format.");
    }

    // 2. Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        facilityId,
        department,
        dateTime: appDate,
        status: "PENDING_CONFIRMATION",
      },
    });

    revalidatePath(`/citizen/appointments`);
    return { success: true, appointment: JSON.parse(JSON.stringify(appointment)) };
  } catch (error: any) {
    console.error("[bookAppointment] Error:", error);
    return { success: false, error: error.message || "Failed to book appointment." };
  }
}

/**
 * bookAppointmentFromRegistration
 *
 * Used exclusively by the unified registration + appointment booking flow.
 * Key differences from `bookAppointment`:
 *  - `doctorId` is optional. When absent, the record is saved as a general ward-pool entry
 *    (doctorId = null, status = "PENDING_CONFIRMATION") so it surfaces in the triage queue view.
 *  - `wardId` is optional but recommended; used for the queue-flood guard.
 *  - `emergencyOverride` (boolean): when true the appointment is flagged as emergency priority
 *    and dropped directly into the active Emergency Ward unassigned queue.
 *  - Enforces: max 5 unassigned general-pool appointments per ward per requested hour slot
 *    to prevent queue flooding (skipped when emergencyOverride is true — emergencies bypass).
 */
export async function bookAppointmentFromRegistration(data: {
  patientId: string;
  facilityId: string;
  department: string;
  dateTime: string; // ISO date string (date + hour)
  chiefComplaints?: string;
  doctorId?: string | null;
  wardId?: string | null;
  /** When true: bypasses flood guard, forces Emergency Ward, sets emergencyFlag on record. */
  emergencyOverride?: boolean;
  acuityOverridden?: boolean;
}): Promise<{ success: boolean; appointment?: any; error?: string; floodGuard?: boolean }> {
  try {
    const { patientId, facilityId, department, dateTime, chiefComplaints, doctorId, wardId, emergencyOverride, acuityOverridden } = data;

    if (!patientId || !facilityId || !department || !dateTime) {
      return { success: false, error: "Missing required fields for booking." };
    }

    const appDate = new Date(dateTime);
    if (isNaN(appDate.getTime())) {
      return { success: false, error: "Invalid date-time format." };
    }

    // ─── Ward-level queue flood guard ────────────────────────────────────────
    // Emergency overrides bypass flood protection — critical patients are never
    // turned away due to queue capacity constraints.
    if (!emergencyOverride && !doctorId && wardId) {
      const slotWindowStart = new Date(appDate);
      slotWindowStart.setUTCMinutes(0, 0, 0);
      const slotWindowEnd = new Date(slotWindowStart.getTime() + 60 * 60 * 1000); // +1 hour

      const unassignedCount = await prisma.appointment.count({
        where: {
          assignedWardId: wardId,
          doctorId: null,
          dateTime: { gte: slotWindowStart, lt: slotWindowEnd },
          status: { not: "CANCELLED" },
        },
      });

      if (unassignedCount >= 5) {
        return {
          success: false,
          floodGuard: true,
          error:
            "This time slot is at capacity for the General Ward Pool (max 5 patients/hour). Please choose a new time window.",
        };
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    let resolvedWardId = wardId;
    let resolvedDepartment = department;
    let metadataWarnings: string[] = [];

    if (emergencyOverride) {
      // Inject database lookup step: Query ClinicalWard where facilityId == facilityId AND type == 'EMERGENCY'
      const emergencyWard = await prisma.clinicalWard.findFirst({
        where: {
          facilityId: facilityId,
          type: "EMERGENCY",
        },
      });

      if (emergencyWard) {
        resolvedWardId = emergencyWard.id;
        resolvedDepartment = emergencyWard.name;
      } else {
        const fallbackMsg = `No specific EMERGENCY type ward configured for facility ID ${facilityId}. Gracefully falling back to facility's primary general reception queue.`;
        console.warn(`[bookAppointmentFromRegistration] Warning: ${fallbackMsg}`);
        metadataWarnings.push(fallbackMsg);
        
        // Fallback: Bind to general pool or no ward ID (lands in reception)
        resolvedWardId = null;
        resolvedDepartment = "General Reception Queue";
      }
    }

    const resolvedDoctorId = emergencyOverride ? null : (doctorId || null);

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        facilityId,
        department: resolvedDepartment,
        dateTime: appDate,
        // Emergency override records are immediately PENDING so they surface in
        // the real-time unassigned Emergency Ward queue view.
        status: "PENDING_CONFIRMATION",
        chiefComplaints: chiefComplaints || null,
        doctorId: resolvedDoctorId,
        assignedWardId: resolvedWardId || null,
        // Store emergency flag on the appointment for queue-priority sorting
        ...(emergencyOverride ? { emergencyFlag: true } : {}),
        metadata: {
          ...(acuityOverridden ? { acuityOverridden: true } : {}),
          ...(metadataWarnings.length > 0 ? { warnings: metadataWarnings } : {}),
        },
      } as any,
    });

    revalidatePath(`/citizen/appointments`);
    revalidatePath(`/receptionist`);
    // Revalidate the live emergency ward queue so the new record appears instantly
    if (emergencyOverride) revalidatePath(`/receptionist/emergency-queue`);
    return { success: true, appointment: JSON.parse(JSON.stringify(appointment)) };
  } catch (error: any) {
    console.error("[bookAppointmentFromRegistration] Error:", error);
    return { success: false, error: error.message || "Failed to book appointment." };
  }
}

/**
 * getAppointmentsForCitizen
 * Fetches appointment history for a citizen.
 */
export async function getAppointmentsForCitizen(patientId: string): Promise<{ success: boolean; appointments?: any[]; error?: string }> {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId,
      },
      include: {
        facility: {
          select: {
            name: true,
            region: true,
            zone: true,
          },
        },
      },
      orderBy: {
        dateTime: "desc",
      },
    });

    return { success: true, appointments: JSON.parse(JSON.stringify(appointments)) };
  } catch (error: any) {
    console.error("[getAppointmentsForCitizen] Error:", error);
    return { success: false, error: error.message || "Failed to fetch appointments." };
  }
}

/**
 * getPendingAppointmentsForFacility
 * Fetches pending appointments for receptionist workspace.
 * The tenant filtering is handled automatically by prisma.ts.
 */
export async function getPendingAppointmentsForFacility(): Promise<{ success: boolean; appointments?: any[]; error?: string }> {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: "PENDING_CONFIRMATION",
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            healthId: true,
            sex: true,
            age: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {
        dateTime: "asc",
      },
    });

    return { success: true, appointments: JSON.parse(JSON.stringify(appointments)) };
  } catch (error: any) {
    console.error("[getPendingAppointmentsForFacility] Error:", error);
    return { success: false, error: error.message || "Failed to fetch pending requests." };
  }
}

/**
 * updateAppointmentStatus
 * Scoped receptionist action to update appointment status.
 * Engages a sequential logic for "ARRIVED" to check-in patient to queue.
 */
export async function updateAppointmentStatus(appointmentId: string, status: "SCHEDULED" | "CANCELLED" | "ARRIVED" | "TRIAGED" | "IN_CONSULTATION"): Promise<{ success: boolean; error?: string }> {
  try {
    if (status === "ARRIVED") {
      // Run sequentially inside a safe transaction context
      return await prisma.$transaction(async (tx) => {
        // Fetch the appointment first (using CROSS_FACILITY to ensure access in case of organization transitions)
        const app = await tx.appointment.findUnique({
          where: {
            ...CROSS_FACILITY,
            id: appointmentId,
          } as any,
        });

        if (!app) {
          throw new Error("Appointment not found.");
        }

        // a) Set Appointment status to ARRIVED
        await tx.appointment.update({
          where: {
            ...CROSS_FACILITY,
            id: appointmentId,
          } as any,
          data: {
            status: "ARRIVED",
          },
        });

        // b) Mutate target Patient entity: organizationId = facilityId, status = ACTIVE, triageStatus = WAITING_FOR_TRIAGE
        await tx.patient.update({
          where: {
            ...CROSS_FACILITY,
            id: app.patientId,
          } as any,
          data: {
            organizationId: app.facilityId,
            status: "ACTIVE",
            triageStatus: "WAITING_FOR_TRIAGE",
            examStatus: "PENDING",
          },
        });

        // c) Call checkInToQueue
        const queueResult = await checkInToQueue(app.patientId);
        if (!queueResult.success) {
          throw new Error(queueResult.message || "Failed to register patient in triage queue.");
        }

        return { success: true };
      });
    } else {
      // Normal status update (SCHEDULED, CANCELLED, TRIAGED, or IN_CONSULTATION)
      await prisma.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          status: status as any,
        },
      });

      revalidatePath(`/citizen/appointments`);
      revalidatePath(`/receptionist`);
      return { success: true };
    }
  } catch (error: any) {
    console.error("[updateAppointmentStatus] Error:", error);
    return { success: false, error: error.message || "Failed to update appointment status." };
  }
}

/**
 * transitionToConsultation
 * Transitions an appointment to IN_CONSULTATION and registers the doctor.
 */
export async function transitionToConsultation(appointmentId: string, doctorId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!appointmentId || !doctorId) {
      throw new Error("Missing appointmentId or doctorId.");
    }

    await prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        status: "IN_CONSULTATION",
        doctorId,
      },
    });

    revalidatePath(`/doctor/dashboard`);
    return { success: true };
  } catch (error: any) {
    console.error("[transitionToConsultation] Error:", error);
    return { success: false, error: error.message || "Failed to transition appointment." };
  }
}

/**
 * rescheduleAppointment
 * Updates appointment date and time, and resets status to PENDING_CONFIRMATION.
 */
export async function rescheduleAppointment(appointmentId: string, dateTime: string): Promise<{ success: boolean; appointment?: any; error?: string }> {
  try {
    if (!appointmentId || !dateTime) {
      throw new Error("Missing required fields for rescheduling.");
    }
    const appDate = new Date(dateTime);
    if (isNaN(appDate.getTime())) {
      throw new Error("Invalid date-time format.");
    }

    const appointment = await prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        dateTime: appDate,
        status: "PENDING_CONFIRMATION",
      },
    });

    revalidatePath(`/citizen/appointments`);
    revalidatePath(`/receptionist`);
    return { success: true, appointment: JSON.parse(JSON.stringify(appointment)) };
  } catch (error: any) {
    console.error("[rescheduleAppointment] Error:", error);
    return { success: false, error: error.message || "Failed to reschedule appointment." };
  }
}
