import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getHospitals } from "@/lib/actions/hospital.actions";
import { getAppointmentsForCitizen } from "@/lib/actions/appointment.actions";
import { CitizenAppointmentsClient } from "./CitizenAppointmentsClient";
import { verifyToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CitizenAppointmentsPage() {
  const cookieStore = cookies();
  const citizenPatientId = cookieStore.get("citizenPatientId")?.value;

  if (!citizenPatientId) {
    redirect("/signin");
  }

  // Validate the citizen session token against citizenPatientId
  const sessionToken = cookieStore.get("citizenSessionToken")?.value;
  const payload = sessionToken ? verifyToken(sessionToken) : null;
  if (!payload || payload.patientId !== citizenPatientId) {
    redirect("/signin");
  }

  // Fetch facilities
  const hospitalsRes = await getHospitals();
  const hospitals = (hospitalsRes.hospitals as any) || [];

  // Fetch citizen's existing appointments
  const appointmentsRes = await getAppointmentsForCitizen(citizenPatientId);
  const appointments = (appointmentsRes.appointments as any) || [];

  return (
    <CitizenAppointmentsClient
      citizenPatientId={citizenPatientId}
      initialHospitals={hospitals}
      initialAppointments={appointments}
    />
  );
}
