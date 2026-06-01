import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

// PATCH /api/patients/[id]/restrict — toggle isRestricted
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isRestricted } = await req.json();
    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: { isRestricted: Boolean(isRestricted) },
      select: { id: true, isRestricted: true, organizationId: true },
    });

    // Get facility type from organization
    let facilityServiceType = undefined;
    if (patient.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: patient.organizationId },
        select: { serviceType: true },
      });
      facilityServiceType = org?.serviceType || undefined;
    }

    // Log the action (patient self-restriction, no professional role)
    const action = isRestricted ? "RESTRICT" : "UNRESTRICT";
    await prisma.accessLog.create({
      data: {
        patientId: params.id,
        organizationId: patient.organizationId || undefined,
        accessedByName: "Patient (Self)",
        facilityServiceType: facilityServiceType,
        action: action as any,
        // role omitted for patient self-service actions
      },
    });

    return NextResponse.json({ success: true, isRestricted: patient.isRestricted });
  } catch (error: any) {
    console.error("[restrict] error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
