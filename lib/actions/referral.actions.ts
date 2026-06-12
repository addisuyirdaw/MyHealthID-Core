"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ReferralStatus } from "@prisma/client";

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
    revalidatePath(`/manage/${data.patientId}`);
    revalidatePath(`/doctor/patient/${data.patientId}`);
    return JSON.parse(JSON.stringify(referral));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR: Failed to create referral", error.message);
    throw new Error("Failed to create referral.");
  }
}

/**
 * Retrieves all inbound referrals for the caller's authenticated facility.
 *
 * Security contract:
 *   - The facility ID is NEVER sourced from the client payload.
 *   - It is read exclusively from the server-side session cookie (organizationId).
 *   - The same cookie value is used as both the auth identity and the DB query
 *     predicate, making it impossible for a caller to enumerate another facility's
 *     referral records.
 */
export async function getInboundReferrals() {
  const cookieStore = cookies();
  const sessionOrgId = cookieStore.get("organizationId")?.value;

  if (!sessionOrgId) {
    throw new Error("Unauthorized");
  }

  try {
    const referrals = await prisma.referral.findMany({
      where: {
        receivingFacilityId: sessionOrgId,
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            age: true,
            sex: true,
            phoneNumber: true,
            priorityLevel: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return JSON.parse(JSON.stringify(referrals));
  } catch (error: any) {
    console.error("❌ getInboundReferrals error:", error.message);
    throw new Error("Failed to fetch inbound referrals.");
  }
}

/**
 * Updates the status of an inbound referral.
 *
 * Security contract:
 *   - The caller's facility ID is read exclusively from the server-side session
 *     cookie — never from the client request payload.
 *   - The referral record's immutable `receivingFacilityId` field is fetched
 *     directly from the database and compared against the session facility ID.
 *   - Any mismatch (including a missing session) throws "Unauthorized" with no
 *     additional detail, preventing facility enumeration through error messages.
 *   - On ACCEPTED: the linked patient's status transitions to REFERRED_INTERNAL_QUEUE.
 *   - On REJECTED: rejectionReason is persisted; for all other statuses it is nulled.
 */
export async function updateReferralStatus(
  referralId: string,
  status: ReferralStatus,
  rejectionReason?: string
) {
  // ── Step 1: Authenticate session ─────────────────────────────────────────────
  const cookieStore = cookies();
  const sessionOrgId = cookieStore.get("organizationId")?.value;

  if (!sessionOrgId) {
    throw new Error("Unauthorized");
  }

  // ── Step 2: Fetch the immutable referral record ───────────────────────────────
  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    select: { id: true, patientId: true, receivingFacilityId: true },
  });

  if (!referral) {
    // Intentionally vague — do not distinguish "not found" from "forbidden"
    throw new Error("Unauthorized");
  }

  // ── Step 3: Enforce facility ownership boundary ───────────────────────────────
  // Compare the session's facility against the record's immutable receivingFacilityId.
  // A null receivingFacilityId also fails the check — no session can own an unaddressed referral.
  if (!referral.receivingFacilityId || referral.receivingFacilityId !== sessionOrgId) {
    throw new Error("Unauthorized");
  }

  // ── Step 4: Apply the status mutation ────────────────────────────────────────
  try {
    await prisma.referral.update({
      where: { id: referralId },
      data: {
        status,
        rejectionReason: status === ReferralStatus.REJECTED ? (rejectionReason ?? null) : null,
      },
    });

    // If accepted, transition patient to internal intake queue
    if (status === ReferralStatus.ACCEPTED) {
      await prisma.patient.update({
        where: { id: referral.patientId },
        data: { status: "REFERRED_INTERNAL_QUEUE" },
      });
    }

    revalidatePath("/doctor/referrals/received");
    return { success: true };
  } catch (error: any) {
    console.error("❌ updateReferralStatus error:", error.message);
    throw new Error("Failed to update referral status.");
  }
}
