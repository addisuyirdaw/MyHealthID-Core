import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
      select: { id: true, isRestricted: true },
    });

    // Log the action
    const action = isRestricted ? "RESTRICT" : "UNRESTRICT";
    await prisma.accessLog.create({
      data: {
        patientId: params.id,
        accessedByName: "Patient (Self)",
        facility: "Citizen Portal",
        role: "CITIZEN",
        action: action as any,
      },
    });

    return NextResponse.json({ success: true, isRestricted: patient.isRestricted });
  } catch (error: any) {
    console.error("[restrict] error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
