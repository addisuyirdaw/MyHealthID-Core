import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import {
  ADMIN_ROLES,
  CLINICAL_ROLES,
  TRIAGE_ROLES,
  LAB_ROLES,
  PHARMACY_ROLES,
  REGISTRATION_ROLES,
  normalizeHealthcareRole,
} from "@/lib/locales/enums";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// Called by the forced /change-password page. Staff member sets a new
// permanent password after logging in with a temporary one.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // ── Auth guard ──────────────────────────────────────────────────────────
    const cookieStore = cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. No active session." }, { status: 401 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const { newPassword } = body as { newPassword?: string };

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // ── Load user ───────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isTempPassword: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!user.isTempPassword) {
      return NextResponse.json(
        { error: "No temporary password is active for this account." },
        { status: 409 }
      );
    }

    // ── Hash new password ───────────────────────────────────────────────────
    const salt = process.env.PASSWORD_SALT;
    const hashed = crypto
      .createHmac("sha256", salt || "myhealthid-dev-salt-only")
      .update(newPassword)
      .digest("hex");

    // ── Persist and clear isTempPassword ────────────────────────────────────
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash:      hashed,
        isTempPassword:    false,
        resetRequestCode:  null,
        passwordChangedAt: new Date(),
      },
    });

    // ── Determine role-based redirect ────────────────────────────────────────
    const roleStr = normalizeHealthcareRole(user.role as string);
    let redirectTo = "/login";
    if (ADMIN_ROLES.includes(roleStr as any))             redirectTo = "/admin/dashboard";
    else if (CLINICAL_ROLES.includes(roleStr as any))     redirectTo = "/doctor/dashboard";
    else if (TRIAGE_ROLES.includes(roleStr as any))       redirectTo = "/triage";
    else if (LAB_ROLES.includes(roleStr as any))          redirectTo = "/lab";
    else if (PHARMACY_ROLES.includes(roleStr as any))     redirectTo = "/pharmacy";
    else if (REGISTRATION_ROLES.includes(roleStr as any)) redirectTo = "/register";

    // Build response, delete isTempPassword cookie
    const response = NextResponse.json({ success: true, redirectTo }, { status: 200 });
    response.cookies.delete("isTempPassword");

    return response;
  } catch (err: any) {
    console.error("[change-password] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}
