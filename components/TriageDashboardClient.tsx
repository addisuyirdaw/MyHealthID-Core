"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowRight, Brain, Clock, Plus, Search,
  Stethoscope, User, AlertTriangle, CheckCircle2, ShieldAlert,
  Thermometer, Heart, Droplets, Wind, ShieldCheck,
  FlameKindling, FileText, Send, Printer, RefreshCw, X,
  ChevronRight, Bell, Hospital, LogOut, Phone, MessageSquare,
} from "lucide-react";
import { processTriage, recordVitals, updatePatientPhoneByStaff } from "@/lib/actions/patient.actions";
import { logoutUser } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import GlobalPatientLookup from "@/components/GlobalPatientLookup";

// ─── Types ───────────────────────────────────────────────────────────────────
type TriageCategory = "EMERGENCY" | "URGENT" | "SEMI_URGENT" | "NON_URGENT";

// ─── Priority Category Config ─────────────────────────────────────────────────
const TRIAGE_CATEGORIES: {
  id: TriageCategory;
  label: string;
  sub: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
  badge: string;
  dbStatus: "RED" | "YELLOW" | "GREEN";
  serviceType: string;
}[] = [
  {
    id: "EMERGENCY",
    label: "Emergency",
    sub: "Immediate",
    emoji: "🔴",
    color: "text-red-400",
    bg: "bg-red-950/50",
    border: "border-red-500/40",
    ring: "ring-red-500",
    badge: "bg-red-900/50 text-red-300 border-red-500/30",
    dbStatus: "RED",
    serviceType: "EMERGENCY",
  },
  {
    id: "URGENT",
    label: "Urgent",
    sub: "Within 15 min",
    emoji: "🟠",
    color: "text-orange-400",
    bg: "bg-orange-950/50",
    border: "border-orange-500/40",
    ring: "ring-orange-500",
    badge: "bg-orange-900/50 text-orange-300 border-orange-500/30",
    dbStatus: "YELLOW",
    serviceType: "OPD",
  },
  {
    id: "SEMI_URGENT",
    label: "Semi-Urgent",
    sub: "Within 30 min",
    emoji: "🟡",
    color: "text-yellow-400",
    bg: "bg-yellow-950/50",
    border: "border-yellow-500/40",
    ring: "ring-yellow-500",
    badge: "bg-yellow-900/50 text-yellow-300 border-yellow-500/30",
    dbStatus: "YELLOW",
    serviceType: "OPD",
  },
  {
    id: "NON_URGENT",
    label: "Non-Urgent",
    sub: "Standard care",
    emoji: "🟢",
    color: "text-emerald-400",
    bg: "bg-emerald-950/50",
    border: "border-emerald-500/40",
    ring: "ring-emerald-500",
    badge: "bg-emerald-900/50 text-emerald-300 border-emerald-500/30",
    dbStatus: "GREEN",
    serviceType: "OPD",
  },
];

// ─── Chief Complaint Options ──────────────────────────────────────────────────
const CHIEF_COMPLAINTS = [
  "Chest Pain",
  "Fever",
  "Trauma",
  "Shortness of Breath",
  "Abdominal Pain",
  "Headache",
  "Vomiting / Nausea",
  "Dizziness / Fainting",
  "Bleeding",
  "Seizure",
  "Back Pain",
  "Hypertension",
  "Difficulty Urinating",
  "Skin Rash",
  "Eye Problem",
  "Other",
];

// ─── Disposition / Ward Options ───────────────────────────────────────────────
const DISPOSITION_OPTIONS = [
  { value: "EMERGENCY",       label: "🚨 Emergency Room (ER)" },
  { value: "OPD_OUTPATIENT",  label: "🏥 OPD Clinic" },
  { value: "MEDICAL_WARD",    label: "🛏  Medical Ward" },
  { value: "SURGICAL_WARD",   label: "🔪 Surgical Ward" },
  { value: "MATERNITY_WARD",  label: "👶 Maternity" },
  { value: "LABORATORY",      label: "🧪 Lab First" },
  { value: "DISCHARGE",       label: "📤 Discharge" },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const RED_FLAG_TEMP = 38.5;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCardNo(p: any): string {
  return p.hospitalId || p.nationalId || p.healthId || "—";
}

function fmtTime(d: string | Date) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getAiSuggestion(patient: any): TriageCategory {
  const c = (patient?.chiefComplaint || "").toLowerCase();
  if (
    c.includes("chest pain") ||
    c.includes("bleeding") ||
    c.includes("trauma") ||
    c.includes("seizure") ||
    c.includes("shortness of breath") ||
    patient?.emergencyFlag
  )
    return "EMERGENCY";
  if (c.includes("fever") || c.includes("vomit") || c.includes("abdominal"))
    return "URGENT";
  if (c.includes("headache") || c.includes("back pain") || c.includes("dizziness"))
    return "SEMI_URGENT";
  return "NON_URGENT";
}

// ─────────────────────────────────────────────────────────────────────────────
function EditPhoneForm({
  patientId,
  currentPhone,
  staffId,
  role,
  facilityId,
  onSuccess,
}: {
  patientId: string;
  currentPhone: string;
  staffId: string;
  role: string;
  facilityId: string;
  onSuccess: (val: string) => void;
}) {
  const [newPhone, setNewPhone] = useState(currentPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await updatePatientPhoneByStaff(
        patientId,
        newPhone,
        staffId,
        role,
        facilityId
      );
      if (res.success) {
        setSuccess(true);
        onSuccess(newPhone);
      } else {
        setError(res.error || "Failed to update phone number.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="py-4 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
        <p className="text-sm font-semibold text-emerald-300">Phone number updated successfully!</p>
        <p className="text-xs text-neutral-400">Twin alerts sent to old & new numbers.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {error && (
        <div className="p-3 bg-red-950/40 text-red-200 border border-red-900/40 rounded-xl text-xs flex gap-2 items-center">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">New Phone Number</label>
        <input
          type="text"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          placeholder="e.g. +251911000000"
          required
          className="w-full bg-neutral-950 border border-neutral-800 text-sm text-white rounded-lg px-3 py-2 outline-none focus:border-cyan-500/50 transition-all font-mono"
        />
      </div>
      <Button
        type="submit"
        disabled={loading || newPhone === currentPhone}
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-9 rounded-lg text-xs"
      >
        {loading ? "Updating Parameters..." : "Save Parameters"}
      </Button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TriageDashboardClient({
  initialPatients,
  facilityName,
  staffId = "",
  role = "",
  facilityId = "",
}: {
  initialPatients: any[];
  facilityName?: string;
  staffId?: string;
  role?: string;
  facilityId?: string;
}) {
  const router = useRouter();
  const [patients, setPatients] = useState(initialPatients);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [assessingSet, setAssessingSet] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Assessment form state
  const [triageCategory, setTriageCategory] = useState<TriageCategory | "">("");
  const [selectedWard, setSelectedWard] = useState("OPD_OUTPATIENT");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [otherComplaint, setOtherComplaint] = useState("");
  const [triageNotes, setTriageNotes] = useState("");

  // Vitals form state
  const [systolic, setSystolic]   = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [tempVal, setTempVal]     = useState("");
  const [pulse, setPulse]         = useState("");
  const [rrVal, setRrVal]         = useState("");
  const [spO2Val, setSpO2Val]     = useState("");
  const [weight, setWeight]       = useState("");
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsSuccess, setVitalsSuccess] = useState(false);

  const redFlagTemp = parseFloat(tempVal) >= RED_FLAG_TEMP && parseFloat(tempVal) > 0;

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.healthId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.chiefComplaint && String(p.chiefComplaint).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;
  const latestVitals    = selectedPatient?.vitals?.[0] ?? null;

  // ── Priority Counts ───────────────────────────────────────────────────────────
  const counts = {
    EMERGENCY:  patients.filter((p) => getAiSuggestion(p) === "EMERGENCY" || p.emergencyFlag).length,
    URGENT:     patients.filter((p) => getAiSuggestion(p) === "URGENT" && !p.emergencyFlag).length,
    SEMI_URGENT: patients.filter((p) => getAiSuggestion(p) === "SEMI_URGENT").length,
    NON_URGENT: patients.filter((p) => getAiSuggestion(p) === "NON_URGENT" && !p.emergencyFlag).length,
    WAITING:    patients.filter((p) => p.triageStatus === "WAITING_FOR_TRIAGE").length,
  };

  // Live alerts calculations
  const lowOxygenAlerts = patients.filter(p => {
    const v = p.vitals?.[0];
    return v && v.spO2 > 0 && v.spO2 < 90;
  });
  const chestPainAlerts = patients.filter(p => {
    const complaint = (p.chiefComplaint || "").toLowerCase();
    const waitMs = currentTime.getTime() - new Date(p.createdAt).getTime();
    return complaint.includes("chest pain") && waitMs > 10 * 60 * 1000;
  });
  const emergencyAlerts = patients.filter(p => p.emergencyFlag || p.triageStatus === "RED");
  const highTempAlerts = patients.filter(p => {
    const v = p.vitals?.[0];
    return v && v.temp >= RED_FLAG_TEMP;
  });
  const abnormalBpAlerts = patients.filter(p => {
    const v = p.vitals?.[0];
    if (!v || !v.bp) return false;
    const [sys, dia] = v.bp.split("/").map(Number);
    return sys >= 140 || dia >= 90;
  });

  const totalAlertsCount = 
    lowOxygenAlerts.length + 
    chestPainAlerts.length + 
    emergencyAlerts.length + 
    highTempAlerts.length + 
    abnormalBpAlerts.length;

  // ── Open Assessment Panel ────────────────────────────────────────────────────
  const handleAssess = (patientId: string) => {
    const p = patients.find((x) => x.id === patientId);
    setSelectedPatientId(patientId);
    setAssessingSet((prev) => new Set(prev).add(patientId));

    // Pre-fill chief complaint
    if (p?.chiefComplaint) {
      const match = CHIEF_COMPLAINTS.find(
        (c) => c.toLowerCase() === p.chiefComplaint.toLowerCase()
      );
      setChiefComplaint(match || "Other");
      setOtherComplaint(match ? "" : p.chiefComplaint);
    } else {
      setChiefComplaint("");
      setOtherComplaint("");
    }

    // AI-suggested category
    setTriageCategory(getAiSuggestion(p));
    setSelectedWard(
      p?.emergencyFlag || p?.triageStatus === "RED" ? "EMERGENCY" : "OPD_OUTPATIENT"
    );
    setTriageNotes("");

    // Reset vitals form
    setSystolic(""); setDiastolic(""); setTempVal(""); setPulse("");
    setRrVal(""); setSpO2Val(""); setWeight("");
    setVitalsSuccess(false);
  };

  const handleClosePanel = () => {
    setSelectedPatientId(null);
  };

  // ── Save Vitals ──────────────────────────────────────────────────────────────
  const handleSaveVitals = async () => {
    if (!systolic || !diastolic || !tempVal || !pulse) {
      alert("Please fill BP (Systolic/Diastolic), Temperature, and Pulse Rate at minimum.");
      return;
    }
    if (!selectedPatientId) return;
    setSavingVitals(true);
    try {
      const saved = await recordVitals({
        patientId: selectedPatientId,
        bp:    `${systolic}/${diastolic}`,
        temp:  parseFloat(tempVal),
        pulse: parseInt(pulse, 10),
        rr:    rrVal   ? parseInt(rrVal, 10)   : 0,
        spO2:  spO2Val ? parseFloat(spO2Val)   : 0,
        weight: weight ? parseFloat(weight) : undefined,
      });
      setPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatientId
            ? {
                ...p,
                vitals: [
                  {
                    bp:    `${systolic}/${diastolic}`,
                    temp:  parseFloat(tempVal),
                    pulse: parseInt(pulse, 10),
                    rr:    rrVal   ? parseInt(rrVal, 10) : 0,
                    spO2:  spO2Val ? parseFloat(spO2Val) : 0,
                    ...saved,
                  },
                  ...(p.vitals || []),
                ],
              }
            : p
        )
      );
      setVitalsSuccess(true);
      setTimeout(() => setVitalsSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Error recording vitals.");
    } finally {
      setSavingVitals(false);
    }
  };

  // ── Submit Triage ─────────────────────────────────────────────────────────────
  const submitTriage = async (
    dbStatus: "RED" | "YELLOW" | "GREEN",
    ward: string,
    serviceType: string
  ) => {
    if (!selectedPatientId) return;
    setIsProcessing(true);
    try {
      await processTriage(
        selectedPatientId,
        ward as any,
        dbStatus as any,
        serviceType
      );
      const pid = selectedPatientId;
      setPatients((prev) => prev.filter((p) => p.id !== pid));
      setAssessingSet((prev) => { const s = new Set(prev); s.delete(pid); return s; });
      setSelectedPatientId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to submit triage. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAssignment = () => {
    if (!triageCategory) {
      alert("Please select a Triage Category before confirming.");
      return;
    }
    const cat = TRIAGE_CATEGORIES.find((c) => c.id === triageCategory)!;
    submitTriage(cat.dbStatus, selectedWard, cat.serviceType);
  };

  const handleSendToEmergency = () => submitTriage("RED",   "EMERGENCY",      "EMERGENCY");
  const handleSendToOPD       = () => submitTriage("GREEN", "OPD_OUTPATIENT", "OPD");

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden">

      {/* ══════════════════════════════════════════
          TOP SYSTEM BAR
      ══════════════════════════════════════════ */}
      <header className="flex items-center gap-4 px-6 py-3 bg-neutral-900 border-b border-neutral-800 shrink-0">
        {/* Branding */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg">
            <Hospital className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">
              {facilityName ? facilityName.split(" - ")[0] : "Triage System"}
            </div>
            <div className="text-[10px] text-neutral-500 leading-tight">
              {facilityName && facilityName.includes(" - ") ? facilityName.split(" - ")[1] : "Emergency Department"}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-neutral-800" />

        {/* Search */}
        <div className="flex-1 relative max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search name, ID or Card No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 text-sm text-white rounded-lg pl-9 pr-4 py-2 outline-none focus:border-cyan-500/50 transition-all placeholder:text-neutral-600"
          />
        </div>

        <div className="ml-auto flex items-center gap-4">
          {/* Emergency alert */}
          {counts.EMERGENCY > 0 && (
            <div className="flex items-center gap-1.5 bg-red-900/50 border border-red-500/40 text-red-300 text-xs px-3 py-1.5 rounded-full animate-pulse">
              <Bell className="w-3 h-3" />
              {counts.EMERGENCY} Emergency
              {counts.EMERGENCY > 1 ? " cases" : " case"}
            </div>
          )}

          {/* Live Clock */}
          <div className="text-sm font-mono text-neutral-400 tabular-nums">
            ⏰ {currentTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>

          {/* Nurse badge */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-xs font-medium text-neutral-300">Triage Nurse</span>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Patient History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl w-full">
              <DialogHeader>
                <DialogTitle>Patient History Lookup</DialogTitle>
                <DialogDescription>
                  Search system-wide patient history using Health ID, FIN, NID, or full name.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <GlobalPatientLookup />
              </div>
            </DialogContent>
          </Dialog>

          {/* Logout button */}
          <button
            onClick={async () => {
              await logoutUser();
            }}
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          PRIORITY COLOR PANEL
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-neutral-800 bg-neutral-900/40 shrink-0">
        {TRIAGE_CATEGORIES.map((cat) => {
          const count =
            cat.id === "EMERGENCY"  ? counts.EMERGENCY  :
            cat.id === "URGENT"     ? counts.URGENT      :
            cat.id === "SEMI_URGENT"? counts.SEMI_URGENT :
                                      counts.NON_URGENT;
          return (
            <div
              key={cat.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${cat.bg} ${cat.border} transition-all`}
            >
              <span className="text-2xl leading-none select-none">{cat.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
                  {cat.label}
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-3xl font-bold leading-none tabular-nums ${cat.color}`}>
                    {count}
                  </span>
                  <span className="text-[10px] text-neutral-500 leading-tight">{cat.sub}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: LIVE WAITING QUEUE TABLE ── */}
        <div
          className={`flex flex-col border-r border-neutral-800 bg-neutral-900/20 transition-all duration-300 ${
            selectedPatient ? "w-[58%]" : "w-[65%]"
          }`}
        >
          {/* Queue header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Live Waiting Queue</h2>
              <span className="text-xs font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
                {counts.WAITING} waiting
              </span>
            </div>
            <button
              onClick={() => router.refresh()}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4 pb-20">
                <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-400">Queue is empty</p>
                  <p className="text-xs text-neutral-600 mt-1">All patients have been assessed</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-xs min-w-[720px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-neutral-900 border-b border-neutral-800">
                    {[
                      { key: "queue",     label: "Queue No" },
                      { key: "pid",       label: "Patient ID" },
                      { key: "card",      label: "Card No" },
                      { key: "name",      label: "Full Name" },
                      { key: "age",       label: "Age" },
                      { key: "sex",       label: "Sex" },
                      { key: "arrival",   label: "Arrival" },
                      { key: "complaint", label: "Chief Complaint" },
                      { key: "status",    label: "Status" },
                      { key: "action",    label: "Action" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-500 whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {filteredPatients.map((patient, idx) => {
                    const isSelected  = patient.id === selectedPatientId;
                    const isAssessing = assessingSet.has(patient.id);
                    const isUrgent    = patient.emergencyFlag || patient.triageStatus === "RED";

                    return (
                      <tr
                        key={patient.id}
                        className={`transition-colors duration-150 ${
                          isSelected
                            ? "bg-cyan-900/20 border-l-2 border-l-cyan-500"
                            : isUrgent
                            ? "bg-red-950/15 hover:bg-red-950/25"
                            : "hover:bg-neutral-800/25"
                        }`}
                      >
                        {/* Queue No */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-mono text-[10px] font-bold bg-neutral-800 border border-neutral-700 text-neutral-300 px-2 py-0.5 rounded">
                            Q-{String(idx + 1).padStart(3, "0")}
                          </span>
                        </td>

                        {/* Patient ID */}
                        <td className="px-3 py-3 font-mono text-[10px] text-neutral-500 whitespace-nowrap">
                          {patient.healthId}
                        </td>

                        {/* Card No */}
                        <td className="px-3 py-3 font-mono text-[10px] text-neutral-600 whitespace-nowrap">
                          {getCardNo(patient)}
                        </td>

                        {/* Full Name */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            {isUrgent && (
                              <ShieldAlert className="w-3 h-3 text-red-400 shrink-0" />
                            )}
                            <span
                              className={`font-medium leading-tight ${
                                isUrgent ? "text-red-200" : "text-neutral-100"
                              }`}
                            >
                              {patient.fullName}
                            </span>
                          </div>
                        </td>

                        {/* Age */}
                        <td className="px-3 py-3 text-neutral-400 text-center whitespace-nowrap">
                          {patient.age}
                        </td>

                        {/* Sex */}
                        <td className="px-3 py-3 text-neutral-400 text-center whitespace-nowrap">
                          {patient.sex?.[0] ?? "—"}
                        </td>

                        {/* Arrival Time */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-neutral-400">
                            <Clock className="w-3 h-3 text-neutral-600 shrink-0" />
                            {fmtTime(patient.createdAt)}
                          </div>
                        </td>

                        {/* Chief Complaint */}
                        <td className="px-3 py-3 max-w-[130px]">
                          <span className="text-amber-300/80 truncate block leading-tight">
                            {patient.chiefComplaint || "—"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                              isAssessing
                                ? "bg-cyan-900/40 border-cyan-500/30 text-cyan-300"
                                : "bg-neutral-800 border-neutral-700 text-neutral-500"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAssessing
                                  ? "bg-cyan-400 animate-pulse"
                                  : "bg-neutral-500"
                              }`}
                            />
                            {isAssessing ? "Assessing" : "Waiting"}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-3 py-3">
                          <button
                            onClick={() => handleAssess(patient.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                              isSelected
                                ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                                : isUrgent
                                ? "bg-red-700 hover:bg-red-600 text-white"
                                : "bg-neutral-700 hover:bg-neutral-600 text-neutral-200 border border-neutral-600"
                            }`}
                          >
                            Assess
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── RIGHT: TRIAGE ASSESSMENT PANEL ── */}
        {selectedPatient ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950 min-w-0">

            {/* Panel header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-neutral-800 bg-neutral-900/70 shrink-0">
              <Stethoscope className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-sm font-semibold text-white">Triage Assessment</span>
              <span className="text-xs text-neutral-500 truncate">
                — {selectedPatient.fullName}
              </span>
              <button
                onClick={handleClosePanel}
                className="ml-auto p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── A. PATIENT IDENTIFICATION ── */}
              <section className="bg-gradient-to-br from-neutral-900 to-neutral-900/60 border border-neutral-800 rounded-xl p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Patient Identification
                </h3>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-white">
                        {selectedPatient.fullName}
                      </span>
                      {selectedPatient.emergencyFlag && (
                        <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> ER Flag
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                      <span className="font-mono text-[10px] bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700 text-neutral-400">
                        {selectedPatient.healthId}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {selectedPatient.age} yrs · {selectedPatient.sex}
                      </span>
                      {selectedPatient.nationalId && (
                        <span className="font-mono text-[10px] bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-700/30 text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" /> Fayda Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-neutral-800/80">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="font-mono text-[11px]">{selectedPatient.phoneNumber || "No Phone"}</span>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 h-7 px-2 hover:bg-neutral-800 rounded-lg cursor-pointer"
                          >
                            Edit Identity Phone Parameters
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-sm rounded-xl">
                          <DialogHeader>
                            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                              <Phone className="w-4 h-4 text-cyan-400" /> Edit Phone Number
                            </DialogTitle>
                            <DialogDescription className="text-neutral-400 text-xs">
                              Update the primary contact number for {selectedPatient.fullName}.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <EditPhoneForm 
                            patientId={selectedPatient.id}
                            currentPhone={selectedPatient.phoneNumber || ""}
                            staffId={staffId}
                            role={role}
                            facilityId={facilityId}
                            onSuccess={(newPhoneVal) => {
                              setPatients((prev) =>
                                prev.map((p) =>
                                  p.id === selectedPatient.id
                                    ? { ...p, phoneNumber: newPhoneVal }
                                    : p
                                )
                              );
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── A½. PATIENT REPORTED INTAKE SUMMARY ── */}
              {(() => {
                const intake = (selectedPatient as any)?.appointments?.[0];
                if (!intake) return null;
                return (
                  <section className="bg-gradient-to-br from-indigo-950/40 to-violet-950/30 border border-indigo-500/25 rounded-xl p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" /> Patient Reported Intake Summary
                    </h3>
                    <div className="space-y-3">
                      {intake.chiefComplaints && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-indigo-500/70 font-bold mb-1">Self-Reported Chief Complaints</p>
                          <p className="text-xs text-indigo-100 leading-relaxed bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-3 italic">
                            "{intake.chiefComplaints}"
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {intake.assignedWard && (
                          <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-2.5">
                            <p className="text-[9px] uppercase tracking-widest text-indigo-500/70 font-bold mb-0.5">Assigned Ward</p>
                            <p className="text-xs font-bold text-indigo-200">{intake.assignedWard.name}</p>
                            <p className="text-[9px] font-mono text-indigo-500">{intake.assignedWard.code}</p>
                          </div>
                        )}
                        {intake.dateTime && (
                          <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-2.5">
                            <p className="text-[9px] uppercase tracking-widest text-indigo-500/70 font-bold mb-0.5">Appointment Time</p>
                            <p className="text-xs font-bold text-indigo-200">
                              {new Date(intake.dateTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                            </p>
                            <p className="text-[9px] text-indigo-500">
                              {new Date(intake.dateTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })()}

              {/* ── B. VITAL SIGNS ── */}
              <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                    <Activity className="w-3 h-3" /> Vital Signs Input
                  </h3>
                  {vitalsSuccess && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Saved!
                    </span>
                  )}
                </div>

                {/* Existing vitals snapshot */}
                {latestVitals && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { label: "BP",    value: latestVitals.bp,                  icon: <Droplets    className="w-3 h-3 text-blue-400" />,   flag: false },
                      { label: "Pulse", value: `${latestVitals.pulse} bpm`,      icon: <Heart       className="w-3 h-3 text-rose-400" />,   flag: false },
                      { label: "Temp",  value: `${latestVitals.temp}°C`,         icon: <Thermometer className="w-3 h-3 text-orange-400" />, flag: latestVitals.temp >= RED_FLAG_TEMP },
                      { label: "RR",    value: latestVitals.rr ? `${latestVitals.rr}/min` : "—", icon: <Wind className="w-3 h-3 text-sky-400" />, flag: false },
                    ].map(({ label, value, icon, flag }) => (
                      <div
                        key={label}
                        className={`rounded-lg p-2.5 border text-center ${
                          flag
                            ? "bg-rose-900/20 border-rose-500/30"
                            : "bg-neutral-800/60 border-neutral-700/50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          {icon}
                          <span className="text-[9px] text-neutral-500 uppercase tracking-wider">{label}</span>
                        </div>
                        <div className={`font-mono font-bold text-sm leading-none ${flag ? "text-rose-300" : "text-white"}`}>
                          {value}
                        </div>
                        {flag && (
                          <div className="text-[9px] text-rose-400 mt-1 flex items-center justify-center gap-0.5">
                            <FlameKindling className="w-2.5 h-2.5" /> Red Flag
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Red flag warning */}
                {redFlagTemp && (
                  <div className="mb-3 bg-rose-900/30 border border-rose-500/40 rounded-lg px-3 py-2 flex items-center gap-2">
                    <FlameKindling className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-rose-300">⚠️ ከፍተኛ ሙቀት ተገኝቷል! — High Temperature</div>
                      <div className="text-[10px] text-rose-400/80">Temperature ≥ 38.5°C — Critical red flag alert</div>
                    </div>
                  </div>
                )}

                {/* Vitals input grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "BP Systolic (mmHg)",  val: systolic,  set: setSystolic,  ph: "120",  step: undefined,    highlight: false },
                    { label: "BP Diastolic (mmHg)", val: diastolic, set: setDiastolic, ph: "80",   step: undefined,    highlight: false },
                    { label: "Temperature (°C)",    val: tempVal,   set: setTempVal,   ph: "37.0", step: "0.1",        highlight: redFlagTemp },
                    { label: "Pulse Rate (BPM)",    val: pulse,     set: setPulse,     ph: "72",   step: undefined,    highlight: false },
                    { label: "Resp. Rate (/min)",   val: rrVal,     set: setRrVal,     ph: "16",   step: undefined,    highlight: false },
                    { label: "SpO₂ (%)",            val: spO2Val,   set: setSpO2Val,   ph: "98",   step: "0.1",        highlight: parseFloat(spO2Val) > 0 && parseFloat(spO2Val) < 90 },
                  ].map(({ label, val, set, ph, step, highlight }) => (
                    <div key={label}>
                      <label className="block text-[10px] text-neutral-500 mb-1">{label}</label>
                      <input
                        type="number"
                        step={step}
                        placeholder={ph}
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className={`w-full rounded-lg px-2.5 py-2 text-sm outline-none border transition-all bg-neutral-950 text-white ${
                          highlight
                            ? "border-rose-500 focus:ring-1 focus:ring-rose-500/50"
                            : "border-neutral-700 focus:border-cyan-500/50"
                        }`}
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveVitals}
                  disabled={savingVitals}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 disabled:opacity-50 text-neutral-200 rounded-lg transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {savingVitals ? "Saving Vitals..." : "💾 Save Vitals"}
                </button>
              </section>

              {/* ── C. CHIEF COMPLAINT ── */}
              <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Chief Complaint
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {CHIEF_COMPLAINTS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setChiefComplaint(c); if (c !== "Other") setOtherComplaint(""); }}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        chiefComplaint === c
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-200"
                          : "bg-neutral-800/50 border-neutral-700/50 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {chiefComplaint === "Other" && (
                  <input
                    type="text"
                    placeholder="Describe the complaint in detail..."
                    value={otherComplaint}
                    onChange={(e) => setOtherComplaint(e.target.value)}
                    className="mt-2 w-full rounded-lg px-3 py-2 text-sm outline-none border border-neutral-700 focus:border-amber-500/50 bg-neutral-950 text-white placeholder:text-neutral-600"
                  />
                )}
              </section>

              {/* ── D. TRIAGE CATEGORY ── */}
              <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3" /> Triage Category
                </h3>

                {/* AI suggestion hint */}
                {(() => {
                  const suggestion = getAiSuggestion(selectedPatient);
                  const cat = TRIAGE_CATEGORIES.find((c) => c.id === suggestion);
                  return cat ? (
                    <div className="mb-3 flex items-center gap-2 bg-indigo-950/30 border border-indigo-500/20 rounded-lg px-3 py-2">
                      <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-[10px] text-indigo-300">
                        AI Suggestion: <strong className={cat.color}>{cat.emoji} {cat.label}</strong> based on chief complaint
                      </span>
                    </div>
                  ) : null;
                })()}

                <div className="grid grid-cols-2 gap-2">
                  {TRIAGE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setTriageCategory(cat.id);
                        // Auto-set ward for emergency
                        if (cat.id === "EMERGENCY") setSelectedWard("EMERGENCY");
                        else if (selectedWard === "EMERGENCY") setSelectedWard("OPD_OUTPATIENT");
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        triageCategory === cat.id
                          ? `${cat.bg} ${cat.border} ring-1 ${cat.ring}`
                          : "bg-neutral-800/40 border-neutral-700/50 hover:border-neutral-600 hover:bg-neutral-800/70"
                      }`}
                    >
                      <span className="text-xl leading-none select-none">{cat.emoji}</span>
                      <div className="text-left min-w-0">
                        <div className={`text-xs font-bold ${triageCategory === cat.id ? cat.color : "text-neutral-300"}`}>
                          {cat.label}
                        </div>
                        <div className="text-[10px] text-neutral-500">{cat.sub}</div>
                      </div>
                      {triageCategory === cat.id && (
                        <CheckCircle2 className={`w-3.5 h-3.5 ml-auto shrink-0 ${cat.color}`} />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── E. PATIENT DISPOSITION ── */}
              <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3" /> Patient Disposition (Where to Send)
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {DISPOSITION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedWard(opt.value)}
                      className={`text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                        selectedWard === opt.value
                          ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-200"
                          : "bg-neutral-800/50 border-neutral-700/50 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── F. TRIAGE NOTES ── */}
              <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Triage Notes
                </h3>
                <textarea
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="Nurse observation · Symptoms description · Clinical notes..."
                  rows={3}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border border-neutral-700 focus:border-cyan-500/50 bg-neutral-950 text-white resize-none placeholder:text-neutral-600 transition-all"
                />
              </section>

              {/* ── G. ACTION BUTTONS ── */}
              <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3">
                  Action Buttons
                </h3>

                {/* Primary — Save & Assign */}
                <button
                  onClick={handleConfirmAssignment}
                  disabled={isProcessing || !triageCategory}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-cyan-900/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isProcessing ? "Processing..." : "✔  Save Assessment & Confirm Assignment"}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-3 gap-2">
                  {/* Send to Emergency */}
                  <button
                    onClick={handleSendToEmergency}
                    disabled={isProcessing}
                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 bg-red-800/70 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all border border-red-700/50"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    🚨 Send to Emergency
                  </button>

                  {/* Send to OPD */}
                  <button
                    onClick={handleSendToOPD}
                    disabled={isProcessing}
                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all border border-neutral-600"
                  >
                    <Send className="w-4 h-4" />
                    📤 Send to OPD
                  </button>

                  {/* Print Triage Ticket */}
                  <button
                    onClick={() => window.print()}
                    disabled={isProcessing}
                    className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all border border-neutral-600"
                  >
                    <Printer className="w-4 h-4" />
                    🧾 Print Ticket
                  </button>
                </div>
              </section>

              {/* Bottom padding */}
              <div className="h-4" />
            </div>
          </div>
        ) : (
          /* ── RIGHT: LIVE SYSTEM ALERTS & OVERVIEW ── */
          <div className="w-[35%] flex flex-col overflow-y-auto bg-neutral-900/30 p-5 space-y-4 shrink-0">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Live Monitoring & Alerts</h3>
              {totalAlertsCount > 0 && (
                <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
                  {totalAlertsCount} active
                </span>
              )}
            </div>

            {/* Live Alerts List */}
            <div className="space-y-2.5">
              {totalAlertsCount === 0 ? (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">All Patients Stable</h4>
                    <p className="text-[10px] text-emerald-500 mt-0.5">No critical vitals or delayed emergency complaints detected.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Emergency not seen */}
                  {emergencyAlerts.map(p => (
                    <div key={`em-${p.id}`} className="bg-red-950/20 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-3">
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-red-300">Emergency Flag Not Assessed</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{p.fullName} needs immediate sorting.</p>
                        <button
                          onClick={() => handleAssess(p.id)}
                          className="mt-2 text-[10px] text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                        >
                          Assess Now <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Low oxygen */}
                  {lowOxygenAlerts.map(p => (
                    <div key={`o2-${p.id}`} className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 flex items-start gap-3">
                      <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-rose-300">Critically Low SpO₂ ({p.vitals[0].spO2}%)</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5 truncate">Patient: {p.fullName}</p>
                        <button
                          onClick={() => handleAssess(p.id)}
                          className="mt-2 text-[10px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                        >
                          Assess Now <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Chest pain waiting > 10 min */}
                  {chestPainAlerts.map(p => (
                    <div key={`cp-${p.id}`} className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-amber-300">Chest Pain Patient Waiting &gt; 10 min</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5 truncate">Patient: {p.fullName}</p>
                        <button
                          onClick={() => handleAssess(p.id)}
                          className="mt-2 text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                        >
                          Assess Now <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* High Temp */}
                  {highTempAlerts.map(p => (
                    <div key={`temp-${p.id}`} className="bg-orange-950/20 border border-orange-500/30 rounded-xl p-3.5 flex items-start gap-3">
                      <Thermometer className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-orange-300">High Temperature ({p.vitals[0].temp}°C)</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5 truncate">Patient: {p.fullName}</p>
                        <button
                          onClick={() => handleAssess(p.id)}
                          className="mt-2 text-[10px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
                        >
                          Assess Now <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Abnormal BP */}
                  {abnormalBpAlerts.map(p => (
                    <div key={`bp-${p.id}`} className="bg-yellow-950/10 border border-yellow-500/20 rounded-xl p-3.5 flex items-start gap-3">
                      <Droplets className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-yellow-300">Abnormal BP Reading ({p.vitals[0].bp})</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5 truncate">Patient: {p.fullName}</p>
                        <button
                          onClick={() => handleAssess(p.id)}
                          className="mt-2 text-[10px] text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1"
                        >
                          Assess Now <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Queue Metrics</h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-neutral-950 rounded-lg p-2.5 border border-neutral-800">
                  <div className="text-[9px] text-neutral-500 uppercase tracking-wider">Waiting</div>
                  <div className="text-xl font-bold text-cyan-400 font-mono mt-0.5">{counts.WAITING}</div>
                </div>
                <div className="bg-neutral-950 rounded-lg p-2.5 border border-neutral-800">
                  <div className="text-[9px] text-neutral-500 uppercase tracking-wider">Est. Wait Time</div>
                  <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{counts.WAITING * 15}m</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
