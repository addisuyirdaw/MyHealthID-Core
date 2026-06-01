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
      setDispensedIds((prev) => new Set(prev).add(prescriptionId));
      setTimeout(() => {
        setPatients((prev) =>
          prev
            .map((p) => ({
              ...p,
              prescriptions: p.prescriptions.filter((px: any) => px.id !== prescriptionId),
            }))
            .filter((p) => p.prescriptions.length > 0)
        );
        setDispensedIds((prev) => {
          const s = new Set(prev);
          s.delete(prescriptionId);
          return s;
        });
      }, 1200);
    } catch {
      alert("Failed to dispense prescription");
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

        {/* LEFT: Patient Prescription Cards */}
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
            (selectedPatient ? [selectedPatient] : patients).map((patient) => {
              if (!patient.prescriptions || patient.prescriptions.length === 0) return null;
              const isEmergency = patient.emergencyFlag || patient.triageStatus === "RED";
              const wait = waitMinutes(patient.updatedAt || patient.createdAt);

              return (
                <div
                  key={patient.id}
                  className={`bg-neutral-900 border rounded-2xl overflow-hidden transition-all ${
                    isEmergency ? "border-red-500/40" : "border-neutral-800"
                  }`}
                >
                  {/* Patient Header */}
                  <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
                    isEmergency ? "bg-red-950/20 border-red-500/20" : "bg-neutral-900/60 border-neutral-800"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                        isEmergency
                          ? "bg-red-900/40 border-red-500/40"
                          : "bg-neutral-800 border-neutral-700"
                      }`}>
                        <User className={`w-4 h-4 ${isEmergency ? "text-red-400" : "text-neutral-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{patient.fullName}</span>
                          {isEmergency && (
                            <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Emergency
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-neutral-500">{patient.healthId}</span>
                          <span className="text-[10px] text-neutral-600">·</span>
                          <span className="text-[10px] text-neutral-500">{patient.age} yrs · {patient.sex}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-neutral-600">Waiting</div>
                        <div className={`text-sm font-bold font-mono ${wait > 20 ? "text-amber-400" : "text-neutral-400"}`}>
                          {wait}m
                        </div>
                      </div>
                      <span className="font-mono text-[10px] bg-neutral-800 border border-neutral-700 text-neutral-400 px-2 py-0.5 rounded">
                        {patient.prescriptions.length} Rx
                      </span>
                    </div>
                  </div>

                  {/* Prescriptions */}
                  <div className="divide-y divide-neutral-800/50">
                    {patient.prescriptions.map((px: any) => {
                      const isDispensed = dispensedIds.has(px.id);
                      const isDispensing = dispensing === px.id;

                      return (
                        <div key={px.id} className={`flex items-center gap-4 px-5 py-4 transition-all ${
                          isDispensed ? "bg-emerald-950/20" : ""
                        }`}>
                          {/* Drug icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isDispensed ? "bg-emerald-900/40" : "bg-violet-900/30"
                          }`}>
                            {isDispensed
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              : <Pill className="w-4 h-4 text-violet-400" />
                            }
                          </div>

                          {/* Drug info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${isDispensed ? "text-emerald-300" : "text-white"}`}>
                                {px.drugName}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                                isDispensed
                                  ? "bg-emerald-900/30 text-emerald-400 border-emerald-500/30"
                                  : "bg-neutral-800 text-neutral-500 border-neutral-700"
                              }`}>
                                {isDispensed ? "DISPENSED" : px.status}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              {px.dosage} · {px.frequency} · {px.duration}
                            </div>
                            {px.notes && (
                              <div className="text-xs text-amber-400/80 mt-0.5 truncate">📝 {px.notes}</div>
                            )}
                          </div>

                          {/* Dispense button */}
                          {!isDispensed && (
                            <button
                              onClick={() => handleDispense(px.id)}
                              disabled={isDispensing}
                              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                            >
                              {isDispensing ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispensing...</>
                              ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5" /> Dispense</>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
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
