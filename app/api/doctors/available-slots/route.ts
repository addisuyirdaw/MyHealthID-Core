import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface DoctorSlot {
  doctorId: string;
  fullName: string;
  specialization: string | null;
  ward: string | null;
  wardId: string | null;
  slots: string[];
}

const SLOT_HOURS = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

/**
 * GET /api/doctors/available-slots?ward=OPD_OUTPATIENT&date=2026-06-24
 *
 * Returns a list of active doctors with available time slots for a given date.
 * Falls back to an empty array (client renders "General Ward Pool" empty state).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const wardParam = url.searchParams.get("ward") || "OPD_OUTPATIENT";
    const dateParam = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    const targetDate = new Date(`${dateParam}T00:00:00.000Z`);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid date format." }, { status: 400 });
    }

    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

    // Resolve ClinicalWard by code OR name (flexible match)
    const clinicalWard = await prisma.clinicalWard.findFirst({
      where: {
        OR: [
          { code: wardParam },
          { name: { contains: wardParam, mode: "insensitive" } },
        ],
      },
    });

    if (!clinicalWard) {
      // No matching ward → return empty (triggers fallback UI)
      return NextResponse.json({ success: true, doctors: [], wardName: wardParam, wardId: null });
    }

    // Fetch active doctors assigned to this ward
    const doctors = await prisma.user.findMany({
      where: {
        assignedWardId: clinicalWard.id,
        isActive: true,
        role: {
          in: ["GENERAL_PRACTITIONER", "MEDICAL_SPECIALIST", "SUB_SPECIALIST"] as any[],
        },
      },
      select: {
        id: true,
        fullName: true,
        firstName: true,
        lastName: true,
        specialization: true,
        assignedWardId: true,
      },
    });

    if (doctors.length === 0) {
      // Ward exists but no doctors → return empty (triggers fallback UI)
      return NextResponse.json({
        success: true,
        doctors: [],
        wardName: clinicalWard.name,
        wardId: clinicalWard.id,
      });
    }

    // For each doctor, compute booked slots and return available ones
    const result: DoctorSlot[] = await Promise.all(
      doctors.map(async (doctor) => {
        // Fetch their existing appointments for this day
        const existingAppointments = await prisma.appointment.findMany({
          where: {
            doctorId: doctor.id,
            dateTime: { gte: targetDate, lte: endOfDay },
            status: { not: "CANCELLED" },
          },
          select: { dateTime: true },
        });

        const bookedHours = new Set(
          existingAppointments.map((a) => {
            const h = new Date(a.dateTime).getUTCHours();
            const m = new Date(a.dateTime).getUTCMinutes();
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          })
        );

        const available = SLOT_HOURS.filter((slot) => !bookedHours.has(slot));

        const displayName =
          doctor.fullName ||
          [doctor.firstName, doctor.lastName].filter(Boolean).join(" ") ||
          "Dr. (Name on file)";

        return {
          doctorId: doctor.id,
          fullName: displayName,
          specialization: doctor.specialization,
          ward: clinicalWard.name,
          wardId: clinicalWard.id,
          slots: available,
        };
      })
    );

    return NextResponse.json({ success: true, doctors: result, wardName: clinicalWard.name, wardId: clinicalWard.id });
  } catch (error: any) {
    console.error("[doctors/available-slots] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
