import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/patients/[id]/access-logs — retrieve audit trail
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logs = await prisma.accessLog.findMany({
      where: { patientId: params.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error("[access-logs GET] error:", error.message);
    return NextResponse.json({ success: false, logs: [], error: error.message }, { status: 500 });
  }
}

// POST /api/patients/[id]/access-logs — write a new entry
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const log = await prisma.accessLog.create({
      data: {
        patientId: params.id,
        accessedByName: body.accessedByName || "Unknown",
        facility: body.facility || "Debre Berhan Hospital",
        role: body.role || "DOCTOR",
        action: body.action || "VIEW",
      },
    });
    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error("[access-logs POST] error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
