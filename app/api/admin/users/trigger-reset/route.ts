import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { ADMIN_ROLES } from "@/lib/locales/enums";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/users/trigger-reset
// Generates a 6-character alphanumeric reset code for a specific user account.
// The admin physically hands this code to the staff member after in-person ID verification.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // ── Auth guard ──────────────────────────────────────────────────────────
    const cookieStore = cookies();
    const adminId     = cookieStore.get("userId")?.value;
    const facilityId  = cookieStore.get("organizationId")?.value;
    const adminRole   = cookieStore.get("userRole")?.value;

    if (!adminId || !facilityId || !adminRole || !ADMIN_ROLES.includes(adminRole as any)) {
      return NextResponse.json({ error: "Unauthorized. Administrator session required." }, { status: 401 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const { targetUserId } = body as { targetUserId?: string };

    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ error: "targetUserId is required." }, { status: 400 });
    }

    // ── Load target user ────────────────────────────────────────────────────
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, organizationId: true, firstName: true, lastName: true },
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

    // ── Generate 6-character alphanumeric code ──────────────────────────────
    // Uses crypto.randomBytes for cryptographic randomness.
    // Charset: uppercase letters + digits (no ambiguous chars like 0/O/1/I)
    const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes   = crypto.randomBytes(6);
    const code    = Array.from(bytes)
      .map((b) => CHARSET[b % CHARSET.length])
      .join("");

    // ── Persist code to user record ─────────────────────────────────────────
    await prisma.user.update({
      where: { id: targetUserId },
      data:  { resetRequestCode: code },
    });

    return NextResponse.json({ code }, { status: 200 });
  } catch (err: any) {
    console.error("[trigger-reset] error:", err);
    return NextResponse.json({ error: err.message || "Internal server error." }, { status: 500 });
  }
}
