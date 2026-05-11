import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import ScreeningWizard from "@/components/screening/ScreeningWizard";

export const dynamic = "force-dynamic";

export default async function ScreeningPatientPage({
  params,
  searchParams,
}: {
  params: { patientId: string };
  searchParams: { type?: string };
}) {
  const typeParam = searchParams.type;

  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ id: params.patientId }, { healthId: params.patientId }],
    },
    select: { id: true, fullName: true, healthId: true, age: true },
  });

  if (!patient) notFound();

  return (
    <ScreeningWizard
      patientId={patient.id}
      patientHealthId={patient.healthId}
      fullName={patient.fullName}
      patientAge={patient.age}
      initialType={typeParam}
    />
  );
}
