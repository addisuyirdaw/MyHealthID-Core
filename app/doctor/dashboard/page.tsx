import { getActivePatientsForFacility } from "@/lib/actions/patient.actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DoctorDashboardClient from "@/components/DoctorDashboardClient";
import prisma from "@/lib/prisma";
import { ADMIN_ROLES, CLINICAL_ROLES } from "@/lib/locales/enums";

export const dynamic = "force-dynamic";

export default async function DoctorDashboardPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const role = userRole || "UNKNOWN";
  const orgId = cookieStore.get("organizationId")?.value;
  const userName = cookieStore.get("userName")?.value || "Clinician";
  const userId = cookieStore.get("userId")?.value || "";

  if (!userRole) {
    redirect("/login");
  }
  if (!CLINICAL_ROLES.includes(userRole as any) && !ADMIN_ROLES.includes(userRole as any)) {
    redirect("/unauthorized?reason=Doctor+role+required.");
  }

  let facilityName = "Unknown Facility";
  if (orgId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      if (org) facilityName = org.name;
    } catch (e) {
      console.error("Error fetching org:", e);
    }
  }

  const patients = await getActivePatientsForFacility();

  return (
    <DoctorDashboardClient
      initialPatients={patients}
      role={role}
      facilityName={facilityName}
      userName={userName}
      currentUserId={userId}
    />
  );
}
