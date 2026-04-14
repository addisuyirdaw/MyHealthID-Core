"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function checkInToQueue(patientId: string) {
  try {
    // Check if patient already has an active queue waiting
    const existingWaiting = await prisma.queue.findFirst({
      where: {
        patientId,
        status: "WAITING",
      },
    });

    if (existingWaiting) {
      return { success: false, message: "Patient is already in the queue waiting." };
    }

    const queue = await prisma.queue.create({
      data: {
        patientId,
        status: "WAITING",
      },
    });

    revalidatePath(`/patients/${patientId}/dashboard`);
    return { success: true, queue };
  } catch (error: any) {
    console.error("Queue Check-In Error:", error);
    return { success: false, message: error.message || "Failed to check-in to queue." };
  }
}

export async function getLiveQueueStatus(patientId: string) {
  try {
    // Find the current active or recent queue for this patient
    const activeQueue = await prisma.queue.findFirst({
      where: {
        patientId,
        status: { in: ["WAITING", "IN_PROGRESS", "COMPLETED"] },
      },
      orderBy: { checkInTime: "desc" },
    });

    if (!activeQueue) {
      return { inQueue: false };
    }

    // Calculate queue position: number of people waiting who checked in earlier
    const peopleAheadCount = await prisma.queue.count({
      where: {
        status: "WAITING",
        checkInTime: {
          lt: activeQueue.checkInTime,
        },
      },
    });

    const queuePosition = peopleAheadCount + 1; // 1-indexed position
    const estimatedWait = queuePosition * 15; // 15 mins per person

    return {
      inQueue: true,
      queuePosition,
      estimatedWait,
      checkInTime: activeQueue.checkInTime,
      status: activeQueue.status,
    };
  } catch (error: any) {
    console.error("Get Live Queue Status Error:", error);
    return { inQueue: false, error: "Failed to fetch status" };
  }
}

export async function callNextPatient(patientId: string) {
  try {
    // Mark patient's queue status as IN_PROGRESS
    const activeQueue = await prisma.queue.findFirst({
      where: { patientId, status: "WAITING" },
      orderBy: { checkInTime: "desc" },
    });

    if (activeQueue) {
      await prisma.queue.update({
        where: { id: activeQueue.id },
        data: { status: "IN_PROGRESS" }
      });
    }

    // Mark patient's examStatus
    await prisma.patient.update({
      where: { id: patientId },
      data: { examStatus: "IN_PROGRESS" }
    });

    revalidatePath("/doctor/dashboard");
    revalidatePath(`/doctor/patient/${patientId}`);
    
    return { success: true, message: "Patient called in via SMS notification successfully!" };
  } catch (error: any) {
    console.error("Call Next Patient Error:", error);
    return { success: false, message: "Failed to call next patient." };
  }
}

export async function finishPatientVisit(patientId: string) {
  try {
    // Ensure queues are marked COMPLETED
    await prisma.queue.updateMany({
      where: { patientId, status: { in: ["WAITING", "IN_PROGRESS"] } },
      data: { status: "COMPLETED" }
    });

    // Mark patient as discharged from active queue
    await prisma.patient.update({
      where: { id: patientId },
      data: { 
        examStatus: "EXAMINATION_COMPLETE",
        status: "DISCHARGED"
      }
    });

    revalidatePath("/doctor/dashboard");
    return { success: true, message: "Patient visit marked as finished." };
  } catch (error: any) {
    console.error("Finish Visit Error:", error);
    return { success: false, message: "Failed to finish visit." };
  }
}
