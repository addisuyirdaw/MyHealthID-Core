import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nid = searchParams.get('nid');

  if (!nid) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: {
        nationalId: nid
      }
    });

    if (patient && patient.fullName !== "Pending Registration" && !patient.healthId.startsWith("TMP-")) {
      return NextResponse.json({ exists: true });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Error checking NID:", error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
