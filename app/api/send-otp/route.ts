import { NextResponse } from 'next/server';
import { sendOTP } from '@/lib/mailService';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email, nationalId } = await request.json();

    if (!email || !nationalId) {
      return NextResponse.json({ success: false, error: "Email and National ID are required." }, { status: 400 });
    }

    const cleanNationalId = nationalId.replace(/\s/g, '');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OPEN REGISTRATION LOGIC: Upsert the patient
    // If National ID exists, update email and otpCode.
    // If not, automatically create a placeholder patient record to hold the linked email.
    
    // We dynamically generate a temporary Health ID for the placeholder record.
    const tempHealthId = `TMP-\${Date.now()}`;

    await prisma.patient.upsert({
      where: { nationalId: cleanNationalId },
      update: {
        email: email,
        otpCode: otp
      },
      create: {
        nationalId: cleanNationalId,
        healthId: tempHealthId,
        email: email,
        otpCode: otp,
        fullName: "Pending Registration",
        age: 0,
        sex: "Not Specified",
      }
    });

    // Send the email to the dynamic recipient
    const result = await sendOTP(otp, email);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Error in send-otp route:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
