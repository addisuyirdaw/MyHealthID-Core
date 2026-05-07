import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrivacyDashboardClient from "@/components/PrivacyDashboardClient";

export default async function PrivacyPage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ id: params.id }, { healthId: params.id }],
    },
    select: { id: true, fullName: true, isRestricted: true },
  });

  if (!patient) return notFound();

  const logs = await prisma.accessLog.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PrivacyDashboardClient
      patientId={patient.id}
      patientName={patient.fullName}
      isRestricted={patient.isRestricted}
      initialLogs={JSON.parse(JSON.stringify(logs))}
    />
  );
}
