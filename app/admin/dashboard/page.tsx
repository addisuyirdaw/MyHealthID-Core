import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ADMIN_ROLES } from "@/lib/locales/enums";
import {
  Users, Activity, Building2, ShieldCheck, Plus,
  ArrowRight, LogOut, Settings, Award, Stethoscope,
  FlaskConical, Pill, ClipboardList, TrendingUp, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logoutUser } from "@/lib/actions/auth.actions";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  HOSPITAL_CEO: "Hospital CEO",
  IT_HIS_ADMIN: "IT / HIS Administrator",
  GENERAL_PRACTITIONER: "General Practitioner",
  MEDICAL_SPECIALIST: "Medical Specialist",
  SUB_SPECIALIST: "Sub-Specialist",
  HEALTH_OFFICER: "Health Officer",
  CLINICAL_NURSE: "Clinical Nurse",
  SPECIALIZED_NURSE: "Specialized Nurse",
  MIDWIFE: "Midwife",
  PHARMACIST: "Pharmacist",
  LABORATORY_TECHNICIAN: "Laboratory Technician",
  LABORATORY_TECHNOLOGIST: "Laboratory Technologist",
  RECEPTIONIST: "Receptionist",
  CARD_ROOM_CLERK: "Card Room Clerk",
  // backward compatible legacy labels
  ADMIN: "Administrator",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  LAB_TECH: "Lab Technician",
};

const ROLE_COLORS: Record<string, string> = {
  HOSPITAL_CEO: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  IT_HIS_ADMIN: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  GENERAL_PRACTITIONER: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MEDICAL_SPECIALIST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  SUB_SPECIALIST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  HEALTH_OFFICER: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CLINICAL_NURSE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  SPECIALIZED_NURSE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MIDWIFE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PHARMACIST: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  LABORATORY_TECHNICIAN: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  LABORATORY_TECHNOLOGIST: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  RECEPTIONIST: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  CARD_ROOM_CLERK: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  // backward compatible legacy colors
  ADMIN: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  DOCTOR: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  NURSE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  LAB_TECH: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const activeOrgId = cookieStore.get("organizationId")?.value;

  if (!activeOrgId || !ADMIN_ROLES.includes(userRole as any)) {
    redirect("/login");
  }

  // Fetch all data for this hospital
  let organization: { id: string; name: string } | null = null;
  let staffMembers: {
    id: string; email: string; role: string;
    firstName: string | null; lastName: string | null;
    professionalLicenseNumber: string | null; createdAt: Date;
  }[] = [];
  let totalPatients = 0;
  let pendingTriage = 0;
  let activeReferrals = 0;
  let dbOffline = false;

  try {
    [organization] = await Promise.all([
      prisma.organization.findUnique({ where: { id: activeOrgId } }),
    ]);

    [staffMembers, totalPatients, pendingTriage, activeReferrals] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId: activeOrgId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, role: true,
          firstName: true, lastName: true,
          professionalLicenseNumber: true, createdAt: true,
        },
      }),
      prisma.patient.count({ where: { organizationId: activeOrgId } }).catch(() => 0),
      prisma.patient.count({ where: { organizationId: activeOrgId, triageStatus: "WAITING_FOR_TRIAGE" } }).catch(() => 0),
      prisma.referral.count().catch(() => 0),
    ]);
  } catch (err: any) {
    console.error("[AdminDashboard] DB error:", err.message);
    dbOffline = true;
  }

  const facilityDisplayName = organization?.name?.split(" - ")[0] ?? "Your Facility";
  const facilityLocation = organization?.name?.split(" - ")[1] ?? "";

  const roleCounts = staffMembers.reduce((acc, s) => {
    acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* TOP NAV */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none">MyHealthID</p>
              <p className="text-slate-500 text-[10px] font-medium">Admin Portal</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-full px-4 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-slate-300 max-w-xs truncate">{facilityDisplayName}</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings/staff">
              <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
                <Plus className="w-3.5 h-3.5" /> Add Staff
              </button>
            </Link>
            <form action={logoutUser}>
              <button type="submit" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold px-3 py-2 rounded-xl transition">
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* DB OFFLINE BANNER */}
        {dbOffline && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-red-400">
            <span className="text-xl">⚠️</span>
            <p className="text-sm font-semibold">Database unreachable — some data may be unavailable.</p>
          </div>
        )}

        {/* HERO HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold text-[10px] uppercase tracking-wider px-2">
              ● Live
            </Badge>
            <span className="text-slate-500 text-xs font-medium">Connected to MyHealthID National Network</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            {facilityDisplayName}
          </h1>
          {facilityLocation && (
            <p className="text-slate-400 mt-1 text-sm font-medium">📍 {facilityLocation}</p>
          )}
          <p className="text-slate-500 text-xs font-mono mt-1">ORG ID: {activeOrgId}</p>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Staff", value: staffMembers.length, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Patients Served", value: totalPatients, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "Pending Triage", value: pendingTriage, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "Active Referrals", value: activeReferrals, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* STAFF ROSTER — takes 2 columns */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Staff Roster</h2>
                <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px]">{staffMembers.length} members</Badge>
              </div>
              <Link href="/dashboard/settings/staff">
                <button className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold transition">
                  <Plus className="w-3.5 h-3.5" /> Add Member
                </button>
              </Link>
            </div>

            {staffMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="bg-slate-800/60 p-5 rounded-full mb-4">
                  <Users className="w-10 h-10 text-slate-600" />
                </div>
                <p className="text-slate-300 font-bold text-base mb-1">No staff registered yet</p>
                <p className="text-slate-500 text-sm mb-5">Add your first staff member to get started</p>
                <Link href="/dashboard/settings/staff">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 transition">
                    <Plus className="w-4 h-4" /> Onboard First Staff Member
                  </button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {staffMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/40 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-slate-300">
                        {(member.firstName?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.professionalLicenseNumber && (
                        <span className="text-[10px] font-mono text-slate-500 hidden md:block">
                          {member.professionalLicenseNumber}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${ROLE_COLORS[member.role] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-5">

            {/* Role breakdown */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Staff by Role</h3>
              </div>
              {Object.keys(ROLE_LABELS).map((role) => {
                const count = roleCounts[role] ?? 0;
                return (
                  <div key={role} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                    <span className="text-xs text-slate-400 font-medium">{ROLE_LABELS[role]}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${count > 0 ? ROLE_COLORS[role] : "text-slate-600 border-slate-800"}`}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Links */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Hospital Modules</h3>
              <div className="flex flex-col gap-2">
                {[
                  { href: "/dashboard/settings/staff", label: "Staff Onboarding", icon: Users, color: "text-blue-400" },
                  { href: "/triage", label: "Emergency Triage", icon: Activity, color: "text-red-400" },
                  { href: "/register", label: "Patient Register", icon: ClipboardList, color: "text-emerald-400" },
                  { href: "/doctor/dashboard", label: "Doctor Console", icon: Stethoscope, color: "text-indigo-400" },
                  { href: "/lab", label: "Laboratory", icon: FlaskConical, color: "text-cyan-400" },
                  { href: "/pharmacy", label: "Pharmacy", icon: Pill, color: "text-amber-400" },
                ].map(({ href, label, icon: Icon, color }) => (
                  <Link key={href} href={href}>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition cursor-pointer group border border-transparent hover:border-slate-700">
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition">{label}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Org ID copy box */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Your Organization ID</p>
              <p className="font-mono text-xs text-emerald-400 bg-slate-950 border border-slate-800 rounded-xl p-3 break-all select-all">
                {activeOrgId}
              </p>
              <p className="text-[10px] text-slate-600 mt-2">Share this ID with your staff for login.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
