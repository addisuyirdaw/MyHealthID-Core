"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Mocks fetching records from a legacy hospital server (e.g., SmartCare)
 * and normalizes the data into standard Prisma records so the AI Triage
 * and Doctor Dashboards can read them naturally.
 */
export async function syncLegacyData(patientId: string, providerName: string) {
  try {
    // 1. Simulate network delay from legacy server (3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 2. Ensure patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new Error("Patient not found.");
    }

    // 3. Inject mock historical Vitals (Normalized data)
    await prisma.vitals.create({
      data: {
        patientId: patientId,
        bp: "160/100",
        pulse: 105,
        temp: 36.8,
        spO2: 99,
        rr: 18,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
    });

    // 4. Inject a mock historical Investigation
    await prisma.investigation.create({
      data: {
        patientId: patientId,
        testName: "Complete Blood Count (CBC)",
        status: "COMPLETED",
        result: "WBC: 6.5, RBC: 4.8, Hgb: 14.2, Plt: 250",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Inject a mock historical Prescription
    await prisma.prescription.create({
      data: {
        patientId: patientId,
        drugName: "Amoxicillin 500mg",
        dosage: "500mg",
        frequency: "TID",
        duration: "7 days",
        status: "DISPENSED",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Revalidate paths so the UI updates automatically
    revalidatePath("/doctor/dashboard");
    revalidatePath(`/patients/${patientId}/clinical-records`);

    return { success: true, message: `Successfully synced records from ${providerName}.` };
  } catch (error: any) {
    console.error(`[syncLegacyData] Error syncing with ${providerName}:`, error.message);
    return { success: false, error: error.message || "Failed to sync legacy data." };
  }
}
