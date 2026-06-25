import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SYSTEM_ADMIN_ROLES } from "@/lib/locales/enums";
import { getAllApplications } from "@/lib/actions/facility-application.actions";
import { ApplicationsClient } from "./ApplicationsClient";
import { FilePlus2, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SystemAdminApplicationsPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;

  if (!userRole || !SYSTEM_ADMIN_ROLES.includes(userRole as any)) {
    redirect("/login");
  }

  const applications = await getAllApplications().catch(() => []);
  const pendingCount = applications.filter((a: any) => a.status === "PENDING").length;

  return (
    <div className="p-6 lg:p-8">
      {/* ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[55%] h-[50%] bg-amber-600/4 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 left-0 w-[45%] h-[45%] bg-indigo-600/4 rounded-full blur-[180px]" />
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <ShieldAlert className="w-3 h-3" />
            Privileged Access — Platform Level
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <FilePlus2 className="w-7 h-7 text-amber-400" />
              Facility Applications
            </h1>
            <p className="text-neutral-400 text-sm mt-1.5">
              Review, approve, or reject facility onboarding requests submitted by authenticated users.
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm font-semibold px-4 py-2.5 rounded-xl">
              <span className="w-5 h-5 rounded-full bg-amber-500/25 flex items-center justify-center text-xs font-black">
                {pendingCount}
              </span>
              Pending Review
            </div>
          )}
        </div>
      </div>

      <ApplicationsClient initialApplications={applications} />
    </div>
  );
}
