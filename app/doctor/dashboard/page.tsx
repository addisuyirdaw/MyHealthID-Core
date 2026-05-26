import { getActivePatientsForFacility } from "@/lib/actions/patient.actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DoctorDashboardClient from "@/components/DoctorDashboardClient";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DoctorDashboardPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const role = userRole || "DOCTOR";
  const orgId = cookieStore.get("organizationId")?.value;
  const userName = cookieStore.get("userName")?.value || "Doctor";

  if (!userRole) {
    redirect("/login");
  }
  if (userRole !== "DOCTOR" && userRole !== "ADMIN") {
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
    />
  );
}
