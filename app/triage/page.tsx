import { getWaitingForTriagePatients } from "@/lib/actions/patient.actions";
import TriageDashboardClient from "@/components/TriageDashboardClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ADMIN_ROLES, TRIAGE_ROLES } from "@/lib/locales/enums";

export const dynamic = "force-dynamic";

export default async function TriagePage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;

  // ── Role guard: NURSE only ──────────────────────────────────────
  if (!userRole) {
    redirect("/login");
  }
  if (!TRIAGE_ROLES.includes(userRole as any) && !ADMIN_ROLES.includes(userRole as any)) {
    redirect("/unauthorized?reason=Triage+role+required+for+the+triage+queue.");
  }

  const activeOrgId = cookieStore.get("organizationId")?.value;
  let facilityName = "";
  if (activeOrgId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: activeOrgId },
        select: { name: true }
      });
      if (org) {
        facilityName = org.name;
      }
    } catch (err) {
      console.error("Error fetching organization name for triage:", err);
    }
  }

  const patients = await getWaitingForTriagePatients();

  return (
    <div className="min-h-screen bg-neutral-900 text-white selection:bg-cyan-500/30">
      <TriageDashboardClient initialPatients={patients} facilityName={facilityName} />
    </div>
  );
}
