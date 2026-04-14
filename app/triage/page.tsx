import { getWaitingForTriagePatients } from "@/lib/actions/patient.actions";
import TriageDashboardClient from "@/components/TriageDashboardClient";

export const dynamic = "force-dynamic";

export default async function TriagePage() {
  const patients = await getWaitingForTriagePatients();

  return (
    <div className="min-h-screen bg-neutral-900 text-white selection:bg-cyan-500/30">
      <TriageDashboardClient initialPatients={patients} />
    </div>
  );
}
