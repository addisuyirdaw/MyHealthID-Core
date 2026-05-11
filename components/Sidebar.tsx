import Link from "next/link";
import { cookies } from "next/headers";
import {
  Shield, Activity, Users, ClipboardList, Pill,
  TestTubeDiagonal, QrCode, UserCircle, Lock, History, Settings, Search
} from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";
import { LocalizedText } from "./LocalizedText";
import { LogoIcon } from "./LogoIcon";

export function Sidebar() {
  const cookieStore = cookies();
  const roleCookie = cookieStore.get("userRole");
  const role = roleCookie?.value || "RECEPTIONIST";
  const citizenPatientId = cookieStore.get("citizenPatientId")?.value;

  const isCitizen = role === "CITIZEN";
  const isDoctor = role === "DOCTOR";
  const isAdmin = role === "ADMIN";
  const isPharmacist = role === "PHARMACIST";
  const isLabTech = role === "LAB_TECH";
  const isNurseOrReceptionist = role === "NURSE" || role === "RECEPTIONIST";

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen p-4 flex flex-col hidden md:flex shrink-0">
      <div className="flex items-center gap-2 text-white font-bold text-xl mb-8 px-2 py-4 border-b border-slate-700">
        <LogoIcon className="w-8 h-8" />
        <span>MyHealthID</span>
      </div>

      <nav className="flex flex-col gap-1">

        {/* ── CITIZEN ROLE ─────────────────────────────────────────── */}
        {isCitizen && citizenPatientId && (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2">My Portal</p>

            <Link
              href={`/patients/${citizenPatientId}/clinical-records`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <History className="w-5 h-5 text-blue-400" />
              <span>
                <LocalizedText tKey="nav.myHealthHistory" />
              </span>
            </Link>

            <Link
              href={`/patients/${citizenPatientId}/privacy`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Lock className="w-5 h-5 text-indigo-400" />
              <span>
                <LocalizedText tKey="nav.privacySettings" />
              </span>
            </Link>
          </>
        )}

        {/* ── DOCTOR / ADMIN ────────────────────────────────────────── */}
        {(isDoctor || isAdmin) && (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Clinical</p>

            <Link
              href="/doctor/dashboard?filter=EMERGENCY"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Activity className="w-5 h-5 text-red-400" />
              <span className="text-red-100 font-medium">
                <LocalizedText tKey="nav.emergencyTriage" />
              </span>
            </Link>

            <Link
              href="/doctor/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Search className="w-5 h-5 text-slate-400" />
              <LocalizedText tKey="nav.patientSearch" />
            </Link>

            <Link
              href="/doctor/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ClipboardList className="w-5 h-5 text-slate-400" />
              <LocalizedText tKey="nav.clinicalRecords" />
            </Link>
          </>
        )}

        {/* ── ADMIN ONLY ────────────────────────────────────────────── */}
        {isAdmin && (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2 mt-2">Admin</p>
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-100">Management Analytics</span>
            </Link>

            <Link
              href="/register"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Users className="w-5 h-5 text-slate-400" />
              <LocalizedText tKey="nav.citizenRegistration" />
            </Link>
          </>
        )}

        {/* ── RECEPTIONIST / NURSE ──────────────────────────────────── */}
        {isNurseOrReceptionist && (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2">Reception</p>
            <Link
              href="/register"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Users className="w-5 h-5 text-slate-400" />
              <LocalizedText tKey="nav.citizenRegistration" />
            </Link>
            <Link
              href="/scan"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <QrCode className="w-5 h-5 text-slate-400" />
              Scan ID
            </Link>
          </>
        )}

        {/* ── PHARMACY ─────────────────────────────────────────────── */}
        {(isPharmacist || isAdmin) && (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2 mt-2">Pharmacy</p>
            <Link
              href="/pharmacy"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Pill className="w-5 h-5 text-slate-400" />
              Pharmacy
            </Link>
          </>
        )}

        {/* ── LAB ─────────────────────────────────────────────────── */}
        {(isLabTech || isAdmin) && (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-3 py-2 mt-2">Laboratory</p>
            <Link
              href="/lab"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-800 hover:text-white transition-colors"
            >
              <TestTubeDiagonal className="w-5 h-5 text-slate-400" />
              Laboratory
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-2 pb-4 text-xs text-slate-500 flex flex-col gap-1">
        {!isCitizen && (
          <div className="mb-3 space-y-2">
            <Link
              href="/signin"
              className="flex items-center gap-2 p-2 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <UserCircle className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">
                <LocalizedText tKey="nav.citizenSignIn" />
              </span>
            </Link>
          </div>
        )}

        <span>
          <LocalizedText tKey="nav.loggedInAs" />:
        </span>
        <span className="font-mono font-bold text-slate-400">{role}</span>
        <LanguageToggle />
      </div>
    </aside>
  );
}
