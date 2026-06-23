import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/session";
import CitizenProfileClient from "./CitizenProfileClient";

export default async function CitizenProfilePage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [{ id: params.id }, { healthId: params.id }],
    },
  });

  if (!patient) return notFound();

  // Citizen session token security check
  const cookieStore = cookies();
  const viewerRole = cookieStore.get("userRole")?.value || "UNKNOWN";
  
  if (viewerRole !== "CITIZEN") {
    redirect("/signin");
  }

  const sessionToken = cookieStore.get("citizenSessionToken")?.value;
  const payload = sessionToken ? verifyToken(sessionToken) : null;
  
  if (!payload || payload.patientId !== patient.id) {
    redirect("/signin");
  }

  // Format Date of Birth to YYYY-MM-DD string
  const dobString = patient.dateOfBirth
    ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
    : "";

  return (
    <CitizenProfileClient
      patientId={patient.id}
      initialFullName={patient.fullName}
      initialPhoneNumber={patient.phoneNumber || ""}
      initialDob={dobString}
      healthId={patient.healthId}
      initialEmail={patient.email || ""}
      initialSex={patient.sex || ""}
      initialAge={patient.age || 0}
      initialReligion={patient.religion || ""}
      initialOccupation={patient.occupation || ""}
      initialMaritalStatus={patient.maritalStatus || ""}
      initialEducationalStatus={patient.educationalStatus || ""}
      initialEmergencyContactName={patient.emergencyContactName || ""}
      initialEmergencyContactPhone={patient.emergencyContactPhone || ""}
      initialBloodGroup={patient.bloodGroup || ""}
      initialNationalId={patient.nationalId || ""}
      initialFaydaId={patient.faydaId || ""}
    />
  );
}
