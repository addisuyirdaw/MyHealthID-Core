import { NextResponse } from 'next/server';
import { sendOTP } from '@/lib/mailService';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: Request) {
  try {
    const { email, nationalId } = await request.json();

    if (!email || !nationalId) {
      return NextResponse.json(
        { success: false, error: 'Email and National ID are required.' },
        { status: 400 }
      );
    }

    const cleanNationalId = nationalId.replace(/\s/g, '');

    const existingPatient = await prisma.patient.findFirst({
      where: { nationalId: cleanNationalId },
    });

    if (
      existingPatient &&
      existingPatient.fullName !== 'Pending Registration' &&
      !existingPatient.healthId.startsWith('TMP-')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This National ID is already registered. Please login instead of registering.',
        },
        { status: 400 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    if (existingPatient) {
      await prisma.patient.update({
        where: { id: existingPatient.id },
        data: { email, otpCode: otp, otpExpiresAt },
      });
    } else {
      const tempHealthId = `TMP-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
      await prisma.patient.create({
        data: {
          nationalId: cleanNationalId,
          healthId: tempHealthId,
          internalId: `MHI-${randomUUID()}`,
          email,
          otpCode: otp,
          otpExpiresAt,
          fullName: 'Pending Registration',
          age: 0,
          sex: 'Not Specified',
        },
      });
    }

    const result = await sendOTP(otp, email);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error: any) {
    console.error('Error in send-otp route:', error);
    if (error?.code === 'P2010' || error?.message?.includes('Server selection timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'The database is currently unreachable. Please try again in a moment.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
