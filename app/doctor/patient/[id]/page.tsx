import prisma from "@/lib/prisma";
import { CROSS_FACILITY } from "@/lib/utils/tenantContext";
import React from "react";
import { notFound } from "next/navigation";
import DoctorPatientChart from "@/components/DoctorPatientChart";

export default async function DoctorPatientView({ params }: { params: { id: string } }) {
  // CROSS_FACILITY: a doctor may open a chart for a patient who was registered
  // at a different facility (cross-facility referral / transfer scenario).
  // The CROSS_FACILITY spread injects __bypassTenantFilter: true which is
  // intercepted and stripped by the Prisma extension before hitting the DB.
  const patient = await prisma.patient.findFirst({
    where: {
      ...CROSS_FACILITY,
      id: params.id,
    } as any,
    include: {
      vitals:         { orderBy: { createdAt: 'desc' } },
      investigations: { orderBy: { createdAt: 'desc' } },
      prescriptions:  { orderBy: { createdAt: 'desc' } },
      clinicalExam:   true,
    }
  });

  if (!patient) return notFound();

  return <DoctorPatientChart patient={patient} />;
}
