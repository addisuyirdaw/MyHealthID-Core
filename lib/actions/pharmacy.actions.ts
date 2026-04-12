"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPrescription(data: { patientId: string; drugName: string; dosage: string; frequency: string; duration: string; notes?: string }) {
  try {
    const prescription = await prisma.prescription.create({
      data: {
        patientId: data.patientId,
        drugName: data.drugName,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        notes: data.notes,
        status: "PENDING",
      },
    });

    await prisma.patient.update({
      where: { id: data.patientId },
      data: { examStatus: "READY_FOR_PHARMACY" },
    });

    revalidatePath("/dashboard");
    revalidatePath("/pharmacy");
    return JSON.parse(JSON.stringify(prescription));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR: Failed to create prescription", error.message);
    throw new Error("Failed to create prescription.");
  }
}

export async function getReadyForPharmacyPatients() {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        examStatus: "READY_FOR_PHARMACY",
      },
      include: {
        prescriptions: {
          where: { status: "PENDING" }
        }
      },
      orderBy: {
        updatedAt: "asc",
      },
    });
    return JSON.parse(JSON.stringify(patients));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR: Failed to fetch pharmacy patients", error.message);
    throw new Error("Failed to fetch pharmacy patients.");
  }
}

export async function dispensePrescription(id: string) {
  try {
    const prescription = await prisma.prescription.update({
      where: { id },
      data: {
        status: "DISPENSED",
      },
      include: { patient: true }
    });

    const p = prescription.patient;
    const identifier = p.nationalId || p.healthId;
    const phone = p.emergencyContactPhone || "Unregistered Number";

    console.log(`\n======================================================`);
    console.log(`[SMS] To [${phone}]: Dear ${identifier}, your medication is ready at the pharmacy. Please collect.`);
    console.log(`======================================================\n`);

    await prisma.patient.update({
      where: { id: p.id },
      data: { examStatus: "COMPLETED" }
    });

    revalidatePath("/dashboard");
    revalidatePath("/pharmacy");
    return JSON.parse(JSON.stringify(prescription));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR: Failed to dispense prescription", error.message);
    throw new Error("Failed to dispense prescription.");
  }
}
