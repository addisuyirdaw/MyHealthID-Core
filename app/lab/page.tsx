"use client";

import { useEffect, useState } from "react";
import { getPendingInvestigations, updateLabResult } from "@/lib/actions/investigation.actions";
import { ADMIN_ROLES, LAB_ROLES } from "@/lib/locales/enums";
import {
  FlaskConical, CheckCircle2, Clock, ShieldAlert, RefreshCw,
  Activity, Microscope, AlertTriangle, User, Beaker, Bell,
  ChevronRight, ClipboardCheck, Plus, Trash2, Edit3,
  Building2, Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TestParameter {
  id: string;
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
}

// ── Parameter Templates ───────────────────────────────────────────────────────
const PARAMETER_TEMPLATES: Record<string, Omit<TestParameter, "value">[]> = {
  HEMATOLOGY: [
    { id: "hgb",  name: "Hemoglobin",     unit: "g/dL",    referenceRange: "M: 13.5–17.5 / F: 12–16" },
    { id: "hct",  name: "Hematocrit",     unit: "%",       referenceRange: "M: 41–53 / F: 36–46" },
    { id: "wbc",  name: "WBC Count",      unit: "×10³/µL", referenceRange: "4.5 – 11.0" },
    { id: "plt",  name: "Platelet Count", unit: "×10³/µL", referenceRange: "150 – 400" },
    { id: "rbc",  name: "RBC Count",      unit: "×10⁶/µL", referenceRange: "M: 4.5–5.9 / F: 4.0–5.2" },
    { id: "mcv",  name: "MCV",            unit: "fL",      referenceRange: "80 – 100" },
    { id: "mch",  name: "MCH",            unit: "pg",      referenceRange: "27 – 33" },
  ],
  BIOCHEMISTRY: [
    { id: "glu",   name: "Blood Glucose (RBS)", unit: "mg/dL", referenceRange: "70 – 140" },
    { id: "hba1c", name: "HbA1c",               unit: "%",     referenceRange: "< 5.7 (Normal)" },
    { id: "cr",    name: "Creatinine",           unit: "mg/dL", referenceRange: "M: 0.7–1.3 / F: 0.5–1.1" },
    { id: "bun",   name: "BUN",                  unit: "mg/dL", referenceRange: "7 – 20" },
    { id: "alt",   name: "ALT (SGPT)",           unit: "U/L",   referenceRange: "7 – 56" },
    { id: "ast",   name: "AST (SGOT)",           unit: "U/L",   referenceRange: "10 – 40" },
    { id: "tbil",  name: "Total Bilirubin",      unit: "mg/dL", referenceRange: "0.2 – 1.2" },
  ],
  MICROBIOLOGY: [
    { id: "cult", name: "Culture Result",    unit: "—", referenceRange: "No growth / Isolate" },
    { id: "gram", name: "Gram Stain",        unit: "—", referenceRange: "Negative / Positive" },
    { id: "sens", name: "Sensitivity",       unit: "—", referenceRange: "Susceptible / Resistant" },
    { id: "org",  name: "Organism Isolated", unit: "—", referenceRange: "None" },
  ],
  URINALYSIS: [
    { id: "ph",   name: "pH",               unit: "",      referenceRange: "4.5 – 8.0" },
    { id: "sg",   name: "Specific Gravity", unit: "",      referenceRange: "1.005 – 1.030" },
    { id: "prot", name: "Protein",          unit: "mg/dL", referenceRange: "Negative" },
    { id: "gluc", name: "Glucose",          unit: "",      referenceRange: "Negative" },
    { id: "ket",  name: "Ketones",          unit: "",      referenceRange: "Negative" },
    { id: "wbcu", name: "WBC/HPF",          unit: "/HPF",  referenceRange: "0 – 5" },
    { id: "rbcu", name: "RBC/HPF",          unit: "/HPF",  referenceRange: "0 – 2" },
  ],
  IMMUNOLOGY: [
    { id: "hiv",   name: "HIV Screen", unit: "—",    referenceRange: "Non-reactive" },
    { id: "hbsag", name: "HBsAg",      unit: "—",    referenceRange: "Non-reactive" },
    { id: "hcv",   name: "HCV Ab",     unit: "—",    referenceRange: "Non-reactive" },
    { id: "crp",   name: "CRP",        unit: "mg/L", referenceRange: "< 10" },
    { id: "aso",   name: "ASO Titre",  unit: "IU/mL",referenceRange: "< 200" },
  ],
  PARASITOLOGY: [
    { id: "mps",   name: "Malaria (MPS)", unit: "—", referenceRange: "Negative" },
    { id: "rdt",   name: "Malaria RDT",  unit: "—", referenceRange: "Negative" },
    { id: "stool", name: "Stool O&P",    unit: "—", referenceRange: "No ova/parasites" },
  ],
  RADIOLOGY: [
    { id: "find", name: "Radiological Findings", unit: "—", referenceRange: "Normal" },
    { id: "imp",  name: "Impression",            unit: "—", referenceRange: "—" },
    { id: "rec",  name: "Recommendation",        unit: "—", referenceRange: "—" },
  ],
};

const DEFAULT_PARAMETERS: Omit<TestParameter, "value">[] = [
  { id: "result", name: "Result", unit: "—", referenceRange: "—" },
  { id: "notes",  name: "Notes",  unit: "—", referenceRange: "—" },
];

function getParametersForCategory(category: string): TestParameter[] {
  const cat = (category || "").toUpperCase();
  const templates = PARAMETER_TEMPLATES[cat] ?? DEFAULT_PARAMETERS;
  return templates.map((t) => ({ ...t, value: "" }));
}

// ── Category colours ──────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HEMATOLOGY:   { bg: "bg-rose-900/30",    text: "text-rose-300",    border: "border-rose-500/30" },
  MICROBIOLOGY: { bg: "bg-purple-900/30",  text: "text-purple-300",  border: "border-purple-500/30" },
  BIOCHEMISTRY: { bg: "bg-blue-900/30",    text: "text-blue-300",    border: "border-blue-500/30" },
  IMMUNOLOGY:   { bg: "bg-amber-900/30",   text: "text-amber-300",   border: "border-amber-500/30" },
  URINALYSIS:   { bg: "bg-yellow-900/30",  text: "text-yellow-300",  border: "border-yellow-500/30" },
  PARASITOLOGY: { bg: "bg-emerald-900/30", text: "text-emerald-300", border: "border-emerald-500/30" },
  RADIOLOGY:    { bg: "bg-sky-900/30",     text: "text-sky-300",     border: "border-sky-500/30" },
};

function getCatStyle(category: string) {
  const key = (category || "").toUpperCase();
  return CATEGORY_COLORS[key] ?? { bg: "bg-neutral-800/50", text: "text-neutral-400", border: "border-neutral-600/30" };
}

// ── Utilities ─────────────────────────────────────────────────────────────────
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

function getFacilityTierLabel(serviceType?: string) {
  if (!serviceType) return "Internal (Local Tier)";
  const mapping: Record<string, string> = {
    HEALTH_POST: "Primary Care (Health Post)",
    HEALTH_CENTER: "Primary Care (Health Center)",
    PRIMARY_HOSPITAL: "Secondary Care (Primary Hospital)",
    GENERAL_HOSPITAL: "Secondary Care (General Hospital)",
    SPECIALIZED_HOSPITAL: "Tertiary Care (Specialized Hospital)",
    REFERRAL_HOSPITAL: "Tertiary Care (Referral Hospital)",
    PRIMARY_CLINIC: "Primary Clinic",
    SPECIALTY_CLINIC: "Specialty Clinic",
  };
  return mapping[serviceType] || serviceType.replace(/_/g, " ");
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LabPage() {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [role, setRole]                     = useState<string>("");
  const [authChecked, setAuthChecked]       = useState(false);
  const [currentTime, setCurrentTime]       = useState(new Date());
  const [refreshing, setRefreshing]         = useState(false);

  // Workspace
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [parameters, setParameters]     = useState<TestParameter[]>([]);
  const [techName, setTechName]         = useState("");
  const [comments, setComments]         = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const selectedInv = investigations.find((inv) => inv.id === selectedId) ?? null;

  // ── Auth + initial fetch ──────────────────────────────────────────────────
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

  // Reset workspace when selection changes
  useEffect(() => {
    if (selectedInv) {
      setParameters(getParametersForCategory(selectedInv.category));
      setComments("");
      setTechName("");
      setSubmitSuccess(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── Data fetching ─────────────────────────────────────────────────────────
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

  // ── Parameter helpers ─────────────────────────────────────────────────────
  const handleParamValueChange = (id: string, value: string) => {
    setParameters((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)));
  };

  const handleParamNameChange = (id: string, name: string) => {
    setParameters((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const handleAddParam = () => {
    const newId = `custom_${Date.now()}`;
    setParameters((prev) => [...prev, { id: newId, name: "", value: "", unit: "", referenceRange: "—" }]);
  };

  const handleRemoveParam = (id: string) => {
    setParameters((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Sign-off submission ───────────────────────────────────────────────────
  const handleSignOff = async () => {
    if (!selectedInv) return;
    const filled = parameters.filter((p) => p.value.trim() !== "");
    if (filled.length === 0) {
      alert("Please enter at least one parameter result before signing off.");
      return;
    }
    setSubmitting(true);
    try {
      const resultValue = filled
        .map(
          (p) =>
            `${p.name || "Parameter"}: ${p.value}${p.unit ? " " + p.unit : ""} (Ref: ${p.referenceRange})`
        )
        .join("\n");

      await updateLabResult({
        investigationId: selectedInv.id,
        resultValue,
        technicianComments: comments || undefined,
        technicianName:     techName || undefined,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setInvestigations((prev) => prev.filter((inv) => inv.id !== selectedInv.id));
        setSelectedId(null);
        setSubmitSuccess(false);
      }, 1800);
    } catch {
      alert("Failed to submit results. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const statOrders = investigations.filter((inv) => waitMinutes(inv.createdAt) > 30);
  const emergencyPatients = investigations.filter(
    (inv) => inv.patient?.emergencyFlag || inv.patient?.triageStatus === "RED"
  );

  // ── Role guard ────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-6 py-3 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center shadow-lg">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Laboratory Portal</div>
            <div className="text-[10px] text-neutral-500 leading-tight">Test Observation Fulfillment System</div>
          </div>
        </div>
        <div className="w-px h-7 bg-neutral-800" />
        <div className="ml-auto flex items-center gap-4">
          {statOrders.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-900/50 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-full animate-pulse">
              <Bell className="w-3 h-3" /> {statOrders.length} overdue
            </div>
          )}
          {emergencyPatients.length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-900/50 border border-red-500/40 text-red-300 text-xs px-3 py-1.5 rounded-full animate-pulse">
              <AlertTriangle className="w-3 h-3" /> {emergencyPatients.length} emergency
            </div>
          )}
          <div className="text-sm font-mono text-neutral-400 tabular-nums hidden sm:block">
            ⏰ {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-xs font-medium text-neutral-300 hidden sm:inline">{role || "Lab Tech"}</span>
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

      {/* ── STATS BAR ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 px-6 py-3 border-b border-neutral-800 bg-neutral-900/40 shrink-0">
        {[
          { label: "Pending Tests",      value: investigations.length,    sub: "In queue",         icon: <Beaker       className="w-5 h-5 text-amber-400" />, bg: "bg-amber-950/50", border: "border-amber-500/30", val: "text-amber-300" },
          { label: "Overdue / STAT",     value: statOrders.length,        sub: "Waiting > 30 min", icon: <Clock        className="w-5 h-5 text-rose-400"  />, bg: "bg-rose-950/40",  border: "border-rose-500/30",  val: "text-rose-300"  },
          { label: "Emergency Patients", value: emergencyPatients.length, sub: "Priority handling", icon: <AlertTriangle className="w-5 h-5 text-red-400"   />, bg: "bg-red-950/40",   border: "border-red-500/30",   val: "text-red-300"   },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${s.bg} ${s.border}`}>
            <div className="shrink-0">{s.icon}</div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{s.label}</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-2xl font-bold leading-none tabular-nums ${s.val}`}>{s.value}</span>
                <span className="text-[10px] text-neutral-500 hidden sm:inline">{s.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN: TWO-PANE LAYOUT ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3">

        {/* ── LEFT PANE: Active Order Queue ────────────────────────────────── */}
        <div className="lg:col-span-1 border-r border-neutral-800 flex flex-col overflow-hidden">

          {/* Pane header */}
          <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">Active Order Queue</span>
            </div>
            <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
              {investigations.length} orders
            </span>
          </div>

          {/* Queue cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-neutral-500">
                <Microscope className="w-10 h-10 opacity-20 animate-pulse" />
                <p className="text-xs">Loading orders...</p>
              </div>
            ) : investigations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-neutral-500">
                <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 opacity-60" />
                </div>
                <p className="text-xs text-center">
                  <span className="text-neutral-400 font-medium">Queue clear!</span><br />
                  <span className="text-neutral-600">No pending test orders.</span>
                </p>
              </div>
            ) : (
              investigations.map((inv, idx) => {
                const isEmergency = inv.patient?.emergencyFlag || inv.patient?.triageStatus === "RED";
                const waitMin     = waitMinutes(inv.createdAt);
                const isStat      = waitMin > 30;
                const isSelected  = selectedId === inv.id;
                const catStyle    = getCatStyle(inv.category);
                const doctorName  = inv.doctor
                  ? `Dr. ${[inv.doctor.firstName, inv.doctor.lastName].filter(Boolean).join(" ")}`
                  : "Ordering Provider";

                const priority = inv.diagnosticOrder?.priority || "ROUTINE";
                const isUrgent = priority === "URGENT";

                const facilityName = inv.diagnosticOrder?.originOrganization?.name || "Local Facility";
                const facilityServiceType = inv.diagnosticOrder?.originOrganization?.serviceType;
                const tierLabel = getFacilityTierLabel(facilityServiceType);

                return (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedId(isSelected ? null : inv.id)}
                    className={`w-full text-left rounded-xl border p-3.5 transition-all duration-150 focus:outline-none ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-900/10"
                        : isEmergency
                        ? "bg-red-950/20 border-red-500/30 hover:bg-red-950/30"
                        : isUrgent
                        ? "bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/30"
                        : isStat
                        ? "bg-amber-950/10 border-amber-500/20 hover:border-amber-500/40"
                        : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40"
                    }`}
                  >
                    {/* Queue # + Category */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] font-bold bg-neutral-800 border border-neutral-700 text-neutral-400 px-1.5 py-0.5 rounded">
                        L-{String(idx + 1).padStart(3, "0")}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                        {inv.category || "General"}
                      </span>
                    </div>

                    {/* Patient name + health ID */}
                    <div className="flex items-start gap-1.5 mb-1.5">
                      {isEmergency && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />}
                      <div className="min-w-0">
                        <div className={`font-bold text-sm leading-tight truncate ${isEmergency ? "text-red-200" : "text-white"}`}>
                          {inv.patient?.fullName || "Unknown Patient"}
                        </div>
                        <div className="font-mono text-[10px] text-neutral-400 mt-0.5 truncate">
                          ID: <span className="font-semibold text-cyan-400">{inv.patient?.healthId || "—"}</span>
                          {inv.patient?.nationalId && (
                            <> &middot; Nat: <span className="font-semibold text-violet-400">{inv.patient.nationalId}</span></>
                          )}
                          {inv.patient?.age !== undefined && <> &middot; {inv.patient.age} yrs</>}
                        </div>
                      </div>
                    </div>

                    {/* Test name */}
                    <div className="text-xs text-cyan-300 font-semibold truncate mb-2">
                      🧪 {inv.testName}
                    </div>

                    {/* Requesting Doctor + Origin Facility & Tier */}
                    <div className="space-y-1 mb-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <User className="w-3 h-3 text-cyan-500 shrink-0" />
                        <span className="font-medium truncate">{doctorName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                        <Building2 className="w-3 h-3 text-violet-500 shrink-0" />
                        <span className="truncate text-neutral-300 font-medium">
                          {facilityName} <span className="text-neutral-500 font-mono text-[9px]">({tierLabel})</span>
                        </span>
                      </div>
                    </div>

                    {/* Priority badge + wait time */}
                    <div className="flex items-center justify-between">
                      {isEmergency ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-red-950 border-red-500/30 text-red-400 text-[10px] font-bold animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> EMERGENCY
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-amber-950 border-amber-500/30 text-amber-400 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> URGENT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-neutral-800 border-neutral-700 text-neutral-400 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" /> Routine
                        </span>
                      )}
                      
                      <div className="flex items-center gap-1.5">
                        {isStat && (
                          <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold uppercase tracking-wider">
                            STAT
                          </span>
                        )}
                        <span className={`font-mono text-[10px] font-bold ${isStat ? "text-rose-400 animate-pulse" : "text-neutral-500"}`}>
                          ⏱️ {waitMin}m
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: Fulfillment Workspace ────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col overflow-hidden bg-neutral-950">
          {!selectedInv ? (
            // ── Empty state ───────────────────────────────────────────────
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-neutral-600">
              <div className="w-24 h-24 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <ClipboardCheck className="w-12 h-12 text-neutral-700" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-neutral-400">Fulfillment Workspace</p>
                <p className="text-sm text-neutral-600 mt-1 max-w-xs">
                  Select a test order from the Active Queue to load the result entry workspace.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-700 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2">
                <ChevronRight className="w-3 h-3" />
                Click any order card on the left panel
              </div>
            </div>

          ) : submitSuccess ? (
            // ── Success state ─────────────────────────────────────────────
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white">Results Finalized</p>
                <p className="text-sm text-emerald-400 mt-1">Signed off on: {selectedInv.testName}</p>
                <p className="text-xs text-neutral-500 mt-2">Removing from queue...</p>
              </div>
            </div>

          ) : (
            // ── Workspace ─────────────────────────────────────────────────
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Workspace sub-header */}
              <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/60 shrink-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Microscope className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">Fulfillment Workspace</span>
                    </div>
                    <h2 className="text-xl font-black text-white">{selectedInv.testName}</h2>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${getCatStyle(selectedInv.category).bg} ${getCatStyle(selectedInv.category).text} ${getCatStyle(selectedInv.category).border}`}>
                        {selectedInv.category || "General"}
                      </span>
                      <span className="text-xs text-neutral-400">
                        <span className="text-neutral-600">Patient:</span>{" "}
                        <span className="text-white font-bold">{selectedInv.patient?.fullName || "—"}</span>
                      </span>
                      <span className="font-mono text-[10px] text-neutral-500">{selectedInv.patient?.healthId || "—"}</span>
                      {selectedInv.patient?.age && (
                        <span className="text-[10px] text-neutral-500">{selectedInv.patient.age} yrs · {selectedInv.patient.sex}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-neutral-600 uppercase tracking-wide">Ordered At</div>
                    <div className="text-sm text-neutral-300 font-mono">{fmtTime(selectedInv.createdAt)}</div>
                    <div className="text-[10px] text-neutral-600">{fmtDate(selectedInv.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* Scrollable workspace body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Clinical indication panel */}
                {(() => {
                  const diagnosticNote = selectedInv.diagnosticOrder?.clinicalIndication;
                  const rawDepartment = selectedInv.department as string | null | undefined;
                  const departmentNote = rawDepartment?.startsWith("Note: ") ? rawDepartment.replace("Note: ", "") : rawDepartment;
                  const finalNote = diagnosticNote || departmentNote;
                  if (!finalNote) return null;
                  return (
                    <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                          Clinical Indication / Notes
                        </span>
                      </div>
                      <p className="text-sm text-blue-100 leading-relaxed">{finalNote}</p>
                    </div>
                  );
                })()}

                {/* ── Parameter Input Grid ──────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-bold text-white">Test Parameters</span>
                      <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-700">
                        {parameters.filter((p) => p.value.trim()).length}/{parameters.length} entered
                      </span>
                    </div>
                    <button
                      onClick={handleAddParam}
                      className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Parameter
                    </button>
                  </div>

                  <div className="rounded-xl border border-neutral-800 overflow-hidden">
                    {/* Table wrapper: horizontally scrollable on mobile */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[560px]">
                        <thead>
                          <tr className="bg-neutral-900 border-b border-neutral-800">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 w-44">Parameter Name</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 w-36">Value Input</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500 w-24">Unit</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500">Reference Range</th>
                            <th className="px-4 py-2.5 w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/60">
                          {parameters.map((param) => (
                            <tr key={param.id} className="hover:bg-neutral-800/20 transition-colors group">
                              {/* Parameter name (editable) */}
                              <td className="px-4 py-2.5">
                                <input
                                  type="text"
                                  value={param.name}
                                  onChange={(e) => handleParamNameChange(param.id, e.target.value)}
                                  placeholder="Parameter name"
                                  className="w-full bg-transparent text-neutral-200 font-semibold placeholder-neutral-600 outline-none focus:text-white transition-colors"
                                />
                              </td>
                              {/* Value input */}
                              <td className="px-4 py-2.5">
                                <input
                                  type="text"
                                  value={param.value}
                                  onChange={(e) => handleParamValueChange(param.id, e.target.value)}
                                  placeholder="Enter result"
                                  className="w-full bg-neutral-800/70 border border-neutral-700 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 rounded-lg px-3 py-1.5 text-white placeholder-neutral-600 outline-none transition-all"
                                />
                              </td>
                              {/* Unit */}
                              <td className="px-4 py-2.5 text-neutral-400 font-mono whitespace-nowrap">
                                {param.unit || "—"}
                              </td>
                              {/* Reference range */}
                              <td className="px-4 py-2.5 text-neutral-500 text-[11px]">
                                {param.referenceRange}
                              </td>
                              {/* Remove */}
                              <td className="px-4 py-2.5">
                                <button
                                  onClick={() => handleRemoveParam(param.id)}
                                  className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all"
                                  title="Remove row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ── Sign-Off Panel ────────────────────────────────────── */}
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">Technician Sign-Off</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Technician Name / Signature
                      </label>
                      <input
                        type="text"
                        value={techName}
                        onChange={(e) => setTechName(e.target.value)}
                        placeholder="e.g. Tigist Alemu, LT-2025"
                        className="w-full bg-neutral-800 border border-neutral-700 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Technician Comments
                        <span className="text-neutral-600 ml-1 normal-case font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Any observations, QC notes..."
                        className="w-full bg-neutral-800 border border-neutral-700 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSignOff}
                    disabled={submitting || parameters.filter((p) => p.value.trim()).length === 0}
                    className="w-full flex items-center justify-center gap-2.5 h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing Results...</>
                    ) : (
                      <><ClipboardCheck className="w-4 h-4" /> Sign Off &amp; Finalize Results</>
                    )}
                  </button>

                  {parameters.filter((p) => p.value.trim()).length === 0 && !submitting && (
                    <p className="text-[10px] text-center text-neutral-600">
                      Enter at least one parameter result value to enable sign-off.
                    </p>
                  )}
                </div>

              </div>{/* /scrollable body */}
            </div>
          )}
        </div>{/* /right pane */}

      </div>{/* /grid */}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-800 bg-neutral-900/50 px-6 py-2.5 flex items-center justify-between text-[10px] text-neutral-600 shrink-0">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          {investigations.length} pending test{investigations.length !== 1 ? "s" : ""} in queue
          {selectedInv && (
            <> · Viewing: <span className="text-cyan-500 ml-1">{selectedInv.testName}</span></>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          MyHealthID Laboratory System
        </span>
      </footer>

    </div>
  );
}
