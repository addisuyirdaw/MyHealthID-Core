"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import GlobalPatientLookup from "@/components/GlobalPatientLookup";
import {
  HeartPulse, AlertTriangle, Search, Stethoscope, Users, Zap, Clock, Activity,
  Calendar, ChevronRight, RefreshCw, Building2, User, FlaskConical, Pill,
  DatabaseZap, Loader2, ArrowUpRight, Globe, X, CheckCircle2,
  ShieldCheck, TrendingUp, ClipboardList, Send, MapPin, FileText, Fingerprint,
} from "lucide-react";
import { getActivePatientsForFacility, searchPatientMasterRecord } from "@/lib/actions/patient.actions";

/** Returns true when the query looks like a National ID / Health ID (not a name). */
function isIdLike(q: string): boolean {
  const trimmed = q.trim();
  // Numeric IDs (Fayda FIN: 12/16 digits) or alphanumeric IDs (MHID-XXXXXX)
  return /^[0-9A-Za-z\-]{6,}$/.test(trimmed) && !/\s/.test(trimmed);
}

type Patient = any;

const TRIAGE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; badge: string; dot: string }> = {
  RED:                { label: "Emergency",       color: "text-red-400",    bg: "bg-red-950/20",    border: "border-red-500/40",   badge: "bg-red-900/50 text-red-300 border-red-500/30",      dot: "bg-red-400" },
  YELLOW:             { label: "Urgent",          color: "text-amber-400",  bg: "bg-amber-950/20",  border: "border-amber-500/40", badge: "bg-amber-900/50 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  GREEN:              { label: "Routine",         color: "text-emerald-400",bg: "bg-emerald-950/20",border: "border-emerald-500/40",badge: "bg-emerald-900/50 text-emerald-300 border-emerald-500/30",dot: "bg-emerald-400" },
  WAITING_FOR_TRIAGE: { label: "Awaiting Triage",color: "text-neutral-400", bg: "bg-neutral-900/20", border: "border-neutral-700/40", badge: "bg-neutral-800 text-neutral-400 border-neutral-700",  dot: "bg-neutral-500" },
};

function TriageBadge({ status }: { status: string }) {
  const cfg = TRIAGE_CONFIG[status] || TRIAGE_CONFIG["WAITING_FOR_TRIAGE"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${status === "RED" ? "animate-pulse" : ""}`} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ examStatus }: { examStatus: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:              { label: "Pending",      cls: "bg-neutral-800 text-neutral-400 border-neutral-700" },
    IN_PROGRESS:          { label: "In Progress",  cls: "bg-blue-900/40 text-blue-300 border-blue-500/30 animate-pulse" },
    EXAMINATION_COMPLETE: { label: "Examined",     cls: "bg-purple-900/40 text-purple-300 border-purple-500/30" },
    COMPLETED:            { label: "Completed",    cls: "bg-emerald-900/40 text-emerald-300 border-emerald-500/30" },
    RESULT_READY:         { label: "Results Ready",cls: "bg-orange-900/40 text-orange-300 border-orange-500/30" },
    READY_FOR_PHARMACY:   { label: "At Pharmacy",  cls: "bg-violet-900/40 text-violet-300 border-violet-500/30" },
  };
  const s = map[examStatus] || { label: examStatus || "—", cls: "bg-neutral-800 text-neutral-500 border-neutral-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function GlobalSearchResult({ patient, onOpen, onDismiss }: { patient: Patient; onOpen: () => void; onDismiss: () => void }) {
  const latestVital = patient.vitals?.[0];
  return (
    <div className="rounded-xl border border-blue-500/40 bg-blue-950/20 p-4 relative">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white text-sm">{patient.fullName}</p>
            <TriageBadge status={patient.triageStatus} />
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              patient.status === "ACTIVE" ? "bg-emerald-900/40 text-emerald-400" : "bg-neutral-800 text-neutral-500"
            }`}>
              {patient.status || "UNKNOWN"}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="text-xs text-blue-400 font-mono">{patient.healthId}</span>
            <span className="text-xs text-neutral-500">{patient.sex} · {patient.age} yrs</span>
            {patient.ward && <span className="text-xs text-neutral-500">{patient.ward.replace(/_/g, " ")}</span>}
          </div>
          {patient.chiefComplaint && (
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              Chief Complaint: <span className="text-neutral-300">{patient.chiefComplaint}</span>
            </p>
          )}
          {latestVital && (
            <p className="text-xs text-neutral-500 mt-0.5">
              Vitals — BP: <span className="text-neutral-300 font-mono">{latestVital.bp}</span>
              {latestVital.spO2 ? <> · SpO₂: <span className="text-neutral-300 font-mono">{latestVital.spO2}%</span></> : null}
            </p>
          )}
        </div>
      </div>
      <button
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
        onClick={onOpen}
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
        Open Full Clinical Chart
      </button>
    </div>
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
  const [currentTime, setCurrentTime] = useState(new Date());

  const [globalResults, setGlobalResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showGlobal, setShowGlobal] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Estonia model: pressing Enter in the search box triggers an immediate
   * cross-facility patient lookup via /doctor/search which auto-redirects
   * to the patient chart if a national match is found.
   */
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim().length >= 2) {
      e.preventDefault();
      // Navigate to the dedicated search page which performs a global DB lookup
      // and auto-redirects to the patient chart on a single national match.
      router.push(`/doctor/search?query=${encodeURIComponent(search.trim())}`);
    }
  }, [search, router]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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
        p.nationalId?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || p.triageStatus === filter;
      return matchesSearch && matchesFilter;
    });
  }, [patients, search, filter]);

  // ── Estonia cross-facility global search ──────────────────────────────────
  // Fires as soon as the local queue has no match.
  // ID-like queries (National ID, Health ID) use a 0 ms delay for instant
  // lookup; name-based queries debounce at 250 ms.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search || search.trim().length < 2) { setShowGlobal(false); setGlobalResults([]); return; }
    if (filteredPatients.length > 0) { setShowGlobal(false); setGlobalResults([]); return; }

    const delay = isIdLike(search) ? 0 : 250;

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPatientMasterRecord(search.trim());
        setGlobalResults(results);
        setShowGlobal(true);
      } catch (e) {
        setGlobalResults([]);
        setShowGlobal(true);
      } finally {
        setIsSearching(false);
      }
    }, delay);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, filteredPatients.length]);

  const stats = useMemo(() => ({
    total:          patients.length,
    emergency:      patients.filter((p) => p.triageStatus === "RED").length,
    urgent:         patients.filter((p) => p.triageStatus === "YELLOW").length,
    routine:        patients.filter((p) => p.triageStatus === "GREEN").length,
    awaitingTriage: patients.filter((p) => p.triageStatus === "WAITING_FOR_TRIAGE").length,
    pendingLab:     patients.filter((p) => p.investigations?.some((i: any) => i.status === "PENDING")).length,
    readyPharmacy:  patients.filter((p) => p.examStatus === "READY_FOR_PHARMACY").length,
    completed:      patients.filter((p) => p.examStatus === "COMPLETED").length,
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">

      {/* ── HEADER ── */}
      <header className="flex items-center gap-4 px-6 py-3 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Doctor Console</div>
            <div className="text-[10px] text-neutral-500 leading-tight flex items-center gap-1">
              <Building2 className="w-2.5 h-2.5" /> {facilityName}
            </div>
          </div>
        </div>

        <div className="w-px h-7 bg-neutral-800" />

        {/* ── Estonia National ID Search ── */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            )}
            <input
              id="doctor-search-input"
              type="text"
              placeholder="Search name, Health ID, National ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-neutral-800 border border-neutral-700 text-sm text-white rounded-lg pl-9 pr-8 py-2 outline-none focus:border-blue-500/60 transition-all placeholder:text-neutral-600"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setShowGlobal(false); setGlobalResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Estonia hint: appears when no local results — guides doctor to press Enter */}
          {search.trim().length >= 2 && filteredPatients.length === 0 && (
            <div className="mt-1 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-blue-400">
                {isSearching ? "Searching national registry…" : "Press ↵ Enter to open national health record"}
              </span>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {stats.emergency > 0 && (
            <div className="flex items-center gap-1.5 bg-red-900/50 border border-red-500/40 text-red-300 text-xs px-3 py-1.5 rounded-full animate-pulse">
              <Zap className="w-3 h-3" /> {stats.emergency} emergency
            </div>
          )}

          <div className="text-sm font-mono text-neutral-400 tabular-nums">
            ⏰ {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-neutral-300">{role}</span>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-lg transition-all">
                <Globe className="w-3.5 h-3.5" /> Patient Lookup
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-full">
              <DialogHeader>
                <DialogTitle>Global Patient History Lookup</DialogTitle>
                <DialogDescription>
                  Search across facilities by Health ID, National ID, FIN, card number, or name.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <GlobalPatientLookup onOpenPatient={(patientId) => router.push(`/doctor/patient/${patientId}`)} />
              </div>
            </DialogContent>
          </Dialog>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* ── TRIAGE STATS BAR ── */}
      <div className="grid grid-cols-5 gap-2 px-6 py-3 border-b border-neutral-800 bg-neutral-900/40 shrink-0">
        {[
          { label: "All Active",      count: stats.total,          icon: Users,         color: "text-neutral-300",  bg: "bg-neutral-800/50",   border: "border-neutral-700/30",   val: "ALL"              as const },
          { label: "Emergency",       count: stats.emergency,      icon: Zap,           color: "text-red-400",      bg: "bg-red-950/30",       border: "border-red-500/30",        val: "RED"              as const },
          { label: "Urgent",          count: stats.urgent,         icon: AlertTriangle, color: "text-amber-400",    bg: "bg-amber-950/30",     border: "border-amber-500/30",      val: "YELLOW"           as const },
          { label: "Routine",         count: stats.routine,        icon: Activity,      color: "text-emerald-400",  bg: "bg-emerald-950/30",   border: "border-emerald-500/30",    val: "GREEN"            as const },
          { label: "Awaiting Triage", count: stats.awaitingTriage, icon: Clock,         color: "text-neutral-400",  bg: "bg-neutral-800/40",   border: "border-neutral-700/30",   val: "WAITING_FOR_TRIAGE" as const },
        ].map((s) => (
          <button
            key={s.val}
            onClick={() => setFilter(s.val)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
              filter === s.val
                ? "border-blue-500/50 bg-blue-900/20 ring-1 ring-blue-500/20"
                : `${s.border} ${s.bg} hover:border-neutral-600`
            }`}
          >
            <s.icon className={`w-4 h-4 shrink-0 ${s.color}`} />
            <div className="text-left min-w-0">
              <p className={`text-2xl font-bold leading-none tabular-nums ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Patient Table */}
        <div className="flex-1 overflow-auto">
          {/* ── Estonia: National Patient Registry Panel ───────────────────────
               Renders as a prominent full-width banner whenever local results
               are empty and a cross-facility lookup has run. The doctor sees
               the patient's national record immediately without navigating away.
          ─────────────────────────────────────────────────────────────────── */}
          {search.trim().length >= 2 && filteredPatients.length === 0 && (
            <div className="px-6 pt-4 pb-2">

              {/* Loading state */}
              {isSearching && (
                <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-950/20 px-4 py-3">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-300">Searching National Health Registry…</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Querying all facilities across the country</p>
                  </div>
                </div>
              )}

              {/* Results */}
              {!isSearching && showGlobal && (
                <div className="space-y-3">
                  {/* Header banner */}
                  <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 to-indigo-950/30 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">National Patient Registry</span>
                      {globalResults.length > 0 && (
                        <span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {globalResults.length} match{globalResults.length > 1 ? "es" : ""} found
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/doctor/search?query=${encodeURIComponent(search.trim())}`)}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-200 transition-colors"
                    >
                      Advanced lookup <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* No match */}
                  {globalResults.length === 0 && (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-5 text-center">
                      <Fingerprint className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-neutral-400">No patient found in national database</p>
                      <p className="text-xs text-neutral-600 mt-1">The ID or name does not match any registered patient across all facilities.</p>
                      <button
                        onClick={() => router.push(`/doctor/search?query=${encodeURIComponent(search.trim())}`)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-3 py-1.5 transition-all hover:bg-blue-950/30"
                      >
                        <Search className="w-3 h-3" /> Try full search
                      </button>
                    </div>
                  )}

                  {/* Match cards */}
                  {globalResults.map((p) => {
                    const latestVital = p.vitals?.[0];
                    return (
                      <div
                        key={p.id}
                        className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-neutral-900 overflow-hidden"
                      >
                        {/* Card header */}
                        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">{p.fullName}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                <span className="text-[10px] font-mono text-blue-300">{p.healthId}</span>
                                <span className="text-[10px] text-neutral-500">{p.sex} · {p.age} yrs</span>
                                {p.ward && <span className="text-[10px] text-neutral-500">{p.ward.replace(/_/g, " ")}</span>}
                              </div>
                              {p.chiefComplaint && (
                                <p className="text-[10px] text-neutral-400 mt-0.5">
                                  Chief complaint: <span className="text-neutral-300">{p.chiefComplaint}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <TriageBadge status={p.triageStatus} />
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                              p.status === "ACTIVE" ? "bg-emerald-900/40 text-emerald-400" : "bg-neutral-800 text-neutral-500"
                            }`}>{p.status || "UNKNOWN"}</span>
                          </div>
                        </div>

                        {/* Clinical snapshot */}
                        <div className="grid grid-cols-3 gap-px bg-neutral-800/50 border-t border-blue-500/20">
                          <div className="bg-neutral-900/60 px-3 py-2">
                            <p className="text-[9px] uppercase tracking-wider text-neutral-600 font-semibold mb-0.5">Vitals</p>
                            <p className="text-[10px] text-neutral-300 font-mono">
                              {latestVital ? `BP ${latestVital.bp} · SpO₂ ${latestVital.spO2 ?? "—"}%` : "Not recorded"}
                            </p>
                          </div>
                          <div className="bg-neutral-900/60 px-3 py-2">
                            <p className="text-[9px] uppercase tracking-wider text-neutral-600 font-semibold mb-0.5">Facility</p>
                            <p className="text-[10px] text-neutral-300 truncate">
                              {p.facilityName || p.organizationId || "Unknown"}
                            </p>
                          </div>
                          <div className="bg-neutral-900/60 px-3 py-2">
                            <p className="text-[9px] uppercase tracking-wider text-neutral-600 font-semibold mb-0.5">National ID</p>
                            <p className="text-[10px] font-mono text-neutral-300">
                              {p.nationalId || p.faydaId || "—"}
                            </p>
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="flex items-center gap-2 px-4 py-3 border-t border-blue-500/20 bg-blue-950/20">
                          <button
                            onClick={() => router.push(`/doctor/patient/${p.id}`)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Open National Health Record
                          </button>
                          <button
                            onClick={() => {
                              setGlobalResults((prev) => prev.filter((r) => r.id !== p.id));
                              if (globalResults.length <= 1) setShowGlobal(false);
                            }}
                            className="p-2 text-neutral-600 hover:text-neutral-400 rounded-lg hover:bg-neutral-800 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {filteredPatients.length === 0 && !search ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500 gap-4">
              <Users className="w-16 h-16 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-400">No active patients</p>
                <p className="text-xs text-neutral-600 mt-1">Patients will appear here once registered and triaged</p>
              </div>
            </div>
          ) : filteredPatients.length === 0 && search ? (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-600 gap-2">
              <DatabaseZap className="w-10 h-10 opacity-20" />
              <p className="text-xs">No active-queue match — see system-wide results above</p>
            </div>
          ) : (
            <table className="w-full text-xs min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-neutral-900 border-b border-neutral-800">
                  {[
                    { key: "num",       label: "#" },
                    { key: "id",        label: "Health ID / NID" },
                    { key: "name",      label: "Patient Name" },
                    { key: "sex",       label: "Sex" },
                    { key: "age",       label: "Age" },
                    { key: "ward",      label: "Ward" },
                    { key: "complaint", label: "Chief Complaint" },
                    { key: "triage",    label: "Triage" },
                    { key: "vitals",    label: "Last Vitals" },
                    { key: "status",    label: "Status" },
                    { key: "seen",      label: "Arrived" },
                    { key: "action",    label: "" },
                  ].map((col) => (
                    <th key={col.key} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {filteredPatients.map((patient, idx) => {
                  const latestVital = patient.vitals?.[0];
                  const cfg = TRIAGE_CONFIG[patient.triageStatus] || TRIAGE_CONFIG["WAITING_FOR_TRIAGE"];
                  const hasActiveLab = patient.investigations?.some((i: any) => i.status === "PENDING");
                  const hasResults = patient.investigations?.some((i: any) => i.status === "COMPLETED");
                  const isRed = patient.triageStatus === "RED";

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => router.push(`/doctor/patient/${patient.id}`)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isRed
                          ? "bg-red-950/10 border-l-2 border-l-red-500 hover:bg-red-950/20"
                          : patient.triageStatus === "YELLOW"
                          ? "border-l-2 border-l-amber-500 hover:bg-amber-950/10"
                          : "border-l-2 border-l-transparent hover:bg-neutral-800/20"
                      }`}
                    >
                      {/* # */}
                      <td className="px-3 py-3 text-neutral-600 font-mono text-[10px]">{idx + 1}</td>

                      {/* Health ID */}
                      <td className="px-3 py-3 min-w-0">
                        <p className="text-[11px] font-mono text-blue-400 truncate">{patient.healthId}</p>
                        {(patient.nationalId || patient.hospitalId) && (
                          <p className="text-[9px] text-neutral-600 font-mono truncate">
                            {patient.nationalId || patient.hospitalId}
                          </p>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-3 py-3 min-w-0">
                        <p className="font-semibold text-white truncate">{patient.fullName}</p>
                        {patient.suspectedDisease && (
                          <p className="text-[10px] text-purple-400 truncate">{patient.suspectedDisease}</p>
                        )}
                      </td>

                      {/* Sex */}
                      <td className="px-3 py-3 text-neutral-400 text-center">{patient.sex?.charAt(0) || "—"}</td>

                      {/* Age */}
                      <td className="px-3 py-3 text-neutral-300 font-medium text-center">{patient.age}</td>

                      {/* Ward */}
                      <td className="px-3 py-3 text-neutral-400 truncate max-w-[90px]">{wardLabel(patient.ward)}</td>

                      {/* Chief Complaint */}
                      <td className="px-3 py-3 max-w-[120px]">
                        <span className="text-amber-300/80 text-[11px] truncate block">{patient.chiefComplaint || "—"}</span>
                      </td>

                      {/* Triage */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <TriageBadge status={patient.triageStatus} />
                      </td>

                      {/* Vitals */}
                      <td className="px-3 py-3">
                        {latestVital ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px]">
                              <HeartPulse className="w-2.5 h-2.5 text-rose-400" />
                              <span className="font-mono text-neutral-300">{latestVital.bp}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <Activity className="w-2.5 h-2.5 text-blue-400" />
                              <span className="font-mono text-neutral-500">SpO₂ {latestVital.spO2}%</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-600 italic text-[10px]">No vitals</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <StatusBadge examStatus={patient.examStatus} />
                          <div className="flex gap-1">
                            {hasActiveLab && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400">
                                <FlaskConical className="w-2.5 h-2.5" /> Lab
                              </span>
                            )}
                            {hasResults && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Arrived */}
                      <td className="px-3 py-3 whitespace-nowrap text-neutral-500 text-[10px]">
                        {timeAgo(patient.createdAt)}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/doctor/patient/${patient.id}`); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-lg transition-all"
                        >
                          Open <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* RIGHT: Summary Sidebar */}
        <div className="w-64 border-l border-neutral-800 bg-neutral-900/30 overflow-y-auto p-4 space-y-4 shrink-0">

          {/* Today Summary */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Today's Summary
            </h3>
            {[
              { label: "Total Active",     value: stats.total,         icon: <Users className="w-3.5 h-3.5 text-neutral-400" />,   cls: "text-neutral-300" },
              { label: "Emergency",        value: stats.emergency,     icon: <Zap className="w-3.5 h-3.5 text-red-400" />,         cls: "text-red-300" },
              { label: "Urgent",           value: stats.urgent,        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />, cls: "text-amber-300" },
              { label: "Pending Lab",      value: stats.pendingLab,    icon: <FlaskConical className="w-3.5 h-3.5 text-amber-400" />,  cls: "text-amber-300" },
              { label: "At Pharmacy",      value: stats.readyPharmacy, icon: <Pill className="w-3.5 h-3.5 text-violet-400" />,    cls: "text-violet-300" },
              { label: "Completed",        value: stats.completed,     icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />, cls: "text-emerald-300" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  {row.icon}
                  {row.label}
                </div>
                <span className={`text-sm font-bold tabular-nums ${row.cls}`}>{row.value}</span>
              </div>
            ))}
          </section>

          {/* Live Clock */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Current Time</div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </section>

          {/* Emergency Patients Quick List */}
          {stats.emergency > 0 && (
            <section className="bg-red-950/20 border border-red-500/20 rounded-xl p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-400 flex items-center gap-1.5 mb-3">
                <Zap className="w-3 h-3" /> Emergency Cases
              </h3>
              <div className="space-y-2">
                {patients
                  .filter((p) => p.triageStatus === "RED")
                  .slice(0, 4)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/doctor/patient/${p.id}`)}
                      className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-red-950/30 transition-all"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{p.fullName}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{p.chiefComplaint || "No complaint"}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-red-500 shrink-0 ml-auto" />
                    </button>
                  ))}
              </div>
            </section>
          )}

          {/* Referrals shortcut */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-400 flex items-center gap-1.5 mb-3">
              <ShieldCheck className="w-3 h-3" /> Referrals
            </h3>
            <Link
              href="/doctor/dashboard/referrals"
              className="flex items-center gap-2 w-full px-3 py-2 bg-orange-950/30 hover:bg-orange-950/50 border border-orange-500/25 hover:border-orange-500/40 text-orange-300 text-xs font-semibold rounded-lg transition-all"
            >
              <Send className="w-3 h-3" />
              View Referral Summaries
              <ChevronRight className="w-3 h-3 ml-auto" />
            </Link>
          </section>

          {/* Auto-refresh indicator */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] text-neutral-500">Auto-refreshes every 30 seconds</span>
          </section>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-800 bg-neutral-900/50 px-6 py-2.5 flex items-center justify-between text-[10px] text-neutral-600 shrink-0">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </span>
        <span className="text-neutral-700 font-mono">{filteredPatients.length} patient{filteredPatients.length !== 1 ? "s" : ""} shown</span>
      </footer>
    </div>
  );
}
