import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const updated = await prisma.user.updateMany({
      where: { email: 'addisulal@gmail.com' },
      data: {
        isFirstLogin: true,
        activationCode: 'DEMO2026'
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updated.count} admin accounts to use activation code DEMO2026.`,
      salt: process.env.PASSWORD_SALT ? "exists" : "missing",
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || "unknown"
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
