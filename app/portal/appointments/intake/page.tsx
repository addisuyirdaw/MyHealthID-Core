import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getHospitals } from "@/lib/actions/hospital.actions";
import { verifyToken } from "@/lib/session";
import { IntakeWizardClient } from "./IntakeWizardClient";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
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

  return (
    <IntakeWizardClient
      citizenPatientId={citizenPatientId}
      initialHospitals={hospitals}
    />
  );
}
