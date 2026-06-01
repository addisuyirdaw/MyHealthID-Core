"use client";

import { useEffect, useState } from "react";
import { getPendingInvestigations } from "@/lib/actions/investigation.actions";
import { FulfillOrderModal } from "@/components/FulfillOrderModal";
import { ADMIN_ROLES, LAB_ROLES } from "@/lib/locales/enums";
import {
  FlaskConical, CheckCircle2, Clock, ShieldAlert, RefreshCw,
  Activity, Microscope, AlertTriangle, User, LogOut,
  Beaker, Hospital, ChevronRight, Bell,
} from "lucide-react";

function getRoleFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((r) => r.startsWith("userRole="));
  return match ? match.split("=")[1] : "";
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
}

function waitMinutes(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HEMATOLOGY:     { bg: "bg-rose-900/30",    text: "text-rose-300",    border: "border-rose-500/30" },
  MICROBIOLOGY:   { bg: "bg-purple-900/30",  text: "text-purple-300",  border: "border-purple-500/30" },
  BIOCHEMISTRY:   { bg: "bg-blue-900/30",    text: "text-blue-300",    border: "border-blue-500/30" },
  IMMUNOLOGY:     { bg: "bg-amber-900/30",   text: "text-amber-300",   border: "border-amber-500/30" },
  URINALYSIS:     { bg: "bg-yellow-900/30",  text: "text-yellow-300",  border: "border-yellow-500/30" },
  PARASITOLOGY:   { bg: "bg-emerald-900/30", text: "text-emerald-300", border: "border-emerald-500/30" },
  RADIOLOGY:      { bg: "bg-sky-900/30",     text: "text-sky-300",     border: "border-sky-500/30" },
};

function getCatStyle(category: string) {
  const key = (category || "").toUpperCase();
  return CATEGORY_COLORS[key] || { bg: "bg-neutral-800/50", text: "text-neutral-400", border: "border-neutral-600/30" };
}

export default function LabPage() {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const r = getRoleFromCookie();
    setRole(r);
    setAuthChecked(true);
    if (LAB_ROLES.includes(r as any) || ADMIN_ROLES.includes(r as any)) {
      fetchPending();
    } else {
      setLoading(false);
    }
  }, []);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const data = await getPendingInvestigations();
      setInvestigations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPending();
    setRefreshing(false);
  };

  const handleSuccess = (id: string) => {
    setInvestigations((prev) => prev.filter((inv) => inv.id !== id));
  };

  // Stats
  const statOrders = investigations.filter((inv) => {
    const waitMs = Date.now() - new Date(inv.createdAt).getTime();
    return waitMs > 30 * 60 * 1000; // > 30 minutes = STAT
  });
  const emergencyPatients = investigations.filter((inv) =>
    inv.patient?.emergencyFlag || inv.patient?.triageStatus === "RED"
  );

  // ── Role guard ──────────────────────────────────────────────────────────────
  if (authChecked && !LAB_ROLES.includes(role as any) && !ADMIN_ROLES.includes(role as any)) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 shadow-2xl text-center max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center ring-8 ring-amber-500/5">
              <ShieldAlert className="w-10 h-10 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Access Restricted</h2>
          <p className="text-neutral-400 text-sm mb-2">
            The <span className="font-bold text-cyan-400">Laboratory Portal</span> is only accessible to Lab Technicians.
          </p>
          {role && (
            <p className="text-xs text-neutral-500 mb-6">
              Your current role:{" "}
              <span className="font-mono font-bold text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded">{role}</span>
            </p>
          )}
          <button
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl h-11 border border-neutral-700 text-sm font-semibold transition-all"
            onClick={() => window.history.back()}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">

      {/* ── HEADER ── */}
      <header className="flex items-center gap-4 px-6 py-3 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center shadow-lg">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Laboratory Portal</div>
            <div className="text-[10px] text-neutral-500 leading-tight">Test Request Management</div>
          </div>
        </div>

        <div className="w-px h-7 bg-neutral-800" />

        <div className="ml-auto flex items-center gap-4">
          {/* STAT alert */}
          {statOrders.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-900/50 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-full animate-pulse">
              <Bell className="w-3 h-3" />
              {statOrders.length} overdue order{statOrders.length > 1 ? "s" : ""}
            </div>
          )}
          {emergencyPatients.length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-900/50 border border-red-500/40 text-red-300 text-xs px-3 py-1.5 rounded-full animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              {emergencyPatients.length} emergency
            </div>
          )}

          <div className="text-sm font-mono text-neutral-400 tabular-nums">
            ⏰ {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-xs font-medium text-neutral-300">{role || "Lab Tech"}</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-3 gap-3 px-6 py-3 border-b border-neutral-800 bg-neutral-900/40 shrink-0">
        {[
          {
            label: "Pending Tests",
            value: investigations.length,
            sub: "In queue",
            icon: <Beaker className="w-5 h-5 text-amber-400" />,
            bg: "bg-amber-950/50",
            border: "border-amber-500/30",
            val: "text-amber-300",
          },
          {
            label: "Overdue / STAT",
            value: statOrders.length,
            sub: "Waiting > 30 min",
            icon: <Clock className="w-5 h-5 text-rose-400" />,
            bg: "bg-rose-950/40",
            border: "border-rose-500/30",
            val: "text-rose-300",
          },
          {
            label: "Emergency Patients",
            value: emergencyPatients.length,
            sub: "Priority handling",
            icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
            bg: "bg-red-950/40",
            border: "border-red-500/30",
            val: "text-red-300",
          },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-4 rounded-xl px-5 py-3.5 border ${s.bg} ${s.border}`}>
            <div className="shrink-0">{s.icon}</div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{s.label}</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-3xl font-bold leading-none tabular-nums ${s.val}`}>{s.value}</span>
                <span className="text-[10px] text-neutral-500">{s.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-neutral-500">
            <Microscope className="w-12 h-12 opacity-20 animate-pulse" />
            <p className="text-sm">Loading pending tests...</p>
          </div>
        ) : investigations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-neutral-500">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-300">All Caught Up!</p>
              <p className="text-xs text-neutral-600 mt-1">No pending investigations at the moment.</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-xs min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-neutral-900 border-b border-neutral-800">
                {[
                  { key: "q",        label: "Queue" },
                  { key: "patient",  label: "Patient" },
                  { key: "id",       label: "Health ID" },
                  { key: "test",     label: "Test Name" },
                  { key: "cat",      label: "Category" },
                  { key: "note",     label: "Clinical Note" },
                  { key: "ordered",  label: "Ordered At" },
                  { key: "wait",     label: "Wait Time" },
                  { key: "priority", label: "Priority" },
                  { key: "action",   label: "Action" },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {investigations.map((inv, idx) => {
                const isEmergency = inv.patient?.emergencyFlag || inv.patient?.triageStatus === "RED";
                const waitMin = waitMinutes(inv.createdAt);
                const isStat = waitMin > 30;
                const catStyle = getCatStyle(inv.category);
                const clinicalNote = inv.department?.startsWith("Note: ")
                  ? inv.department.replace("Note: ", "")
                  : inv.department || "—";

                return (
                  <tr
                    key={inv.id}
                    className={`transition-colors duration-150 ${
                      isEmergency
                        ? "bg-red-950/15 border-l-2 border-l-red-500"
                        : isStat
                        ? "bg-amber-950/10 border-l-2 border-l-amber-500"
                        : "hover:bg-neutral-800/20 border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Queue No */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-[10px] font-bold bg-neutral-800 border border-neutral-700 text-neutral-300 px-2 py-0.5 rounded">
                        L-{String(idx + 1).padStart(3, "0")}
                      </span>
                    </td>

                    {/* Patient Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isEmergency && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                        <span className={`font-medium ${isEmergency ? "text-red-200" : "text-neutral-100"}`}>
                          {inv.patient?.fullName || "—"}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        {inv.patient?.age} yrs · {inv.patient?.sex}
                      </div>
                    </td>

                    {/* Health ID */}
                    <td className="px-4 py-3 font-mono text-[10px] text-neutral-500 whitespace-nowrap">
                      {inv.patient?.healthId || "—"}
                    </td>

                    {/* Test Name */}
                    <td className="px-4 py-3">
                      <span className="text-white font-semibold">{inv.testName}</span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                        {inv.category || "General"}
                      </span>
                    </td>

                    {/* Clinical Note */}
                    <td className="px-4 py-3 max-w-[140px]">
                      <span className="text-neutral-400 text-[11px] truncate block">{clinicalNote}</span>
                    </td>

                    {/* Ordered At */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-neutral-400">
                        <Clock className="w-3 h-3 text-neutral-600" />
                        {fmtTime(inv.createdAt)}
                      </div>
                      <div className="text-[10px] text-neutral-600">{fmtDate(inv.createdAt)}</div>
                    </td>

                    {/* Wait Time */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`font-mono font-bold text-xs ${isStat ? "text-amber-400" : "text-neutral-400"}`}>
                        {waitMin}m
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEmergency ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-red-900/40 border-red-500/30 text-red-300 text-[10px] font-semibold animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          Emergency
                        </span>
                      ) : isStat ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-amber-900/40 border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          STAT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-neutral-800 border-neutral-700 text-neutral-400 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                          Routine
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <FulfillOrderModal
                        investigationId={inv.id}
                        testName={inv.testName}
                        patientName={inv.patient?.fullName || "Unknown Patient"}
                        onSuccess={() => handleSuccess(inv.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-800 bg-neutral-900/50 px-6 py-2.5 flex items-center justify-between text-[10px] text-neutral-600 shrink-0">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          {investigations.length} pending test{investigations.length !== 1 ? "s" : ""} in queue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          MyHealthID Laboratory System
        </span>
      </footer>
    </div>
  );
}
