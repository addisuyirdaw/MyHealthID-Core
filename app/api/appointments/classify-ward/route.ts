import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId, facilityId, chiefComplaints, appointmentDate, timeSlot } = body;

    if (!patientId || !facilityId || !chiefComplaints || !appointmentDate || !timeSlot) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    // 1. Classifier logic based on chiefComplaints keywords
    const text = chiefComplaints.toLowerCase();
    let resolvedCode = "GEN_MED";

    const pedKeywords = ["child", "pediatric", "baby", "infant", "toddler"];
    const cardKeywords = ["heart", "chest pain", "palpitation", "bp", "cardio"];
    const genMedKeywords = ["fever", "cough", "cold", "flu", "headache", "body pain"];

    if (pedKeywords.some(kw => text.includes(kw))) {
      resolvedCode = "PED";
    } else if (cardKeywords.some(kw => text.includes(kw))) {
      resolvedCode = "CARD";
    } else if (genMedKeywords.some(kw => text.includes(kw))) {
      resolvedCode = "GEN_MED";
    }

    // 2. Fetch the corresponding ClinicalWard from the database
    const ward = await prisma.clinicalWard.findUnique({
      where: { code: resolvedCode }
    });

    if (!ward) {
      return NextResponse.json(
        { success: false, error: `Clinical Ward with code '${resolvedCode}' not found.` },
        { status: 404 }
      );
    }

    // 3. Compute target appointment DateTime (Date + Time Slot Hour)
    const targetDate = new Date(appointmentDate);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid appointment date format." },
        { status: 400 }
      );
    }

    const parseTimeSlot = (slot: string) => {
      const match = slot.match(/^(\d{2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        let hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        const ampm = match[3]?.toUpperCase();
        if (ampm === "PM" && hour < 12) {
          hour += 12;
        } else if (ampm === "AM" && hour === 12) {
          hour = 0;
        }
        return { hour, minute };
      }
      return { hour: 9, minute: 0 };
    };

    const { hour, minute } = parseTimeSlot(timeSlot);
    const appDateTime = new Date(targetDate);
    appDateTime.setUTCHours(hour, minute, 0, 0);

    // 4. Operational Transaction Window
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const transactionResult = await prisma.$transaction(async (tx) => {
      // Verify doctor availability in the resolved ClinicalWard
      const activeDoctor = await tx.user.findFirst({
        where: {
          assignedWardId: ward.id,
          isActive: true,
          role: {
            in: ["GENERAL_PRACTITIONER", "MEDICAL_SPECIALIST", "SUB_SPECIALIST"]
          }
        }
      });

      if (!activeDoctor) {
        throw new Error("No active doctor is available in the selected ward for this time window.");
      }

      // Aggregate row count of active, non-cancelled appointments for this ward on this date
      const count = await tx.appointment.count({
        where: {
          assignedWardId: ward.id,
          dateTime: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            not: "CANCELLED"
          }
        }
      });

      const nextQueuePosition = count + 1;

      // Commit new complete appointment record
      const appointment = await tx.appointment.create({
        data: {
          patientId,
          facilityId,
          department: ward.name,
          dateTime: appDateTime,
          status: "PENDING_CONFIRMATION",
          chiefComplaints,
          assignedWardId: ward.id
        }
      });

      return {
        appointment,
        queuePosition: nextQueuePosition
      };
    });

    return NextResponse.json({
      success: true,
      wardName: ward.name,
      queuePosition: transactionResult.queuePosition,
      appointment: transactionResult.appointment
    });

  } catch (error: any) {
    console.error("[classify-ward] API Error:", error);
    if (error.message === "No active doctor is available in the selected ward for this time window.") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
