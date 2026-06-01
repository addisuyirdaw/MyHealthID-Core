import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeHealthcareRole } from "@/lib/locales/enums";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";

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
      include: {
        organization: { select: { id: true, name: true, serviceType: true } },
        user: { select: { id: true, fullName: true, role: true } },
      },
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
    const cookieStore = cookies();

    // Extract user context from cookies
    const userId = cookieStore.get("userId")?.value || "";
    const userRole = cookieStore.get("userRole")?.value || "GENERAL_PRACTITIONER";
    const organizationId = cookieStore.get("organizationId")?.value || body.organizationId || "";

    // Normalize the role to canonical enum value
    const normalizedRole = normalizeHealthcareRole(body.role || userRole) as Role;

    // Query organization to get facility service type
    let facilityServiceType = undefined;
    if (organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { serviceType: true },
      });
      facilityServiceType = org?.serviceType || undefined;
    }

    const log = await prisma.accessLog.create({
      data: {
        patientId: params.id,
        userId: userId || undefined,
        organizationId: organizationId || undefined,
        accessedByName: body.accessedByName || "Unknown",
        role: normalizedRole,
        facilityServiceType: facilityServiceType,
        action: body.action || "VIEW",
      },
    });
    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error("[access-logs POST] error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
