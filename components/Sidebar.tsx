import Link from "next/link";
import { cookies } from "next/headers";
import { Shield, Activity, Users, ClipboardList, Pill, TestTubeDiagonal, QrCode } from "lucide-react";

export function Sidebar() {
  const roleCookie = cookies().get("userRole");
  const role = roleCookie?.value || "RECEPTIONIST";

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen p-4 flex flex-col hidden md:flex shrink-0">
      <div className="flex items-center gap-2 text-white font-bold text-xl mb-8 px-2 py-4 border-b border-slate-700">
        <Activity className="text-emerald-400" />
        <span>MyHealthID</span>
      </div>
      
      <nav className="flex flex-col gap-2">
        {/* Available to everyone / Receptionist */}
        <Link href="/register" className="flex items-center gap-3 px-3 py-2 rounded border border-transparent hover:bg-slate-800 hover:text-white transition-colors">
          <Users className="w-5 h-5 text-slate-400" />
          Patient Registration
        </Link>
        <Link href="/scan" className="flex items-center gap-3 px-3 py-2 rounded border border-transparent hover:bg-slate-800 hover:text-white transition-colors">
          <QrCode className="w-5 h-5 text-slate-400" />
          Scan ID
        </Link>

        {/* Doctor & Admin only */}
        {(role === "DOCTOR" || role === "ADMIN") && (
          <Link href="/doctor/dashboard" className="flex items-center gap-3 px-3 py-2 rounded border border-transparent hover:bg-slate-800 hover:text-white transition-colors">
            <ClipboardList className="w-5 h-5 text-slate-400" />
            Clinical Records
          </Link>
        )}

        {/* Administrator only */}
        {role === "ADMIN" && (
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 rounded border border-transparent hover:bg-slate-800 hover:text-white transition-colors">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-100">Management Analytics</span>
          </Link>
        )}

        {/* Pharmacy & Admin only */}
        {(role === "PHARMACIST" || role === "ADMIN") && (
          <Link href="/pharmacy" className="flex items-center gap-3 px-3 py-2 rounded border border-transparent hover:bg-slate-800 hover:text-white transition-colors">
            <Pill className="w-5 h-5 text-slate-400" />
            Pharmacy
          </Link>
        )}

        {/* Lab & Admin only */}
        {(role === "LAB_TECH" || role === "ADMIN") && (
          <Link href="/lab" className="flex items-center gap-3 px-3 py-2 rounded border border-transparent hover:bg-slate-800 hover:text-white transition-colors">
            <TestTubeDiagonal className="w-5 h-5 text-slate-400" />
            Laboratory
          </Link>
        )}
      </nav>

      <div className="mt-auto px-2 pb-4 text-xs text-slate-500 flex flex-col gap-1">
        <span>Logged in as:</span>
        <span className="font-mono font-bold text-slate-400">{role}</span>
      </div>
    </aside>
  );
}
