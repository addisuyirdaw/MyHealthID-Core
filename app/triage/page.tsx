import { getWaitingForTriagePatients } from "@/lib/actions/patient.actions";
import TriageDashboardClient from "@/components/TriageDashboardClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TriagePage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;

  // ── Role guard: NURSE only ──────────────────────────────────────
  if (!userRole) {
    redirect("/login");
  }
  if (userRole !== "NURSE") {
    redirect("/unauthorized?reason=Nurse+role+required+for+the+triage+queue.");
  }

  const patients = await getWaitingForTriagePatients();

  return (
    <div className="min-h-screen bg-neutral-900 text-white selection:bg-cyan-500/30">
      <TriageDashboardClient initialPatients={patients} />
    </div>
  );
}
