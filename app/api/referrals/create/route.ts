import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, reason, destinationFacility, aiOverrideLogged, receivingFacilityId } = body;

    if (!patientId || !reason || !destinationFacility) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Verify patient exists and include vitals for the summary snapshot
    const patientExists = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        vitals: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!patientExists) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    const cookieStore = cookies();
    const userOrgId = cookieStore.get("organizationId")?.value;
    const userId = cookieStore.get("userId")?.value;

    // Transaction pipeline: create referral & update patient status
    const [referral] = await prisma.$transaction([
      prisma.referral.create({
        data: {
          patientId,
          reason,
          destinationFacility,
          aiOverrideLogged: Boolean(aiOverrideLogged),
          receivingFacilityId: receivingFacilityId ?? null,
        },
      }),
      prisma.patient.update({
        where: { id: patientId },
        data: { status: "REFERRED_OUT" },
      }),
    ]);

    // Create a corresponding ReferralSummary record to support standard detail view pages
    if (userOrgId && userId) {
      const parsedReason = (() => {
        try {
          return JSON.parse(reason);
        } catch {
          return { reason };
        }
      })();

      const clinicalSnapshot = {
        vitals: patientExists.vitals.map((v) => ({
          bp: v.bp,
          pulse: v.pulse,
          rr: v.rr,
          temp: v.temp,
          spO2: v.spO2,
          bmi: v.bmi,
          weightKg: v.weightKg,
          heightCm: v.heightCm,
          createdAt: v.createdAt.toISOString(),
        })),
        activeMeds: [],
        certifiedLabs: [],
        workingDiagnosis: parsedReason.workingDiagnosis || "",
        chiefComplaint: parsedReason.chiefComplaint || "",
        reasonForReferral: parsedReason.reasonForReferral || "",
        priority: parsedReason.priority || "ROUTINE",
        receivingDepartment: parsedReason.department || ""
      };

      const documentHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(clinicalSnapshot))
        .digest("hex");

      await prisma.referralSummary.create({
        data: {
          id: referral.id, // Map it to the same UUID as Referral for compatibility
          patientId,
          originOrganizationId: userOrgId,
          destinationOrganizationId: receivingFacilityId ?? null,
          clinicalSnapshot,
          issuedByUserId: userId,
          documentHash,
        }
      });
    }

    return NextResponse.json({ success: true, referral });
  } catch (error: any) {
    console.error("❌ DATABASE ERROR: Failed to create referral", error.message);
    return NextResponse.json({ error: "Failed to create referral." }, { status: 500 });
  }
}
