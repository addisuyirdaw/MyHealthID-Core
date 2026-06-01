"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getReadyForPharmacyPatients, dispensePrescription } from "@/lib/actions/pharmacy.actions";
import GlobalPatientLookup from "@/components/GlobalPatientLookup";
import { ADMIN_ROLES, PHARMACY_ROLES } from "@/lib/locales/enums";
import {
  Pill, CheckCircle2, ShieldAlert, RefreshCw, Clock,
  AlertTriangle, User, Activity, Search, X,
  ChevronRight, Bell, Package, Loader2,
} from "lucide-react";

const MEDICATION_MASTER_LIST = [
  { category: "Analgesics", name: "Paracetamol" },
  { category: "Analgesics", name: "Ibuprofen" },
  { category: "Analgesics", name: "Diclofenac" },
  { category: "Analgesics", name: "Tramadol" },
  { category: "Analgesics", name: "Aspirin" },
  { category: "Antibiotics", name: "Amoxicillin" },
  { category: "Antibiotics", name: "Amoxicillin + Clavulanic Acid" },
  { category: "Antibiotics", name: "Ampicillin" },
  { category: "Antibiotics", name: "Ceftriaxone" },
  { category: "Antibiotics", name: "Ciprofloxacin" },
  { category: "Antibiotics", name: "Metronidazole" },
  { category: "Antibiotics", name: "Azithromycin" },
  { category: "Antimalarials", name: "Coartem" },
  { category: "Antimalarials", name: "Artesunate" },
  { category: "Antimalarials", name: "Quinine" },
  { category: "Antimalarials", name: "Chloroquine" },
  { category: "Gastrointestinal", name: "Omeprazole" },
  { category: "Gastrointestinal", name: "Pantoprazole" },
  { category: "Gastrointestinal", name: "ORS" },
  { category: "Gastrointestinal", name: "Loperamide" },
  { category: "Antihypertensives", name: "Amlodipine" },
  { category: "Antihypertensives", name: "Enalapril" },
  { category: "Antihypertensives", name: "Nifedipine" },
  { category: "Antihypertensives", name: "Atenolol" },
  { category: "Antihypertensives", name: "Furosemide" },
  { category: "Diabetes", name: "Metformin" },
  { category: "Diabetes", name: "Glibenclamide" },
  { category: "Diabetes", name: "Regular Insulin" },
  { category: "Diabetes", name: "NPH Insulin" },
  { category: "Emergency", name: "Adrenaline" },
  { category: "Emergency", name: "Atropine" },
  { category: "Emergency", name: "Diazepam" },
  { category: "Emergency", name: "Hydrocortisone" },
];

function getRoleFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((r) => r.startsWith("userRole="));
  return match ? match.split("=")[1] : "";
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function waitMinutes(d: string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

export default function PharmacyPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);
  const [dispensing, setDispensing] = useState<string | null>(null);
  const [dispensedIds, setDispensedIds] = useState<Set<string>>(new Set());
  const [lookupQuery, setLookupQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Modern states for slide-out validation drawer and checklist
  const [drawerPatientId, setDrawerPatientId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, { stock: boolean; expiry: boolean; dosage: boolean }>>({});

  const handleChecklistToggle = (pxId: string, key: "stock" | "expiry" | "dosage") => {
    setChecklist((prev) => {
      const current = prev[pxId] || { stock: false, expiry: false, dosage: false };
      return {
        ...prev,
        [pxId]: {
          ...current,
          [key]: !current[key],
        },
      };
    });
  };

  useEffect(() => {
    const r = getRoleFromCookie();
    setRole(r);
    setAuthChecked(true);
    if (PHARMACY_ROLES.includes(r as any) || ADMIN_ROLES.includes(r as any)) {
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
      const data = await getReadyForPharmacyPatients();
      setPatients(data);
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

  const handleDispense = async (prescriptionId: string) => {
    setDispensing(prescriptionId);
    try {
      await dispensePrescription(prescriptionId);
      setDispensedIds((prev) => {
        const next = new Set(prev);
        next.add(prescriptionId);
        return next;
      });
      
      // Update local state to mark prescription as dispensed
      setPatients((prev) =>
        prev.map((p) => ({
          ...p,
          prescriptions: p.prescriptions.map((px: any) =>
            px.id === prescriptionId ? { ...px, status: "DISPENSED" } : px
          ),
        }))
      );
    } catch {
      alert("Failed to dispense prescription. Please try again.");
    } finally {
      setDispensing(null);
    }
  };

  const normalizedQuery = lookupQuery.trim().toLowerCase();
  const selectedMedication = useMemo(
    () => MEDICATION_MASTER_LIST.find((drug) => drug.name.toLowerCase() === normalizedQuery) || null,
    [normalizedQuery]
  );
  const medicationSuggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return MEDICATION_MASTER_LIST.filter(
      (drug) =>
        drug.name.toLowerCase().includes(normalizedQuery) ||
        drug.category.toLowerCase().includes(normalizedQuery)
    ).slice(0, 8);
  }, [normalizedQuery]);

  const pendingCount = patients.reduce((sum, p) => sum + (p.prescriptions?.length || 0), 0);
  const emergencyCount = patients.filter(
    (p) => p.emergencyFlag || p.triageStatus === "RED"
  ).length;

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

  // ── Role guard ──────────────────────────────────────────────────────────────
  if (authChecked && !PHARMACY_ROLES.includes(role as any) && !ADMIN_ROLES.includes(role as any)) {
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
            The <span className="font-bold text-amber-400">Pharmacy Portal</span> is only accessible to Pharmacists.
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg">
            <Pill className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Pharmacy Portal</div>
            <div className="text-[10px] text-neutral-500 leading-tight">Prescription Dispensing</div>
          </div>
        </div>

        <div className="w-px h-7 bg-neutral-800" />

        <div className="ml-auto flex items-center gap-4">
          {emergencyCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-900/50 border border-red-500/40 text-red-300 text-xs px-3 py-1.5 rounded-full animate-pulse">
              <Bell className="w-3 h-3" />
              {emergencyCount} emergency
            </div>
          )}

          <div className="text-sm font-mono text-neutral-400 tabular-nums">
            ⏰ {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <span className="text-xs font-medium text-neutral-300">{role || "Pharmacist"}</span>
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
            label: "Patients Waiting",
            value: patients.length,
            sub: "At pharmacy",
            icon: <User className="w-5 h-5 text-violet-400" />,
            bg: "bg-violet-950/50",
            border: "border-violet-500/30",
            val: "text-violet-300",
          },
          {
            label: "Prescriptions",
            value: pendingCount,
            sub: "To dispense",
            icon: <Package className="w-5 h-5 text-cyan-400" />,
            bg: "bg-cyan-950/40",
            border: "border-cyan-500/30",
            val: "text-cyan-300",
          },
          {
            label: "Emergency Queue",
            value: emergencyCount,
            sub: "Priority cases",
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

      {/* ── PATIENT QUEUE STRIP ── */}
      {!loading && patients.length > 0 && (
        <div className="px-6 py-2.5 border-b border-neutral-800 bg-neutral-900/20 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-white">Queue</span>
            <span className="text-[10px] font-mono bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20">
              {patients.length} waiting
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {patients.map((p) => {
              const isEmergency = p.emergencyFlag || p.triageStatus === "RED";
              const isSelected = p.id === selectedPatientId;
              const wait = waitMinutes(p.updatedAt || p.createdAt);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(isSelected ? null : p.id)}
                  className={`flex-shrink-0 flex flex-col px-3 py-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-violet-500/20 border-violet-500/60 ring-1 ring-violet-500"
                      : isEmergency
                      ? "bg-red-950/30 border-red-500/40 hover:bg-red-950/50"
                      : "bg-neutral-800/50 border-neutral-700/50 hover:border-neutral-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isEmergency && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                    <span className="text-xs font-semibold text-white whitespace-nowrap">{p.fullName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-neutral-500">{p.healthId}</span>
                    <span className="text-[10px] text-neutral-600">· {p.prescriptions?.length || 0} Rx</span>
                    <span className={`text-[10px] ${wait > 20 ? "text-amber-400" : "text-neutral-600"}`}>· {wait}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Active Queue Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-neutral-500">
              <Loader2 className="w-12 h-12 opacity-20 animate-spin" />
              <p className="text-sm">Loading prescriptions...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-neutral-500">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-neutral-300">All Caught Up!</p>
                <p className="text-xs text-neutral-600 mt-1">No pending prescriptions to dispense.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-850 overflow-hidden bg-neutral-900/30 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[700px] border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 border-b border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-400">
                      <th className="px-5 py-4 w-60">Patient ID & Name</th>
                      <th className="px-5 py-4">Prescribed Medications</th>
                      <th className="px-5 py-4 w-44">Status</th>
                      <th className="px-5 py-4 w-40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {(selectedPatientId ? patients.filter((p) => p.id === selectedPatientId) : patients).map((patient) => {
                      if (!patient.prescriptions || patient.prescriptions.length === 0) return null;
                      
                      const isEmergency = patient.emergencyFlag || patient.triageStatus === "RED";
                      const wait = waitMinutes(patient.updatedAt || patient.createdAt);
                      
                      // Calculate overall patient status based on their prescriptions
                      const allDispensed = patient.prescriptions.every((px: any) => px.status === "DISPENSED" || dispensedIds.has(px.id));
                      const someDispensed = patient.prescriptions.some((px: any) => px.status === "DISPENSED" || dispensedIds.has(px.id));
                      const pendingRxCount = patient.prescriptions.filter((px: any) => px.status === "PENDING" && !dispensedIds.has(px.id)).length;

                      return (
                        <tr 
                          key={patient.id} 
                          className={`hover:bg-neutral-800/10 transition-colors border-b border-neutral-800/40 last:border-0 ${
                            isEmergency ? "bg-red-950/5 hover:bg-red-950/10" : ""
                          }`}
                        >
                          {/* Patient ID & Name */}
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 mt-0.5 ${
                                isEmergency
                                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                                  : "bg-neutral-800 border-neutral-700 text-neutral-400"
                              }`}>
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white text-sm truncate max-w-[130px]">{patient.fullName}</span>
                                  {isEmergency && (
                                    <span className="text-[8px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                                      <span className="w-1 h-1 rounded-full bg-red-400" /> Emergency
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[10px] text-neutral-400 mt-1 truncate">
                                  ID: <span className="font-semibold text-violet-400">{patient.healthId}</span>
                                  {patient.nationalId && (
                                    <> &middot; Nat: <span className="font-semibold text-cyan-400">{patient.nationalId}</span></>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-500 mt-0.5">
                                  {patient.age} yrs &middot; {patient.sex} &middot; ⏰ {wait}m waiting
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Prescribed Medications */}
                          <td className="px-5 py-4">
                            <div className="space-y-2 max-w-sm">
                              {patient.prescriptions.map((px: any) => {
                                const isItemDispensed = px.status === "DISPENSED" || dispensedIds.has(px.id);
                                return (
                                  <div key={px.id} className="flex items-start gap-2 leading-tight">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                                      isItemDispensed ? "bg-emerald-500" : "bg-violet-400"
                                    }`} />
                                    <div className="min-w-0">
                                      <div className={`font-semibold text-[11px] truncate ${
                                        isItemDispensed ? "text-emerald-400/60 line-through" : "text-neutral-200"
                                      }`}>
                                        {px.drugName}
                                      </div>
                                      <div className="text-[9px] text-neutral-500 truncate mt-0.5">
                                        Dosage: {px.dosage} &middot; Dur: {px.duration}
                                        {px.notes && <span className="text-amber-500/80 ml-1">({px.notes})</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            {allDispensed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> COMPLETED
                              </span>
                            ) : someDispensed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-indigo-500/10 border-indigo-500/30 text-indigo-400 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> PARTIALLY FULFILLED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-violet-500/10 border-violet-500/30 text-violet-400 text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> PENDING
                              </span>
                            )}
                            <div className="text-[9px] text-neutral-500 mt-1 font-mono">
                              {pendingRxCount} / {patient.prescriptions.length} Rx remaining
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            {allDispensed ? (
                              <button
                                disabled
                                className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 text-neutral-500 rounded-lg text-xs font-bold cursor-default"
                              >
                                Dispensed
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  // Pre-populate checklist state for this patient's pending prescriptions
                                  const nextChecklist = { ...checklist };
                                  patient.prescriptions.forEach((px: any) => {
                                    if (px.status === "PENDING" && !nextChecklist[px.id]) {
                                      nextChecklist[px.id] = { stock: false, expiry: false, dosage: false };
                                    }
                                  });
                                  setChecklist(nextChecklist);
                                  setDrawerPatientId(patient.id);
                                }}
                                className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white hover:shadow-lg hover:shadow-violet-900/10 rounded-lg text-xs font-bold transition-all border border-violet-500/30"
                              >
                                Review &amp; Dispense
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <div className="w-72 border-l border-neutral-800 bg-neutral-900/30 overflow-y-auto p-4 space-y-4 shrink-0">

          {/* Patient lookup toggle */}
          {selectedPatientId && (
            <button
              onClick={() => setSelectedPatientId(null)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-all"
            >
              <X className="w-3.5 h-3.5" /> Show all patients
            </button>
          )}

          {/* Medication Lookup */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-3 flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Medication Lookup
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Paracetamol, Amoxicillin..."
                className="w-full bg-neutral-800 border border-neutral-700 text-sm text-white rounded-lg pl-9 pr-4 py-2 outline-none focus:border-violet-500/50 transition-all placeholder:text-neutral-600"
              />
              {lookupQuery && (
                <button onClick={() => setLookupQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {selectedMedication ? (
              <div className="mt-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Generic Recognized
                </div>
                <div className="text-xs text-neutral-300"><span className="text-neutral-500">Name:</span> {selectedMedication.name}</div>
                <div className="text-xs text-neutral-300 mt-0.5"><span className="text-neutral-500">Category:</span> {selectedMedication.category}</div>
              </div>
            ) : lookupQuery.trim() ? (
              <div className="mt-3 bg-amber-950/20 border border-amber-500/20 rounded-lg p-3">
                <div className="text-xs font-semibold text-amber-400 mb-1">Custom Drug Entry</div>
                <p className="text-[10px] text-neutral-400">Not in master list. Flag for admin review.</p>
              </div>
            ) : null}

            {medicationSuggestions.length > 0 && !selectedMedication && (
              <div className="mt-3 space-y-1">
                <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Suggestions</p>
                {medicationSuggestions.map((drug) => (
                  <button
                    key={`${drug.category}-${drug.name}`}
                    onClick={() => setLookupQuery(drug.name)}
                    className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg border border-neutral-700/50 bg-neutral-800/50 hover:border-violet-500/40 hover:bg-neutral-800 transition-all text-xs"
                  >
                    <span className="text-neutral-300">{drug.name}</span>
                    <span className="text-[10px] text-neutral-600">{drug.category}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Patient History Lookup */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-3 flex items-center gap-1.5">
              <User className="w-3 h-3" /> Patient History
            </h3>
            <GlobalPatientLookup
              onOpenPatient={
                ADMIN_ROLES.includes(role as any)
                  ? (patientId) => router.push(`/doctor/patient/${patientId}`)
                  : undefined
              }
            />
          </section>

          {/* Smart Pharmacy Rules */}
          <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">Smart Rules</h3>
            {[
              "Verify drug name against the Ethiopian generic master list before dispensing.",
              "Non-matching entries are flagged as Custom Drug Entry for admin review.",
              "Emergency patients must be prioritized for immediate dispensing.",
              "All dispenses trigger an SMS notification to the patient.",
            ].map((rule, i) => (
              <div key={i} className="flex gap-2 text-[10px] text-neutral-500">
                <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span>
                <span>{rule}</span>
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* ── SLIDE-OUT DRAWER ── */}
      {drawerPatientId && (() => {
        const patient = patients.find(p => p.id === drawerPatientId);
        if (!patient) return null;
        
        const isEmergency = patient.emergencyFlag || patient.triageStatus === "RED";
        const pendingPrescriptions = patient.prescriptions.filter((px: any) => px.status === "PENDING" && !dispensedIds.has(px.id));
        const allDispensed = patient.prescriptions.every((px: any) => px.status === "DISPENSED" || dispensedIds.has(px.id));

        return (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
              onClick={() => setDrawerPatientId(null)}
            />
            {/* Drawer Panel */}
            <div className="relative w-full max-w-md h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 overflow-hidden">
              {/* Header */}
              <div className={`p-5 border-b border-neutral-850 flex items-center justify-between ${
                isEmergency ? "bg-red-950/20 border-red-500/10" : "bg-neutral-900/60"
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white leading-tight">Dispense Prescription</h3>
                    {isEmergency && (
                      <span className="text-[8px] bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                        Emergency
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1 font-semibold">
                    {patient.fullName} &middot; <span className="font-mono text-[10px] text-violet-400">{patient.healthId}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setDrawerPatientId(null)}
                  className="w-7 h-7 rounded-lg border border-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {allDispensed ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4 animate-in zoom-in duration-200">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center ring-8 ring-emerald-500/5">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">All Medications Dispensed</h4>
                      <p className="text-xs text-neutral-500 mt-1">
                        All prescriptions for {patient.fullName} have been successfully validated and dispensed.
                      </p>
                    </div>
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 text-left text-[11px] text-emerald-400 leading-relaxed font-mono w-full">
                      <div className="font-bold border-b border-emerald-500/20 pb-1 mb-1.5 uppercase text-[9px] tracking-wider">SMS Dispatch simulated</div>
                      To: {patient.emergencyContactPhone || "Patient Mobile"}<br/>
                      Msg: "Dear {patient.nationalId || patient.healthId}, your medication is ready at the pharmacy. Please collect."
                    </div>
                    <button
                      onClick={() => setDrawerPatientId(null)}
                      className="w-full py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-lg text-xs font-bold transition-all border border-neutral-700"
                    >
                      Close Workspace
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                      Pending Prescription Checklist ({pendingPrescriptions.length} remaining)
                    </div>

                    <div className="space-y-3">
                      {patient.prescriptions.map((px: any) => {
                        const isItemDispensed = px.status === "DISPENSED" || dispensedIds.has(px.id);
                        if (isItemDispensed) {
                          return (
                            <div key={px.id} className="bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-emerald-400 line-through truncate">{px.drugName}</div>
                                <div className="text-[10px] text-neutral-500 mt-0.5">Dispensation complete</div>
                              </div>
                              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          );
                        }

                        const currentCheck = checklist[px.id] || { stock: false, expiry: false, dosage: false };
                        const isVerified = currentCheck.stock && currentCheck.expiry && currentCheck.dosage;
                        const isItemDispensing = dispensing === px.id;

                        return (
                          <div key={px.id} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                            <div>
                              <div className="font-bold text-xs text-white leading-tight">💊 {px.drugName}</div>
                              <div className="text-[10px] text-neutral-500 mt-1">
                                {px.dosage} &middot; {px.duration}
                              </div>
                              {px.notes && (
                                <div className="text-[10px] text-amber-500/90 mt-1 font-mono p-2 bg-amber-500/5 border border-amber-500/10 rounded">
                                  Instructions: {px.notes}
                                </div>
                              )}
                            </div>

                            {/* Checklist Inputs */}
                            <div className="space-y-1.5 pt-1.5 border-t border-neutral-800/60">
                              {[
                                { key: "stock", label: "Verify drug availability in local inventory" },
                                { key: "expiry", label: "Verify expiration date & batch status is valid" },
                                { key: "dosage", label: "Confirm correct labeling & bilingual counseling" }
                              ].map((item) => (
                                <label 
                                  key={item.key} 
                                  className="flex items-start gap-2.5 text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer p-1.5 hover:bg-neutral-850/30 rounded transition-all select-none"
                                >
                                  <input 
                                    type="checkbox"
                                    checked={Boolean(currentCheck[item.key as "stock" | "expiry" | "dosage"])}
                                    onChange={() => handleChecklistToggle(px.id, item.key as "stock" | "expiry" | "dosage")}
                                    className="h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-800 text-violet-600 focus:ring-violet-500 focus:ring-offset-neutral-900 mt-0.5"
                                  />
                                  <span>{item.label}</span>
                                </label>
                              ))}
                            </div>

                            {/* Action Button */}
                            <button
                              onClick={() => handleDispense(px.id)}
                              disabled={!isVerified || isItemDispensing}
                              className="w-full flex items-center justify-center gap-1.5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all border border-violet-500/30 mt-2"
                            >
                              {isItemDispensing ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispensing...</>
                              ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5" /> Dispense medication</>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-neutral-800 bg-neutral-900/60 shrink-0 text-right">
                <button
                  onClick={() => setDrawerPatientId(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-lg text-xs font-bold transition-all border border-neutral-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-800 bg-neutral-900/50 px-6 py-2.5 flex items-center justify-between text-[10px] text-neutral-600 shrink-0">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          {pendingCount} prescription{pendingCount !== 1 ? "s" : ""} pending · {patients.length} patient{patients.length !== 1 ? "s" : ""} waiting
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          MyHealthID Pharmacy System
        </span>
      </footer>
    </div>
  );
}
