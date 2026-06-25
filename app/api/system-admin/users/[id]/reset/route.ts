import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/prisma";
import { SYSTEM_ADMIN_ROLES } from "@/lib/locales/enums";
import crypto from "crypto";

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

// POST /api/system-admin/users/[id]/reset
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = guardSysAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "SYSTEM_ADMINISTRATOR role required." }, { status: 403 });
  }

  const { id } = params;

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, firstName: true, lastName: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(8);
    const code = Array.from(bytes)
      .map((b) => CHARSET[b % CHARSET.length])
      .join("");

    await prisma.user.update({
      where: { id },
      data: { resetRequestCode: code, isTempPassword: true },
    });

    const displayName =
      targetUser.fullName ??
      [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ") ??
      targetUser.email;

    // Audit log
    try {
      const h = headers();
      const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      await prisma.auditLog.create({
        data: {
          actorId: guard.userId,
          actorName: guard.userName,
          actorRole: guard.role,
          action: "RESET_PASSWORD",
          targetType: "USER",
          targetId: id,
          targetName: displayName ?? undefined,
          metadata: { email: targetUser.email },
          ipAddress: ip,
        },
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true, code });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
