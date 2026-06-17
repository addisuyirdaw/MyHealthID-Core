import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { nationalId, otp } = await request.json();

    if (!nationalId || !otp) {
      return NextResponse.json(
        { success: false, error: 'National ID and OTP are required.' },
        { status: 400 }
      );
    }

    const cleanNationalId = nationalId.replace(/\s/g, '');

    const patient = await prisma.patient.findFirst({
      where: { nationalId: cleanNationalId },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'National ID not found.' },
        { status: 404 }
      );
    }

    // --- Expiry check (5-minute window) ---
    if (!patient.otpExpiresAt || new Date() > patient.otpExpiresAt) {
      // Clear the stale OTP so it cannot be retried
      await prisma.patient.update({
        where: { id: patient.id },
        data: { otpCode: null, otpExpiresAt: null },
      });
      return NextResponse.json(
        {
          success: false,
          error: 'OTP has expired. Please request a new code.',
        },
        { status: 400 }
      );
    }

    // --- Code match check ---
    if (patient.otpCode !== otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP. Please check the code and try again.' },
        { status: 400 }
      );
    }

    // --- Success: clear the OTP so it cannot be reused ---
    await prisma.patient.update({
      where: { id: patient.id },
      data: { otpCode: null, otpExpiresAt: null },
    });

    return NextResponse.json({ success: true, message: 'Verification successful.' });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error.' },
      { status: 500 }
    );
  }
}
