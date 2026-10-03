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
import { verifyToken } from "@/lib/session";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// Called by the forced /change-password page. Staff member sets a new
// permanent password after logging in with a temporary one.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // ── Auth guard ──────────────────────────────────────────────────────────
    const cookieStore = cookies();
    const citizenSessionToken = cookieStore.get("citizenSessionToken")?.value;
    const sessionToken = cookieStore.get("session_token")?.value;

    let authenticatedPatientId: string | null = null;
    let authenticatedUserId: string | null = null;

    if (citizenSessionToken) {
      const payload = verifyToken(citizenSessionToken);
      if (payload && payload.role === "CITIZEN") {
        authenticatedPatientId = payload.patientId;
      }
    }

    if (sessionToken) {
      const payload = verifyToken(sessionToken);
      if (payload && payload.role !== "CITIZEN") {
        authenticatedUserId = payload.patientId; // Staff session token uses patientId key for user ID
      }
    }

    if (!authenticatedUserId && !authenticatedPatientId) {
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

    const salt = process.env.PASSWORD_SALT;
    const hashed = crypto
      .createHmac("sha256", salt || "myhealthid-dev-salt-only")
      .update(newPassword)
      .digest("hex");

    // ── CITIZEN FLOW ────────────────────────────────────────────────────────
    if (authenticatedPatientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: authenticatedPatientId },
        select: { id: true, isTempPassword: true },
      });

      if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });
      if (!patient.isTempPassword) return NextResponse.json({ error: "No temporary password is active." }, { status: 409 });

      await prisma.patient.update({
        where: { id: authenticatedPatientId },
        data: {
          passwordHash: hashed,
          isTempPassword: false,
          resetRequestCode: null,
        },
      });

      const response = NextResponse.json({ success: true, redirectTo: `/patients/${authenticatedPatientId}/clinical-records` }, { status: 200 });
      response.cookies.delete("isTempPassword");
      return response;
    }

    // ── STAFF/ADMIN FLOW ────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: authenticatedUserId! },
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

    // ── Persist and clear isTempPassword ────────────────────────────────────
    await prisma.user.update({
      where: { id: authenticatedUserId! },
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
    if (roleStr === "SYSTEM_ADMINISTRATOR")               redirectTo = "/system-admin/dashboard";
    else if (ADMIN_ROLES.includes(roleStr as any))             redirectTo = "/admin/dashboard";
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
