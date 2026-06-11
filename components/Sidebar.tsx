import Link from "next/link";
import { cookies } from "next/headers";
import {
  Shield, Activity, Users, ClipboardList, Pill,
  TestTubeDiagonal, QrCode, UserCircle, Lock, History, Settings, Search, Hospital, LogOut,
  Calendar
} from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";
import { LocalizedText } from "./LocalizedText";
import { LogoIcon } from "./LogoIcon";
import prisma from "@/lib/prisma";
import { logoutUser } from "@/lib/actions/auth.actions";
import { ADMIN_ROLES, CLINICAL_ROLES, TRIAGE_ROLES, LAB_ROLES, PHARMACY_ROLES, REGISTRATION_ROLES } from "@/lib/locales/enums";

export async function Sidebar() {
  const cookieStore = cookies();
  const roleCookie = cookieStore.get("userRole");
  const role = roleCookie?.value || null;
  const citizenPatientId = cookieStore.get("citizenPatientId")?.value;
  const orgId = cookieStore.get("organizationId")?.value;

  let facilityName = "Debre Berhan Referral Hospital";
  if (orgId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true }
      });
      if (org) {
        facilityName = org.name;
      }
    } catch (e) {
      console.error("[Sidebar] Failed to load facility name:", e);
    }
  }

  const isCitizen = role === "CITIZEN";
  const isAdmin = ADMIN_ROLES.includes(role as any);
  const canAccessClinical = CLINICAL_ROLES.includes(role as any) || isAdmin;
  const canAccessTriage = TRIAGE_ROLES.includes(role as any) || isAdmin;
  const canAccessLab = LAB_ROLES.includes(role as any) || isAdmin;
  const canAccessPharmacy = PHARMACY_ROLES.includes(role as any) || isAdmin;
  const canAccessRegistration = REGISTRATION_ROLES.includes(role as any) || isAdmin;

  const badgeColors: Record<string, string> = {
    ADMIN: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    DOCTOR: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    NURSE: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    RECEPTIONIST: "text-pink-400 bg-pink-500/10 border-pink-500/30",
    LAB_TECH: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    PHARMACIST: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  };
  const currentBadgeColor = role ? (badgeColors[role] ?? "text-neutral-300 bg-neutral-800/60 border-neutral-700") : "text-neutral-300 bg-neutral-800/60 border-neutral-700";

  return (
    <aside className="w-64 bg-neutral-900 text-neutral-300 min-h-screen p-4 flex flex-col hidden md:flex shrink-0">
      <div className="flex items-center justify-between gap-2 text-white font-bold text-xl mb-8 px-2 py-4 border-b border-neutral-700">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-8 h-8" />
          <span>MyHealthID</span>
        </div>
        <div>
          <Link href="/" className="text-sm text-neutral-300 hover:text-white px-2 py-1 rounded-md">Home</Link>
        </div>
      </div>

      <nav className="flex flex-col gap-1">

        {/* ── CITIZEN ROLE ─────────────────────────────────────────── */}
        {isCitizen && citizenPatientId && (
          <>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-3 py-2">My Portal</p>

            <Link
              href={`/patients/${citizenPatientId}/clinical-records`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <History className="w-5 h-5 text-blue-400" />
              <span>
                <LocalizedText tKey="nav.myHealthHistory" />
              </span>
            </Link>

            <Link
              href={`/patients/${citizenPatientId}/privacy`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Lock className="w-5 h-5 text-indigo-400" />
              <span>
                <LocalizedText tKey="nav.privacySettings" />
              </span>
            </Link>

            <Link
              href="/hospitals"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Hospital className="w-5 h-5 text-emerald-400" />
              <span>Search Facilities</span>
            </Link>

            <Link
              href="/citizen/appointments"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Calendar className="w-5 h-5 text-violet-400" />
              <span>Book Appointment</span>
            </Link>
          </>
        )}

        {/* ── CLINICAL SUITE (DOCTOR / ADMIN) ────────────────────────── */}
        {canAccessClinical && (
          <>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-3 py-2">Clinical</p>

            <Link
              href="/doctor/dashboard?filter=EMERGENCY"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Activity className="w-5 h-5 text-red-400" />
              <span className="text-red-100 font-medium">
                <LocalizedText tKey="nav.emergencyTriage" />
              </span>
            </Link>

            <Link
              href="/doctor/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Search className="w-5 h-5 text-neutral-400" />
              <LocalizedText tKey="nav.patientSearch" />
            </Link>

            <Link
              href="/doctor/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <ClipboardList className="w-5 h-5 text-neutral-400" />
              <LocalizedText tKey="nav.clinicalRecords" />
            </Link>
          </>
        )}

        {/* ── TRIAGE & SCREENING SUITE (NURSE) ────────────────────────── */}
        {canAccessTriage && (
          <>
            <p className="text-xs font-bold text-teal-500/80 uppercase tracking-widest px-3 py-2 mt-2">Nurse Portal</p>
            <Link
              href="/triage"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Activity className="w-5 h-5 text-teal-400" />
              <span>Triage Queue</span>
            </Link>
            <Link
              href="/screening"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <ClipboardList className="w-5 h-5 text-cyan-400" />
              <span>Clinical Screening</span>
            </Link>
          </>
        )}

        {/* ── RECEPTION SUITE (RECEPTIONIST) ────────────────────────── */}
        {canAccessRegistration && (
          <>
            <p className="text-xs font-bold text-pink-500/80 uppercase tracking-widest px-3 py-2 mt-2">Reception</p>
            <Link
              href="/reception"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <ClipboardList className="w-5 h-5 text-pink-400" />
              <span className="font-semibold text-pink-100">Reception Desk</span>
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Users className="w-5 h-5 text-pink-400" />
              <LocalizedText tKey="nav.citizenRegistration" />
            </Link>
            <Link
              href="/scan"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <QrCode className="w-5 h-5 text-pink-400" />
              <span>Scan ID</span>
            </Link>

            <Link
              href="/receptionist/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Calendar className="w-5 h-5 text-pink-400" />
              <span>External Bookings</span>
            </Link>
          </>
        )}

        {/* ── PHARMACY SUITE (PHARMACIST) ─────────────────────────────────── */}
        {canAccessPharmacy && (
          <>
            <p className="text-xs font-bold text-amber-500/80 uppercase tracking-widest px-3 py-2 mt-2">Pharmacy</p>
            <Link
              href="/pharmacy"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Pill className="w-5 h-5 text-amber-400" />
              <span>Pharmacy Portal</span>
            </Link>
          </>
        )}

        {/* ── LABORATORY SUITE (LAB_TECH) ─────────────────────────────────── */}
        {canAccessLab && (
          <>
            <p className="text-xs font-bold text-cyan-500/80 uppercase tracking-widest px-3 py-2 mt-2">Laboratory</p>
            <Link
              href="/lab"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <TestTubeDiagonal className="w-5 h-5 text-cyan-400" />
              <span>Laboratory Portal</span>
            </Link>
          </>
        )}

        {/* ── MANAGEMENT SUITE (ADMIN) ────────────────────────────────────── */}
        {isAdmin && (
          <>
            <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest px-3 py-2 mt-2">Admin</p>
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Shield className="w-5 h-5 text-emerald-400" />
              <span>Management Analytics</span>
            </Link>

            <Link
              href="/dashboard/settings/staff"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5 text-indigo-400" />
              <span>Staff Management</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-2 pb-4 text-xs text-neutral-500 flex flex-col gap-1 border-t border-neutral-800/60 pt-4">
        {!role ? (
          <div className="mb-3 space-y-2">
            <Link
              href="/signin"
              className="flex items-center gap-2 p-2 rounded-lg border border-neutral-700/50 bg-neutral-800/50 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
            >
              <UserCircle className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">
                <LocalizedText tKey="nav.citizenSignIn" />
              </span>
            </Link>
          </div>
        ) : (
          <div className="mb-3">
            <form action={logoutUser} method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-2 p-2 rounded-lg border border-transparent bg-neutral-800 text-neutral-200 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </form>
          </div>
        )}

        {orgId && (
          <div className="mb-3 text-neutral-400 font-medium">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Active Facility</p>
            <p className="text-neutral-300 font-bold truncate mt-0.5" title={facilityName}>{facilityName}</p>
          </div>
        )}

        <span>
          <LocalizedText tKey="nav.loggedInAs" />:
        </span>
        <span className={`font-mono font-bold px-2 py-0.5 rounded border w-max mb-1 text-xs ${currentBadgeColor}`}>{role || "None"}</span>
        <LanguageToggle />
      </div>
    </aside>
  );
}
