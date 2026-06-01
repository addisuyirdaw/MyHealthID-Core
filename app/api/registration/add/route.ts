import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Ward, TriageStatus } from "@prisma/client";

/**
 * POST /api/registration/add
 * 
 * Simple reception desk registration endpoint.
 * Creates a patient record and initializes queue tracking.
 * 
 * Request body:
 * {
 *   fullName: string (required)
 *   sex: "Male" | "Female" | "Other" (required)
 *   dateOfBirth: string (ISO date, required)
 *   phoneNumber?: string
 *   region?: string (default: "Amhara")
 *   zone?: string
 *   woreda?: string
 *   kebele?: string
 *   reason?: string (chief complaint)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   patientId: string (e.g., "PT-00001")
 *   cardNumber: string (5-digit unique number)
 *   queuePosition: number
 *   message: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    const {
      fullName,
      sex,
      dateOfBirth,
      phoneNumber,
      region,
      zone,
      woreda,
      kebele,
      reason,
      religion,
      occupation,
      maritalStatus,
      bloodGroup,
      emergencyContactName,
      emergencyContactPhone,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    if (!sex) {
      return NextResponse.json({ error: "Sex is required" }, { status: 400 });
    }

    if (!dateOfBirth) {
      return NextResponse.json({ error: "Date of birth is required" }, { status: 400 });
    }

    // Validate date format and calculate age
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth format" }, { status: 400 });
    }

    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

    if (age < 0 || age > 150) {
      return NextResponse.json({ error: "Invalid age calculated from date of birth" }, { status: 400 });
    }

    // Validate phone number if provided (basic Ethiopian format check)
    if (phoneNumber && phoneNumber.trim()) {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      if (cleanPhone.length < 7) {
        return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
      }
    }

    // Generate unique 5-digit card number (random between 10000-99999)
    const cardNumber = String(Math.floor(10000 + Math.random() * 90000));

    // Find the next patient ID by getting the count of existing patients
    const patientCount = await prisma.patient.count();
    const nextPatientId = `PT-${String(patientCount + 1).padStart(5, "0")}`;

    // Create patient record
    const patient = await prisma.patient.create({
      data: {
        fullName: fullName.trim(),
        sex: sex || "Not Specified",
        dateOfBirth: dob,
        age: age,
        phoneNumber: phoneNumber?.trim() || null,
        address: {
          region: region || "Amhara",
          zone: zone?.trim() || null,
          woreda: woreda?.trim() || null,
          kebele: kebele?.trim() || null,
        },
        healthId: nextPatientId,
        internalId: nextPatientId,
        hospitalId: cardNumber,
        reasonForVisit: reason || "Routine visit",
        chiefComplaint: reason || "General consultation",
        ward: Ward.OPD_OUTPATIENT,
        triageStatus: TriageStatus.WAITING_FOR_TRIAGE,
        religion: religion || null,
        occupation: occupation || null,
        maritalStatus: maritalStatus || null,
        bloodGroup: bloodGroup || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
      },
    });

    // Create queue entry for the patient — Queue model fields: patientId, status, checkInTime
    const queue = await prisma.queue.create({
      data: {
        patientId: patient.id,
        status: "WAITING",
      },
    });


    // Note: no Visit model in Prisma schema; queue entry created above is sufficient here.

    return NextResponse.json({
      success: true,
      patientId: nextPatientId,
      cardNumber: cardNumber,
      queuePosition: patientCount + 1,
      message: `Patient registered successfully. Card Number: ${cardNumber}`,
    });
  } catch (error: any) {
    console.error("[/api/registration/add] Error:", error);
    return NextResponse.json(
      { error: error.message || "Registration failed" },
      { status: 500 }
    );
  }
}
