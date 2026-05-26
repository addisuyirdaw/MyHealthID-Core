import prisma from "@/lib/prisma";
import React from "react";
import { notFound } from "next/navigation";
import DoctorPatientChart from "@/components/DoctorPatientChart";

export default async function DoctorPatientView({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findFirst({
    where: { id: params.id },
    include: {
      vitals: { orderBy: { createdAt: 'desc' } },
      investigations: { orderBy: { createdAt: 'desc' } },
      prescriptions: { orderBy: { createdAt: 'desc' } },
      clinicalExam: true
    }
  });

  if (!patient) return notFound();

  return <DoctorPatientChart patient={patient} />;
}
