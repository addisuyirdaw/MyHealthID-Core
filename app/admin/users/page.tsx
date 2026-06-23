import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ROLES } from "@/lib/locales/enums";
import {
  getAdministrativeDirectory,
  getFacilityOperationalMetrics,
} from "@/lib/actions/admin.actions";
import { UserManagementClient } from "./UserManagementClient";
import { ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const cookieStore = cookies();
  const userRole   = cookieStore.get("userRole")?.value;
  const orgId      = cookieStore.get("organizationId")?.value;
  const userName   = cookieStore.get("userName")?.value ?? "Administrator";

  // Double-guard: middleware handles cookie absence; this handles stale/invalid roles.
  if (!orgId || !ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number])) {
    redirect("/login");
  }

  // ── Parallel server-side data fetches ─────────────────────────────────────
  const [initialRecords, metrics, organization] = await Promise.all([
    getAdministrativeDirectory().catch(() => []),
    getFacilityOperationalMetrics(orgId),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, region: true, serviceType: true },
    }).catch(() => null),
  ]);

  const hospitalName   = organization?.name ?? "Your Facility";
  const hospitalRegion = organization?.region ?? null;
  const serviceType    = organization?.serviceType ?? null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">

      {/* ── Background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-500/4 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[45%] h-[45%] bg-red-500/4 rounded-full blur-[160px]" />
      </div>

      {/* ── TOP NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-sm leading-none">MyHealthID</p>
                <p className="text-neutral-500 text-[10px] font-medium">Admin Portal</p>
              </div>
            </Link>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500">
              <span>/</span>
              <Link href="/admin/dashboard" className="hover:text-neutral-300 transition">Dashboard</Link>
              <span>/</span>
              <span className="text-neutral-200 font-semibold">User Directory</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Facility badge */}
            <div className="hidden lg:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-300 truncate max-w-[160px]">
                {hospitalName}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-neutral-800/60 border border-neutral-700/60 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Restricted Area</span>
            </div>
            <div className="flex items-center gap-2 bg-neutral-800/40 border border-neutral-700/50 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-black text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-neutral-300 font-semibold hidden sm:block">{userName}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── PAGE BODY ── */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">

        {/* ── Page header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              Privileged Access
            </span>
            {hospitalRegion && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-1 rounded-full">
                📍 {hospitalRegion}
              </span>
            )}
            {serviceType && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {serviceType.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Users className="w-7 h-7 text-indigo-400" />
                User Directory
              </h1>
              <p className="text-neutral-400 text-sm mt-1.5 max-w-lg">
                Manage all registered staff and patient accounts within{" "}
                <span className="text-indigo-300 font-semibold">{hospitalName}</span>.
                Edit contact details, toggle account access, or safely purge test data.
              </p>
            </div>
          </div>
        </div>

        {/* ── Client table + metrics ── */}
        <UserManagementClient
          initialRecords={initialRecords}
          hospitalName={hospitalName}
          metrics={metrics}
        />

      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-800 bg-neutral-900/50 mt-12 px-6 py-3 flex items-center justify-between text-[10px] text-neutral-600">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-red-600" />
          MyHealthID — Restricted Admin Area · {hospitalName}
        </span>
        <span className="font-mono uppercase tracking-widest">{userRole}</span>
      </footer>
    </div>
  );
}
