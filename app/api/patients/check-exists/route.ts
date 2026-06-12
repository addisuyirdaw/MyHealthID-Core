import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { CROSS_FACILITY } from '@/lib/utils/tenantContext';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nid = searchParams.get('nid');
  const phone = searchParams.get('phone');

  if (!nid && !phone) {
    return NextResponse.json({ exists: false });
  }

  try {
    const conditions: any[] = [];
    if (nid) {
      conditions.push(
        { nationalId: nid },
        { faydaId: nid },
        { hospitalId: nid }
      );
    }
    if (phone) {
      const cleanPhone = phone.replace(/\s+/g, '');
      if (cleanPhone) {
        conditions.push({ phoneNumber: cleanPhone });
      }
    }

    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
        OR: conditions
      } as any
    });

    if (patient && patient.fullName !== "Pending Registration" && !patient.healthId.startsWith("TMP-")) {
      throw new Error("DUPLICATE_PATIENT_IDENTITY");
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("Error checking patient existence:", error);
    if (error.message === "DUPLICATE_PATIENT_IDENTITY") {
      return NextResponse.json({ exists: true, error: "DUPLICATE_PATIENT_IDENTITY" }, { status: 400 });
    }
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
