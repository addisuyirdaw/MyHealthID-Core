import { cookies } from "next/headers";
import { getHospitals } from "@/lib/actions/hospital.actions";
import { getAppointmentsForCitizen } from "@/lib/actions/appointment.actions";
import { CitizenAppointmentsClient } from "./CitizenAppointmentsClient";

export const dynamic = "force-dynamic";

export default async function CitizenAppointmentsPage() {
  const cookieStore = cookies();
  const citizenPatientId = cookieStore.get("citizenPatientId")?.value;

  if (!citizenPatientId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl max-w-md text-center shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm">You must be logged in as a citizen to access this portal.</p>
        </div>
      </div>
    );
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
