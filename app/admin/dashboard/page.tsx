import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ADMIN_ROLES } from "@/lib/locales/enums";
import {
  Users, Activity, Building2, ShieldCheck, Plus,
  ArrowRight, LogOut, Settings, Award, Stethoscope,
  FlaskConical, Pill, ClipboardList, TrendingUp, Clock,
  Send, HeartPulse, UserCheck, Database, AlertTriangle,
  ChevronRight, Zap, Image as ImageIcon,
} from "lucide-react";
import { logoutUser } from "@/lib/actions/auth.actions";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  HOSPITAL_CEO:             "Hospital CEO",
  IT_HIS_ADMIN:             "IT / HIS Administrator",
  GENERAL_PRACTITIONER:     "General Practitioner",
  MEDICAL_SPECIALIST:       "Medical Specialist",
  SUB_SPECIALIST:           "Sub-Specialist",
  HEALTH_OFFICER:           "Health Officer",
  CLINICAL_NURSE:           "Clinical Nurse",
  SPECIALIZED_NURSE:        "Specialized Nurse",
  MIDWIFE:                  "Midwife",
  PHARMACIST:               "Pharmacist",
  LABORATORY_TECHNICIAN:    "Laboratory Technician",
  LABORATORY_TECHNOLOGIST:  "Laboratory Technologist",
  RECEPTIONIST:             "Receptionist",
  CARD_ROOM_CLERK:          "Card Room Clerk",
  ANESTHETIST:              "Anesthetist",
  RADIOGRAPHER:             "Radiographer",
  IESO:                     "IESO",
  FINANCE_INSURANCE:        "Finance / Insurance",
  AMBULANCE_DRIVER:         "Ambulance Driver",
  SECURITY_GUARD:           "Security Guard",
  CLEANER:                  "Cleaner",
  // legacy
  ADMIN: "Administrator",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  LAB_TECH: "Lab Technician",
};

const ROLE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  HOSPITAL_CEO:            { text: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/25" },
  IT_HIS_ADMIN:            { text: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/25" },
  GENERAL_PRACTITIONER:    { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  MEDICAL_SPECIALIST:      { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  SUB_SPECIALIST:          { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  HEALTH_OFFICER:          { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  CLINICAL_NURSE:          { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  SPECIALIZED_NURSE:       { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  MIDWIFE:                 { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  PHARMACIST:              { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25" },
  LABORATORY_TECHNICIAN:   { text: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25" },
  LABORATORY_TECHNOLOGIST: { text: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25" },
  RECEPTIONIST:            { text: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/25" },
  CARD_ROOM_CLERK:         { text: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/25" },
  ADMIN:   { text: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/25" },
  DOCTOR:  { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  NURSE:   { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  LAB_TECH:{ text: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25" },
};

const DEFAULT_ROLE_COLOR = { text: "text-neutral-400", bg: "bg-neutral-800", border: "border-neutral-700" };

export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const activeOrgId = cookieStore.get("organizationId")?.value;
  const userName = cookieStore.get("userName")?.value || "Administrator";

  if (!activeOrgId || !ADMIN_ROLES.includes(userRole as any)) {
    redirect("/login");
  }

  let organization: { id: string; name: string } | null = null;
  let staffMembers: {
    id: string; email: string; role: string;
    firstName: string | null; lastName: string | null;
    professionalLicenseNumber: string | null; createdAt: Date;
  }[] = [];
  let totalPatients = 0;
  let pendingTriage = 0;
  let activeReferrals = 0;
  let referralSummaries = 0;
  let dbOffline = false;

  try {
    organization = await prisma.organization.findUnique({ where: { id: activeOrgId } });

    [staffMembers, totalPatients, pendingTriage, activeReferrals, referralSummaries] =
      await Promise.all([
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
        prisma.patient.count({
          where: { organizationId: activeOrgId, triageStatus: "WAITING_FOR_TRIAGE" },
        }).catch(() => 0),
        prisma.referral.count().catch(() => 0),
        prisma.referralSummary.count({
          where: {
            OR: [
              { originOrganizationId: activeOrgId },
              { destinationOrganizationId: activeOrgId },
            ],
          },
        }).catch(() => 0),
      ]);
  } catch (err: any) {
    console.error("[AdminDashboard] DB error:", err.message);
    dbOffline = true;
  }

  const facilityName = organization?.name ?? "Your Facility";
  const facilityShort = facilityName.split(" - ")[0];
  const facilityLocation = facilityName.includes(" - ") ? facilityName.split(" - ")[1] : "";

  const roleCounts = staffMembers.reduce((acc, s) => {
    acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeRoles = Object.entries(roleCounts).filter(([, c]) => c > 0);

  const MODULES = [
    { href: "/triage",            label: "Emergency Triage",   icon: Zap,           color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
    { href: "/register",          label: "Patient Register",   icon: ClipboardList, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { href: "/reception",         label: "Reception Desk",     icon: UserCheck,     color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20" },
    { href: "/doctor/dashboard",  label: "Doctor Console",     icon: Stethoscope,   color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20" },
    { href: "/lab",               label: "Laboratory",         icon: FlaskConical,  color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20" },
    { href: "/pharmacy",          label: "Pharmacy",           icon: Pill,          color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
    { href: "/doctor/dashboard/referrals", label: "Referral Summaries", icon: Send, color: "text-orange-400", bg: "bg-orange-500/10",  border: "border-orange-500/20" },
    { href: "/dashboard/settings/staff",   label: "Staff Onboarding",   icon: Users, color: "text-blue-400",  bg: "bg-blue-500/10",    border: "border-blue-500/20" },
    { href: "/admin/media",       label: "Media Gallery",      icon: ImageIcon, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { href: "/admin/carousel",    label: "Carousel Slides",    icon: ImageIcon, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">

      {/* ── Background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-8%] right-[-8%] w-[45%] h-[45%] bg-blue-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-8%] left-[-8%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[140px]" />
      </div>

      {/* ── TOP NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none">MyHealthID</p>
              <p className="text-neutral-500 text-[10px] font-medium">Admin Portal</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-neutral-800/60 border border-neutral-700 rounded-full px-4 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-neutral-300 max-w-xs truncate">{facilityShort}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 hidden sm:block">
              {userName}
            </span>
            <Link href="/dashboard/settings/staff">
              <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
                <Plus className="w-3.5 h-3.5" /> Add Staff
              </button>
            </Link>
            <form action={logoutUser}>
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 text-xs font-bold px-3 py-2 rounded-xl border border-neutral-700 hover:border-red-500/40 transition"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">

        {/* ── DB OFFLINE BANNER ── */}
        {dbOffline && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-950/30 px-5 py-4 text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
            <p className="text-sm font-semibold">Database unreachable — some stats may be unavailable. Check your connection.</p>
          </div>
        )}

        {/* ── HERO HEADER ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live
            </span>
            <span className="text-neutral-500 text-xs font-medium">Connected to MyHealthID National Network</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{facilityShort}</h1>
          {facilityLocation && (
            <p className="text-neutral-400 mt-1 text-sm font-medium">📍 {facilityLocation}</p>
          )}
          <p className="text-neutral-600 text-xs font-mono mt-1">ORG: {activeOrgId}</p>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Staff",         value: staffMembers.length, icon: Users,       color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
            { label: "Patients Registered", value: totalPatients,       icon: HeartPulse,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Pending Triage",      value: pendingTriage,       icon: Clock,       color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
            { label: "Referrals Issued",    value: activeReferrals,     icon: TrendingUp,  color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20" },
            { label: "Referral Summaries",  value: referralSummaries,   icon: Send,        color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg} ${stat.border}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-tight">{stat.label}</p>
                <stat.icon className={`w-4 h-4 shrink-0 ${stat.color}`} />
              </div>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── STAFF ROSTER (2 cols) ── */}
          <div className="lg:col-span-2 bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/40">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white">Staff Roster</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400">
                  {staffMembers.length} members
                </span>
              </div>
              <Link href="/dashboard/settings/staff">
                <button className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold transition">
                  <Plus className="w-3.5 h-3.5" /> Add Member
                </button>
              </Link>
            </div>

            {staffMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <Users className="w-8 h-8 text-neutral-600" />
                </div>
                <div>
                  <p className="text-neutral-300 font-bold text-base mb-1">No staff registered yet</p>
                  <p className="text-neutral-500 text-sm">Add your first staff member to get started.</p>
                </div>
                <Link href="/dashboard/settings/staff">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 transition">
                    <Plus className="w-4 h-4" /> Onboard First Staff Member
                  </button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/60 overflow-y-auto max-h-[520px]">
                {staffMembers.map((member) => {
                  const rc = ROLE_COLORS[member.role] ?? DEFAULT_ROLE_COLOR;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-6 py-3.5 hover:bg-neutral-800/30 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-black text-neutral-300 shrink-0">
                          {(member.firstName?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white leading-tight">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-mono">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.professionalLicenseNumber && (
                          <span className="text-[9px] font-mono text-neutral-600 hidden md:block">
                            {member.professionalLicenseNumber}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${rc.bg} ${rc.border} ${rc.text}`}>
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex flex-col gap-5">

            {/* Modules grid */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-4">
                <Database className="w-3 h-3" /> Hospital Modules
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {MODULES.map(({ href, label, icon: Icon, color, bg, border }) => (
                  <Link key={href} href={href}>
                    <div className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border ${bg} ${border} hover:opacity-90 transition cursor-pointer text-center`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className={`text-[10px] font-bold leading-tight ${color}`}>{label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Role breakdown */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 mb-4">
                <Award className="w-3 h-3" /> Staff by Role
              </h3>
              {activeRoles.length === 0 ? (
                <p className="text-xs text-neutral-600 text-center py-4">No staff assigned yet.</p>
              ) : (
                <div className="space-y-1">
                  {activeRoles
                    .sort(([, a], [, b]) => b - a)
                    .map(([role, count]) => {
                      const rc = ROLE_COLORS[role] ?? DEFAULT_ROLE_COLOR;
                      const pct = Math.round((count / staffMembers.length) * 100);
                      return (
                        <div key={role} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-neutral-400 font-medium truncate max-w-[140px]">
                              {ROLE_LABELS[role] ?? role}
                            </span>
                            <span className={`font-black ${rc.text}`}>{count}</span>
                          </div>
                          <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${rc.bg} border ${rc.border}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Org ID box */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Organization ID</p>
              <p className="font-mono text-[10px] text-emerald-400 bg-neutral-950 border border-neutral-800 rounded-xl p-3 break-all select-all">
                {activeOrgId}
              </p>
              <p className="text-[10px] text-neutral-600 mt-2">Share with staff for login.</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-800 bg-neutral-900/50 mt-12 px-6 py-3 flex items-center justify-between text-[10px] text-neutral-600">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          MyHealthID Admin Portal
        </span>
        <span className="font-mono">{facilityShort}</span>
      </footer>
    </div>
  );
}
