import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { ADMIN_ROLES } from "@/lib/locales/enums";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/users/complete-reset
// Called after trigger-reset: admin sets a temporary password for the user.
// The target user must log in with this temp password and change it immediately.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // ── Auth guard ──────────────────────────────────────────────────────────
    const cookieStore = cookies();
    const facilityId  = cookieStore.get("organizationId")?.value;
    const adminRole   = cookieStore.get("userRole")?.value;

    if (!facilityId || !adminRole || !ADMIN_ROLES.includes(adminRole as any)) {
      return NextResponse.json({ error: "Unauthorized. Administrator session required." }, { status: 401 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const { targetUserId, newPassword } = body as { targetUserId?: string; newPassword?: string };

    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ error: "targetUserId is required." }, { status: 400 });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 1) {
      return NextResponse.json({ error: "newPassword is required." }, { status: 400 });
    }

    // ── Load target user ────────────────────────────────────────────────────
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, organizationId: true, resetRequestCode: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // ── Multi-tenant boundary guard ─────────────────────────────────────────
    if (targetUser.organizationId !== facilityId) {
      return NextResponse.json(
        { error: "Access denied. This account belongs to a different facility." },
        { status: 403 }
      );
    }

    // ── Verify a reset was triggered ────────────────────────────────────────
    if (!targetUser.resetRequestCode) {
      return NextResponse.json(
        { error: "No active reset request found for this user. Please trigger a reset first." },
        { status: 409 }
      );
    }

    // ── Hash new password using HMAC-SHA256 ─────────────────────────────────
    const salt = process.env.PASSWORD_SALT;
    const hashed = crypto
      .createHmac("sha256", salt || "myhealthid-dev-salt-only")
      .update(newPassword)
      .digest("hex");

    // ── Update user record ──────────────────────────────────────────────────
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash:     hashed,
        isTempPassword:   true,
        resetRequestCode: null,
        passwordChangedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("[complete-reset] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}
