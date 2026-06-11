import { cookies } from "next/headers";
import { getPendingAppointmentsForFacility } from "@/lib/actions/appointment.actions";
import { ReceptionistDashboardClient } from "./ReceptionistDashboardClient";

export const dynamic = "force-dynamic";

export default async function ReceptionistDashboardPage() {
  const cookieStore = cookies();
  const orgId = cookieStore.get("organizationId")?.value;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl max-w-md text-center shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Facility Required</h2>
          <p className="text-slate-400 text-sm">Please select an active facility or log in as a receptionist to manage bookings.</p>
        </div>
      </div>
    );
  }

  const res = await getPendingAppointmentsForFacility();
  const pendingRequests = (res.appointments as any) || [];

  return (
    <ReceptionistDashboardClient initialRequests={pendingRequests} />
  );
}
