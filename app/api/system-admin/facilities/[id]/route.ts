import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SYSTEM_ADMIN_ROLES } from "@/lib/locales/enums";
import { headers } from "next/headers";

function guardSysAdmin() {
  const cookieStore = cookies();
  const role = cookieStore.get("userRole")?.value;
  const userId = cookieStore.get("userId")?.value;
  const userName = cookieStore.get("userName")?.value ?? "System Administrator";
  if (!role || !userId || !SYSTEM_ADMIN_ROLES.includes(role as any)) {
    return { ok: false as const };
  }
  return { ok: true as const, userId, userName, role };
}

async function logAudit(opts: {
  actorId: string; actorName: string; actorRole: string;
  action: string; targetType: string; targetId: string; targetName?: string;
  metadata?: any;
}) {
  try {
    const h = headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    await prisma.auditLog.create({
      data: { ...opts, ipAddress: ip, metadata: opts.metadata ?? {} },
    });
  } catch { /* non-fatal */ }
}

// DELETE /api/system-admin/facilities/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = guardSysAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "SYSTEM_ADMINISTRATOR role required." }, { status: 403 });
  }

  const { id } = params;

  try {
    const facility = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!facility) {
      return NextResponse.json({ error: "Facility not found." }, { status: 404 });
    }

    const [patientCount, userCount] = await Promise.all([
      prisma.patient.count({ where: { organizationId: id } }),
      prisma.user.count({ where: { organizationId: id } }),
    ]);

    if (patientCount > 0) {
      return NextResponse.json({
        error: `Cannot delete — ${patientCount} patient record(s) exist. Deactivate instead.`,
        blocked: true,
      }, { status: 409 });
    }

    // Cascade-delete staff members (safe — no patients exist at this point)
    if (userCount > 0) {
      await prisma.user.deleteMany({ where: { organizationId: id } });
    }

    await prisma.organization.delete({ where: { id } });

    await logAudit({
      actorId: guard.userId,
      actorName: guard.userName,
      actorRole: guard.role,
      action: "DELETE_FACILITY",
      targetType: "FACILITY",
      targetId: id,
      targetName: facility.name,
      metadata: userCount > 0 ? { staffDeleted: userCount } : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/system-admin/facilities/[id] — toggle isActive
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = guardSysAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "SYSTEM_ADMINISTRATOR role required." }, { status: 403 });
  }

  try {
    const { isActive } = await request.json();
    const { id } = params;

    const facility = await prisma.organization.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!facility) {
      return NextResponse.json({ error: "Facility not found." }, { status: 404 });
    }

    await prisma.organization.update({
      where: { id },
      data: { isActive },
    });

    await logAudit({
      actorId: guard.userId,
      actorName: guard.userName,
      actorRole: guard.role,
      action: isActive ? "ACTIVATE_FACILITY" : "DEACTIVATE_FACILITY",
      targetType: "FACILITY",
      targetId: id,
      targetName: facility.name,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
