import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
    const passwordHash = crypto
      .createHmac("sha256", salt)
      .update("C212121t")
      .digest("hex");

    await prisma.patient.update({
      where: { healthId: 'PT-00004' },
      data: { passwordHash }
    });

    return NextResponse.json({ success: true, message: "Patient PT-00004 password reset to C212121t" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
