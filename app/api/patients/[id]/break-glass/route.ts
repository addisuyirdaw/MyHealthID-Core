import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeHealthcareRole } from "@/lib/locales/enums";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";

// POST /api/patients/[id]/break-glass — emergency override
// Logs the event immutably in AccessLog and returns full patient data
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const cookieStore = cookies();

    // Extract user context from cookies
    const userId = cookieStore.get("userId")?.value || "";
    const userRole = cookieStore.get("userRole")?.value || "GENERAL_PRACTITIONER";
    const organizationId = cookieStore.get("organizationId")?.value || "";

    // Normalize the role to canonical enum value
    const normalizedRole = normalizeHealthcareRole(userRole) as Role;

    // Query organization to get facility service type
    let facilityServiceType = undefined;
    if (organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { serviceType: true },
      });
      facilityServiceType = org?.serviceType || undefined;
    }

    // 1. Write the immutable BREAK_GLASS audit log entry
    await prisma.accessLog.create({
      data: {
        patientId: params.id,
        userId: userId || undefined,
        organizationId: organizationId || undefined,
        accessedByName: body.accessedByName || "Unknown Doctor",
        role: normalizedRole,
        facilityServiceType: facilityServiceType,
        action: "BREAK_GLASS",
      },
    });

    // 2. Return the patient data so the UI can unlock
    const patient = await prisma.patient.findUnique({
      where: { id: params.id },
      include: {
        vitals: { orderBy: { createdAt: "desc" } },
        investigations: { orderBy: { createdAt: "desc" } },
        prescriptions: { orderBy: { createdAt: "desc" } },
        clinicalExam: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ success: false, error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, patient: JSON.parse(JSON.stringify(patient)) });
  } catch (error: any) {
    console.error("[break-glass] error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
