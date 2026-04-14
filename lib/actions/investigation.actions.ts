"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createLabOrder(data: {
  patientId: string;
  testName: string;
  category: string;
  clinicalNote: string;
}) {
  try {
    const investigation = await prisma.investigation.create({
      data: {
        patient: {
          connect: { id: data.patientId }
        },
        // We append the clinical note to the testName or save in department since schema lacks clinicalNote
        testName: data.testName,
        category: data.category,
        department: data.clinicalNote ? `Note: ${data.clinicalNote}` : null,
        status: "PENDING",
      },
    });
    revalidatePath("/dashboard");
    revalidatePath("/lab");
    return JSON.parse(JSON.stringify(investigation));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR: Failed to order investigation", error.message);
    throw new Error("Failed to order investigation.");
  }
}

export async function getPendingInvestigations() {
  try {
    const investigations = await prisma.investigation.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        patient: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    return JSON.parse(JSON.stringify(investigations));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR: Failed to fetch pending investigations", error.message);
    throw new Error("Failed to fetch pending investigations.");
  }
}

export async function updateLabResult(data: {
  investigationId: string;
  resultValue: string;
  technicianComments?: string;
  technicianName?: string;
}) {
  try {
    // Combine everything into the existing string `result` field constraint
    let combinedResult = data.resultValue;
    if (data.technicianComments) {
      combinedResult += `\nComments: ${data.technicianComments}`;
    }
    if (data.technicianName) {
      combinedResult += `\nTech: ${data.technicianName}`;
    }

    const investigation = await prisma.investigation.update({
      where: { id: data.investigationId },
      data: {
        result: combinedResult,
        status: "COMPLETED",
      },
      include: { patient: true }
    });

    const p = investigation.patient;
    const identifier = p.nationalId || p.healthId;
    const phone = p.emergencyContactPhone || "Unregistered Number";
    
    console.log(`\n======================================================`);
    console.log(`[SMS Simulation] To [${phone}]: Hi dear ${identifier}, your lab results have been finalized. Your visit for today is complete.`);
    console.log(`======================================================\n`);

    await prisma.patient.update({
      where: { id: p.id },
      data: { examStatus: "COMPLETED" }
    });

    revalidatePath("/dashboard");
    revalidatePath("/lab");
    return JSON.parse(JSON.stringify(investigation));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR: Failed to submit result", error.message);
    throw new Error("Failed to submit lab result.");
  }
}

