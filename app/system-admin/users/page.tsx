import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SYSTEM_ADMIN_ROLES } from "@/lib/locales/enums";
import { getAllUsers } from "@/lib/actions/system-admin.actions";
import { UserManagementClient } from "./UserManagementClient";
import { Users, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SystemAdminUsersPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userName = cookieStore.get("userName")?.value ?? "Administrator";

  if (!userRole || !SYSTEM_ADMIN_ROLES.includes(userRole as any)) {
    redirect("/login");
  }

  const users = await getAllUsers().catch(() => []);

  return (
    <div className="p-6 lg:p-8">
      {/* ── Background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[55%] h-[50%] bg-purple-600/5 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 left-0 w-[45%] h-[45%] bg-indigo-600/5 rounded-full blur-[180px]" />
      </div>

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <ShieldAlert className="w-3 h-3" />
            Privileged Access — Platform Level
          </span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Users className="w-7 h-7 text-purple-400" />
          User Account Management
        </h1>
        <p className="text-neutral-400 text-sm mt-1.5">
          Manage all clinical, administrative, and operations staff accounts across all healthcare facilities.
        </p>
      </div>

      <UserManagementClient initialUsers={users} />
    </div>
  );
}
