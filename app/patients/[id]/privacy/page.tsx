import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import PrivacyDashboardClient from "@/components/PrivacyDashboardClient";
import { verifyToken } from "@/lib/session";

export default async function PrivacyPage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ id: params.id }, { healthId: params.id }],
    },
    select: { id: true, fullName: true, isRestricted: true },
  });

  if (!patient) return notFound();

  // Citizen session token security check
  const cookieStore = cookies();
  const viewerRole = cookieStore.get("userRole")?.value || "UNKNOWN";
  if (viewerRole === "CITIZEN") {
    const sessionToken = cookieStore.get("citizenSessionToken")?.value;
    const payload = sessionToken ? verifyToken(sessionToken) : null;
    if (!payload || payload.patientId !== patient.id) {
      redirect("/signin");
    }
  }

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
