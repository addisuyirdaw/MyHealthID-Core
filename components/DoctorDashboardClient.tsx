"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HeartPulse, AlertTriangle, Search, ExternalLink,
  Stethoscope, Users, Zap, Clock, Activity,
  Calendar, ChevronRight, RefreshCw, Building2,
  User, FlaskConical, Pill
} from "lucide-react";
import { getActivePatientsForFacility } from "@/lib/actions/patient.actions";

type Patient = any;

const TRIAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; badge: string }> = {
  RED:                { label: "Emergency",      color: "text-red-700",    bg: "bg-red-50",     border: "border-red-400",   badge: "bg-red-600 text-white" },
  YELLOW:             { label: "Urgent",         color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-400", badge: "bg-amber-500 text-white" },
  GREEN:              { label: "Routine",        color: "text-green-700",  bg: "bg-green-50",   border: "border-green-400", badge: "bg-green-600 text-white" },
  WAITING_FOR_TRIAGE: { label: "Awaiting Triage", color: "text-slate-600", bg: "bg-slate-50",   border: "border-slate-300", badge: "bg-slate-500 text-white" },
};

function TriageBadge({ status }: { status: string }) {
  const cfg = TRIAGE_CONFIG[status] || TRIAGE_CONFIG["WAITING_FOR_TRIAGE"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ examStatus }: { examStatus: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:              { label: "Pending",    cls: "bg-slate-100 text-slate-600" },
    IN_PROGRESS:          { label: "In Progress", cls: "bg-blue-100 text-blue-700 animate-pulse" },
    EXAMINATION_COMPLETE: { label: "Examined",   cls: "bg-purple-100 text-purple-700" },
    COMPLETED:            { label: "Completed",  cls: "bg-green-100 text-green-700" },
    RESULT_READY:         { label: "Results Ready", cls: "bg-orange-100 text-orange-700" },
  };
  const s = map[examStatus] || { label: examStatus, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function DoctorDashboardClient({
  initialPatients,
  role,
  facilityName,
  userName,
}: {
  initialPatients: Patient[];
  role: string;
  facilityName: string;
  userName: string;
}) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "RED" | "YELLOW" | "GREEN" | "WAITING_FOR_TRIAGE">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getActivePatientsForFacility();
        setPatients(fresh);
      } catch (e) {
        console.error("Refresh failed", e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await getActivePatientsForFacility();
      setPatients(fresh);
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        !search ||
        p.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        p.healthId?.toLowerCase().includes(search.toLowerCase()) ||
        p.nationalId?.toLowerCase().includes(search.toLowerCase()) ||
        p.hospitalId?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || p.triageStatus === filter;
      return matchesSearch && matchesFilter;
    });
  }, [patients, search, filter]);

  // Stats
  const stats = useMemo(() => ({
    total: patients.length,
    emergency: patients.filter((p) => p.triageStatus === "RED").length,
    urgent: patients.filter((p) => p.triageStatus === "YELLOW").length,
    routine: patients.filter((p) => p.triageStatus === "GREEN").length,
    awaitingTriage: patients.filter((p) => p.triageStatus === "WAITING_FOR_TRIAGE").length,
  }), [patients]);

  const wardLabel = (ward: string) => ward?.replace(/_/g, " ") || "—";
  const timeAgo = (dateStr: string) => {
    if (!dateStr) return "—";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col">
      {/* ── Top Header ── */}
      <header className="bg-[#161b27] border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Doctor Console</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {facilityName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="text-sm font-semibold text-blue-400">{role}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {/* ── Triage Stats Bar ── */}
      <div className="bg-[#161b27] border-b border-slate-700/50 px-6 py-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "All Active",       count: stats.total,         icon: Users,        color: "text-slate-300", bg: "bg-slate-700/50", active: filter === "ALL",           val: "ALL" as const },
          { label: "Emergency",        count: stats.emergency,     icon: Zap,          color: "text-red-400",   bg: "bg-red-900/30",   active: filter === "RED",           val: "RED" as const },
          { label: "Urgent",           count: stats.urgent,        icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-900/30", active: filter === "YELLOW",        val: "YELLOW" as const },
          { label: "Routine",          count: stats.routine,       icon: Activity,     color: "text-green-400", bg: "bg-green-900/30", active: filter === "GREEN",         val: "GREEN" as const },
          { label: "Awaiting Triage",  count: stats.awaitingTriage, icon: Clock,        color: "text-slate-400", bg: "bg-slate-700/50", active: filter === "WAITING_FOR_TRIAGE", val: "WAITING_FOR_TRIAGE" as const },
        ].map((stat) => (
          <button
            key={stat.val}
            onClick={() => setFilter(stat.val)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all border ${
              stat.active
                ? "border-blue-500/50 bg-blue-900/20"
                : "border-slate-700/30 hover:border-slate-500/50"
            } ${stat.bg}`}
          >
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <div className="text-left">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.count}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      <div className="px-6 py-4 bg-[#0f1117] border-b border-slate-700/30 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search patient by name, Health ID, National ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-blue-500"
          />
        </div>
        <span className="text-xs text-slate-500">
          {filteredPatients.length} patient{filteredPatients.length !== 1 ? "s" : ""} shown
        </span>
      </div>

      {/* ── Active Patient Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Users className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">No active patients</p>
            <p className="text-sm text-slate-600 mt-1">
              {search || filter !== "ALL"
                ? "Try adjusting your search or filter"
                : "Patients will appear here once registered and triaged"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700/50 overflow-hidden bg-[#161b27]">
            {/* Table Header */}
            <div className="grid grid-cols-[2rem_1fr_1fr_3rem_3rem_1fr_1fr_1fr_1fr_6rem_5rem] gap-2 px-4 py-3 bg-slate-800/60 border-b border-slate-700/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>#</span>
              <span>MyHealthID / NID</span>
              <span>Patient Name</span>
              <span>Sex</span>
              <span>Age</span>
              <span>Ward / Room</span>
              <span>Chief Complaint</span>
              <span>Triage</span>
              <span>Last Vitals</span>
              <span>Status</span>
              <span></span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-700/30">
              {filteredPatients.map((patient, idx) => {
                const latestVital = patient.vitals?.[0];
                const cfg = TRIAGE_CONFIG[patient.triageStatus] || TRIAGE_CONFIG["WAITING_FOR_TRIAGE"];
                const hasActiveInvestigation = patient.investigations?.some(
                  (i: any) => i.status === "PENDING"
                );
                const hasResults = patient.investigations?.some(
                  (i: any) => i.status === "COMPLETED"
                );

                return (
                  <div
                    key={patient.id}
                    className={`grid grid-cols-[2rem_1fr_1fr_3rem_3rem_1fr_1fr_1fr_1fr_6rem_5rem] gap-2 px-4 py-3.5 items-center cursor-pointer transition-colors
                      ${patient.triageStatus === "RED"
                        ? "hover:bg-red-900/10 border-l-2 border-l-red-500"
                        : patient.triageStatus === "YELLOW"
                          ? "hover:bg-amber-900/10 border-l-2 border-l-amber-400"
                          : "hover:bg-slate-700/20 border-l-2 border-l-transparent"
                      }`}
                    onClick={() => router.push(`/doctor/patient/${patient.id}`)}
                  >
                    {/* # */}
                    <span className="text-xs text-slate-500 font-mono">{idx + 1}</span>

                    {/* MyHealthID / NID */}
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-blue-400 truncate">{patient.healthId}</p>
                      {(patient.nationalId || patient.hospitalId || patient.faydaId) && (
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          {patient.nationalId || patient.hospitalId || patient.faydaId}
                        </p>
                      )}
                    </div>

                    {/* Name */}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 truncate text-sm">{patient.fullName}</p>
                      {patient.suspectedDisease && (
                        <p className="text-[10px] text-purple-400 truncate">{patient.suspectedDisease}</p>
                      )}
                    </div>

                    {/* Sex */}
                    <span className="text-xs text-slate-400">{patient.sex?.charAt(0) || "—"}</span>

                    {/* Age */}
                    <span className="text-xs text-slate-300 font-medium">{patient.age}</span>

                    {/* Ward */}
                    <span className="text-xs text-slate-400 truncate">{wardLabel(patient.ward)}</span>

                    {/* Chief Complaint */}
                    <span className="text-xs text-slate-400 truncate">{patient.chiefComplaint || "—"}</span>

                    {/* Triage */}
                    <div>
                      <TriageBadge status={patient.triageStatus} />
                    </div>

                    {/* Vitals */}
                    <div className="text-xs text-slate-400 space-y-0.5">
                      {latestVital ? (
                        <>
                          <div className="flex items-center gap-1">
                            <HeartPulse className="w-3 h-3 text-rose-400" />
                            <span className="font-mono text-slate-300">{latestVital.bp}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3 text-blue-400" />
                            <span className="font-mono text-slate-400">SpO2 {latestVital.spO2}%</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-600 italic text-[10px]">No vitals</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1">
                      <StatusBadge examStatus={patient.examStatus} />
                      <div className="flex gap-1">
                        {hasActiveInvestigation && (
                          <span title="Pending Lab Orders" className="inline-flex items-center gap-0.5 text-[9px] text-amber-400">
                            <FlaskConical className="w-2.5 h-2.5" /> Lab
                          </span>
                        )}
                        {hasResults && (
                          <span title="Results Ready" className="inline-flex items-center gap-0.5 text-[9px] text-green-400">
                            <FlaskConical className="w-2.5 h-2.5" /> Ready
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      size="sm"
                      className="h-7 px-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/doctor/patient/${patient.id}`);
                      }}
                    >
                      Open
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-700/50 bg-[#161b27] px-6 py-3 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Auto-refreshes every 30 seconds
        </span>
      </footer>
    </div>
  );
}
