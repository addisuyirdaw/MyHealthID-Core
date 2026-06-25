import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SYSTEM_ADMIN_ROLES } from "@/lib/locales/enums";
import { getSysAdminDashboardStats } from "@/lib/actions/system-admin.actions";
import {
  Building2, Users, Activity, ClipboardList,
  TrendingUp, UserCheck, Zap, ShieldAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ACTION_COLORS: Record<string, string> = {
  CREATE_FACILITY:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  DELETE_FACILITY:    "bg-red-500/15 text-red-400 border-red-500/30",
  ACTIVATE_FACILITY:  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  DEACTIVATE_FACILITY:"bg-amber-500/15 text-amber-400 border-amber-500/30",
  RESET_PASSWORD:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
  ACTIVATE_USER:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  DEACTIVATE_USER:    "bg-red-500/15 text-red-400 border-red-500/30",
};

export default async function SystemAdminDashboard() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userName = cookieStore.get("userName")?.value ?? "Administrator";

  if (!userRole || !SYSTEM_ADMIN_ROLES.includes(userRole as any)) {
    redirect("/login");
  }

  const stats = await getSysAdminDashboardStats().catch(() => ({
    totalFacilities: 0,
    activeFacilities: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalPatients: 0,
    recentAuditLogs: [],
  }));

  const statCards = [
    {
      label: "Total Facilities",
      value: stats.totalFacilities,
      sub: `${stats.activeFacilities} active`,
      icon: Building2,
      color: "from-blue-600 to-indigo-700",
      glow: "shadow-blue-900/40",
      textColor: "text-blue-400",
    },
    {
      label: "Registered Staff",
      value: stats.totalUsers,
      sub: `${stats.activeUsers} active accounts`,
      icon: Users,
      color: "from-emerald-600 to-teal-700",
      glow: "shadow-emerald-900/40",
      textColor: "text-emerald-400",
    },
    {
      label: "Total Patients",
      value: stats.totalPatients,
      sub: "across all facilities",
      icon: UserCheck,
      color: "from-purple-600 to-violet-700",
      glow: "shadow-purple-900/40",
      textColor: "text-purple-400",
    },
    {
      label: "Audit Events",
      value: stats.recentAuditLogs.length,
      sub: "recent actions",
      icon: ClipboardList,
      color: "from-rose-600 to-orange-700",
      glow: "shadow-rose-900/40",
      textColor: "text-rose-400",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* ── Background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[55%] h-[50%] bg-rose-600/5 rounded-full blur-[180px]" />
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
          <Zap className="w-7 h-7 text-rose-400" />
          System Dashboard
        </h1>
        <p className="text-neutral-400 text-sm mt-1.5">
          Welcome back, <span className="text-white font-semibold">{userName}</span>. Platform-wide overview across all facilities.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-5 overflow-hidden group hover:border-neutral-700 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity" />
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg ${card.glow}`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-black text-white mb-0.5">{card.value.toLocaleString()}</p>
            <p className="text-xs font-semibold text-neutral-400">{card.label}</p>
            <p className={`text-[10px] font-medium mt-1 ${card.textColor}`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Platform health strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-neutral-900/40 border border-neutral-800/40 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div>
            <p className="text-xs font-semibold text-neutral-300">Platform Status</p>
            <p className="text-[11px] text-emerald-400 font-medium">All systems operational</p>
          </div>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/40 rounded-2xl p-4 flex items-center gap-4">
          <Activity className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-neutral-300">Inactive Facilities</p>
            <p className="text-[11px] text-blue-400 font-medium">
              {stats.totalFacilities - stats.activeFacilities} suspended
            </p>
          </div>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/40 rounded-2xl p-4 flex items-center gap-4">
          <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-neutral-300">Inactive Accounts</p>
            <p className="text-[11px] text-purple-400 font-medium">
              {stats.totalUsers - stats.activeUsers} deactivated
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent audit log ── */}
      <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-rose-400" />
            Recent Audit Events
          </h2>
          <a href="/system-admin/audit-logs" className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold transition">
            View all →
          </a>
        </div>

        {stats.recentAuditLogs.length === 0 ? (
          <div className="px-5 py-10 text-center text-neutral-500 text-sm">No audit events recorded yet.</div>
        ) : (
          <div className="divide-y divide-neutral-800/40">
            {stats.recentAuditLogs.map((log: any) => (
              <div key={log.id} className="px-5 py-3 flex items-center gap-4 hover:bg-neutral-800/20 transition">
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${ACTION_COLORS[log.action] ?? "bg-neutral-800 text-neutral-400 border-neutral-700"}`}>
                  {log.action.replace(/_/g, " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-200 font-medium truncate">
                    {log.targetName ?? log.targetId}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">by {log.actorName}</p>
                </div>
                <span className="text-[10px] text-neutral-600 shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
