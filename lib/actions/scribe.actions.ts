"use server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/session";
import { cookies } from "next/headers";

export async function savePatientScribeDraft(patientId: string, draft: any) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("citizenSessionToken")?.value;
    if (!sessionToken) return { success: false, error: "Unauthorized" };
    
    const payload = verifyToken(sessionToken);
    if (!payload || payload.role !== "CITIZEN" || payload.patientId !== patientId) {
      return { success: false, error: "Unauthorized" };
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) return { success: false, error: "Patient not found" };

    // We store the structured draft in PatientJournal, using 'mood' as a type identifier
    await prisma.patientJournal.create({
      data: {
        patientId,
        mood: "AI_SCRIBE_DRAFT",
        symptoms: JSON.stringify(draft)
      }
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save draft" };
  }
}
