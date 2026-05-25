import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/patients/[id]/break-glass — emergency override
// Logs the event immutably in AccessLog and returns full patient data
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    // 1. Write the immutable BREAK_GLASS audit log entry
    await prisma.accessLog.create({
      data: {
        patientId: params.id,
        accessedByName: body.accessedByName || "Unknown Doctor",
        facility: body.facility || "Debre Berhan Hospital",
        role: body.role || "DOCTOR",
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
