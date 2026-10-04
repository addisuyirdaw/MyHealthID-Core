import prisma from "@/lib/prisma";
import { CROSS_FACILITY } from "@/lib/utils/tenantContext";
import React from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import DoctorPatientChart from "@/components/DoctorPatientChart";
import BreakGlassClient from "@/components/BreakGlassClient";

export default async function DoctorPatientView({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const userId = cookieStore.get("userId")?.value || "";
  const organizationId = cookieStore.get("organizationId")?.value || "";

  // 1. Load patient minimally to check identity and organization ownership
  const patientBase = await prisma.patient.findFirst({
    where: {
      ...CROSS_FACILITY,
      id: params.id,
    } as any,
    select: {
      id: true,
      organizationId: true,
      fullName: true,
    }
  });

  if (!patientBase) return notFound();

  // 2. Enforce Authorization Check
  if (patientBase.organizationId && patientBase.organizationId !== organizationId) {
    // Cross-facility access: check for a valid Break-Glass Session
    const activeSession = await prisma.breakGlassSession.findFirst({
      where: {
        userId,
        patientId: params.id,
        organizationId,
        expiresAt: { gt: new Date() }
      }
    });

    if (!activeSession) {
      // Authorization missing/expired. Return BreakGlass UI component and STOP rendering chart.
      return <BreakGlassClient patientId={patientBase.id} patientName={patientBase.fullName} />;
    }
  }

  // 3. Authorization succeeded (or same-facility). Securely load the FULL patient chart data.
  const patient = await prisma.patient.findFirst({
    where: {
      ...CROSS_FACILITY,
      id: params.id,
    } as any,
    include: {
      vitals:         { orderBy: { createdAt: 'desc' } },
      investigations: { orderBy: { createdAt: 'desc' } },
      prescriptions:  { orderBy: { createdAt: 'desc' } },
      clinicalExams:  { orderBy: { createdAt: 'desc' } },
      appointments: {
        where: { status: { in: ["ARRIVED", "TRIAGED", "IN_CONSULTATION"] } },
        orderBy: { dateTime: "desc" },
        take: 1,
        include: { assignedWard: true, clinicalExam: true },
      },
    }
  });

  if (!patient) return notFound();

  const activeAppointment = patient.appointments?.[0];
  const activeAppointmentId = activeAppointment?.id;
  // Map the clinical exam ONLY from the active appointment for the current draft
  if (activeAppointment && activeAppointment.clinicalExam) {
    (patient as any).clinicalExam = activeAppointment.clinicalExam;
  } else {
    // DO NOT PRE-FILL from history! Let past history be read-only timeline.
    (patient as any).clinicalExam = null;
  }

  return <DoctorPatientChart patient={patient} currentUserId={userId} activeAppointmentId={activeAppointmentId} />;
}
