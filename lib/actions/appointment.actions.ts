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
export async function updateAppointmentStatus(appointmentId: string, status: "SCHEDULED" | "CANCELLED" | "ARRIVED"): Promise<{ success: boolean; error?: string }> {
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
      // Normal status update (SCHEDULED or CANCELLED)
      await prisma.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          status,
        },
      });

      return { success: true };
    }
  } catch (error: any) {
    console.error("[updateAppointmentStatus] Error:", error);
    return { success: false, error: error.message || "Failed to update appointment status." };
  }
}
