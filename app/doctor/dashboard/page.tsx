import { getPatientsByWard, searchPatients } from "@/lib/actions/patient.actions";
import { Ward } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DoctorDashboardClient from "@/components/DoctorDashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { ward?: string; search?: string };
}) {
  const currentWard = (searchParams.ward as Ward) || "OPD_OUTPATIENT";
  const searchQuery = searchParams.search || "";
  const roleCookie = cookies().get("userRole");
  
  // if (!roleCookie || !roleCookie.value) {
  //   redirect("/register");
  // }
  
  const role = roleCookie?.value || 'DOCTOR';

  // Fetch patients for the selected ward or search query
  const patients = searchQuery 
    ? await searchPatients(searchQuery)
    : await getPatientsByWard(currentWard);

  return (
    <DoctorDashboardClient 
      initialPatients={patients} 
      currentWard={currentWard} 
      searchQuery={searchQuery} 
      role={role} 
    />
  );
}
