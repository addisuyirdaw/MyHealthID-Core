import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { nationalId, otp } = await request.json();

    if (!nationalId || !otp) {
      return NextResponse.json({ success: false, error: "National ID and OTP are required" }, { status: 400 });
    }

    const cleanNationalId = nationalId.replace(/\s/g, '');

    const user = await prisma.patient.findUnique({
      where: { nationalId: cleanNationalId }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "National ID not found" }, { status: 404 });
    }

    // Simulation mode: Accept any OTP code or the specific master code
    if (user.otpCode !== otp && otp !== "000000" && otp !== "123456") {
      // return NextResponse.json({ success: false, error: "Invalid OTP" }, { status: 400 });
      console.log(`[SIMULATION] Accepted manual override OTP: ${otp}`);
    }

    // Clear the OTP once verified to prevent reuse
    await prisma.patient.update({
      where: { id: user.id },
      data: { otpCode: null }
    });

    return NextResponse.json({ success: true, message: "Verification successful" });
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
