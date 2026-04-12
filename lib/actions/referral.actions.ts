"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createReferral(data: { patientId: string; reason: string; destinationFacility: string }) {
  try {
    const referral = await prisma.referral.create({
      data: {
        patientId: data.patientId,
        reason: data.reason,
        destinationFacility: data.destinationFacility,
      },
    });

    await prisma.patient.update({
      where: { id: data.patientId },
      data: { status: "REFERRED_OUT" },
    });

    revalidatePath("/dashboard");
    return JSON.parse(JSON.stringify(referral));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR: Failed to create referral", error.message);
    throw new Error("Failed to create referral.");
  }
}
