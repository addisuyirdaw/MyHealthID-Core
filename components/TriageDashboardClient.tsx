"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowRight, Brain, Clock, Plus, Search,
  Stethoscope, User, AlertTriangle, CheckCircle2, ShieldAlert,
  Thermometer, Heart, Droplets, Weight, ShieldCheck, CloudOff, Cloud,
  FlameKindling
} from "lucide-react";
import { processTriage, recordVitals } from "@/lib/actions/patient.actions";

// ─── Amharic labels for the vitals entry form ───────────────────────────────
const AM = {
  vitalsTitle:    "አዲስ ምልክቶች ያስገቡ",       // "Enter New Vitals"
  bpSys:         "የደም ጫና (ሲስቶሊክ)",          // "BP Systolic"
  bpDia:         "የደም ጫና (ዳያስቶሊክ)",         // "BP Diastolic"
  temp:          "የሰውነት ሙቀት (°C)",           // "Temperature"
  pulse:         "የልብ ምት (BPM)",              // "Heart Rate"
  weight:        "ክብደት (ኪ.ግ)",               // "Weight"
  save:          "ምልክቶቹን ያስቀምጡ",             // "Save Vitals"
  saving:        "በማስቀመጥ ላይ...",             // "Saving..."
  redFlag:       "⚠️ ከፍተኛ ሙቀት ተገኝቷል!",     // "High Temperature Detected!"
  redFlagSub:    "ሙቀቱ ≥38.5°C ነው — አደጋ ምልክት።", // Threshold warning
  identityCard:  "የታካሚ መታወቂያ ካርድ",         // "Patient Identity Card"
  latestVitals:  "የቅርብ ጊዜ ምልክቶች",           // "Latest Vitals (Once-Only)"
  noVitals:      "ምልክቶች አልተመዘገቡም",           // "No vitals recorded"
  ward:          "ሆስፒታል ክፍል",               // "Ward"
  required:      "እባኮን ሁሉንም ሜዳዎች ይሙሉ",     // "Please fill all fields"
};

// ─── Red-Flag threshold ───────────────────────────────────────────────────────
const RED_FLAG_TEMP = 38.5;

export default function TriageDashboardClient({ initialPatients }: { initialPatients: any[] }) {
  const router = useRouter();
  const [patients, setPatients] = useState(initialPatients);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Triage form
  const [selectedPriority, setSelectedPriority] = useState<"RED" | "YELLOW" | "GREEN" | "">("");
  const [selectedWard, setSelectedWard] = useState<string>("OPD_OUTPATIENT");
  const [serviceType, setServiceType] = useState("OPD");

  // Vitals inline form (Amharic)
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [systolic, setSystolic]   = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [temp, setTemp]           = useState("");
  const [pulse, setPulse]         = useState("");
  const [weight, setWeight]       = useState("");
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsSuccess, setVitalsSuccess] = useState(false);

  const redFlag = parseFloat(temp) >= RED_FLAG_TEMP;

  // ── Derived ──────────────────────────────────────────────────────────────────
  const filteredPatients = patients.filter(p =>
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.healthId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const latestVitals = selectedPatient?.vitals?.[0] ?? null;

  // ── AI suggestion engine ─────────────────────────────────────────────────────
  const getAiSuggestion = (patient: any) => {
    if (!patient) return null;
    const c = patient.chiefComplaint?.toLowerCase() || "";
    if (c.includes("pain") || c.includes("chest") || c.includes("bleeding") || patient.emergencyFlag)
      return { priority: "RED" as const, ward: "EMERGENCY", reason: "Critical symptoms in chief complaint." };
    if (c.includes("fever") || c.includes("vomit"))
      return { priority: "YELLOW" as const, ward: "OPD_OUTPATIENT", reason: "Urgent but stable symptoms." };
    return { priority: "GREEN" as const, ward: "OPD_OUTPATIENT", reason: "Routine symptoms, standard pathway." };
  };

  const aiSuggestion = getAiSuggestion(selectedPatient);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handlePatientSelect = (id: string) => {
    setSelectedPatientId(id);          // ← selected patient persists on ward change
    setShowVitalsForm(false);
    setVitalsSuccess(false);
    setSystolic(""); setDiastolic(""); setTemp(""); setPulse(""); setWeight("");
    const suggestion = getAiSuggestion(patients.find(p => p.id === id));
    if (suggestion) {
      setSelectedPriority(suggestion.priority);
      setSelectedWard(suggestion.ward);
      setServiceType(suggestion.ward === "EMERGENCY" ? "EMERGENCY" : "OPD");
    }
  };

  const handleSaveVitals = async () => {
    if (!systolic || !diastolic || !temp || !pulse || !weight) {
      alert(AM.required);
      return;
    }
    if (!selectedPatientId) return;
    setSavingVitals(true);
    try {
      const saved = await recordVitals({
        patientId: selectedPatientId,
        bp: `${systolic}/${diastolic}`,
        temp: parseFloat(temp),
        pulse: parseInt(pulse, 10),
        weight: parseFloat(weight),
      });
      // Optimistically update local vitals list
      setPatients(prev => prev.map(p =>
        p.id === selectedPatientId
          ? { ...p, vitals: [{ bp: `${systolic}/${diastolic}`, temp: parseFloat(temp), pulse: parseInt(pulse, 10), spO2: 0, ...saved }, ...(p.vitals || [])] }
          : p
      ));
      setVitalsSuccess(true);
      setShowVitalsForm(false);
      setSystolic(""); setDiastolic(""); setTemp(""); setPulse(""); setWeight("");
      setTimeout(() => setVitalsSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Error recording vitals.");
    } finally {
      setSavingVitals(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatientId || !selectedPriority || !selectedWard) return;
    try {
      setIsProcessing(true);
      await processTriage(selectedPatientId, selectedWard as any, selectedPriority, serviceType);
      setPatients(prev => prev.filter(p => p.id !== selectedPatientId));
      setSelectedPatientId(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to submit triage.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans text-neutral-200">

      {/* ── LEFT: Live Queue ── */}
      <div className="w-1/3 min-w-[340px] border-r border-neutral-800 bg-neutral-900/50 flex flex-col">
        <div className="p-5 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Live Queue
            <span className="ml-auto text-xs font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
              {patients.length} waiting
            </span>
          </h2>
          <div className="mt-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 text-sm text-white rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-cyan-500/50 transition-all placeholder:text-neutral-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-3">
              <CheckCircle2 className="w-10 h-10 opacity-20" />
              <p className="text-sm">Queue is empty</p>
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const isSelected = patient.id === selectedPatientId;
              return (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                    isSelected
                      ? "bg-neutral-800/80 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.06)]"
                      : "bg-neutral-900/40 border-neutral-800/60 hover:bg-neutral-800/40 hover:border-neutral-700"
                  }`}
                >
                  {patient.emergencyFlag && (
                    <span className="absolute top-2 right-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500 opacity-80" />
                    </span>
                  )}
                  <div className="font-medium text-sm text-neutral-100">{patient.fullName}</div>
                  <div className="text-xs text-neutral-500 font-mono mt-0.5">{patient.healthId}</div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(patient.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-1 truncate max-w-[160px]">
                      <AlertTriangle className="w-3 h-3 text-orange-400/70 shrink-0" />
                      {patient.chiefComplaint || "No complaint"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Command Center ── */}
      <div className="flex-1 bg-neutral-950 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />

        {selectedPatient ? (
          <div className="flex-1 overflow-y-auto p-7 space-y-6 relative z-10">

            {/* ① IDENTITY CARD */}
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-900/60 border border-neutral-800 rounded-2xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                {AM.identityCard}
              </h3>
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                  <User className="w-7 h-7 text-neutral-500" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    {selectedPatient.fullName}
                    {selectedPatient.emergencyFlag && (
                      <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> ER
                      </span>
                    )}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm text-neutral-400 mt-1">
                    <span className="font-mono text-xs bg-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-700">
                      MHI: {selectedPatient.healthId}
                    </span>
                    {selectedPatient.nationalId && (
                      <span className="font-mono text-xs bg-emerald-900/30 px-2.5 py-1 rounded-lg border border-emerald-700/30 text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Fayda: {selectedPatient.nationalId}
                      </span>
                    )}
                    <span className="text-neutral-400">{selectedPatient.age} yrs &bull; {selectedPatient.sex}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ② ONCE-ONLY VITALS (from MongoDB) */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  {AM.latestVitals}
                </h3>
                <button
                  onClick={() => setShowVitalsForm(v => !v)}
                  className="text-xs flex items-center gap-1.5 text-neutral-400 hover:text-cyan-400 border border-neutral-700 hover:border-cyan-500/40 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {AM.vitalsTitle}
                </button>
              </div>

              {vitalsSuccess && (
                <div className="mb-3 bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Vitals saved successfully!
                </div>
              )}

              {latestVitals ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Blood Pressure", value: latestVitals.bp, icon: <Droplets className="w-4 h-4 text-blue-400" /> },
                    { label: "Heart Rate", value: `${latestVitals.pulse} bpm`, icon: <Heart className="w-4 h-4 text-rose-400" /> },
                    { label: "Temperature", value: `${latestVitals.temp}°C`, icon: <Thermometer className="w-4 h-4 text-orange-400" />, flag: latestVitals.temp >= RED_FLAG_TEMP },
                    { label: "SpO₂", value: latestVitals.spO2 ? `${latestVitals.spO2}%` : "--", icon: <Activity className="w-4 h-4 text-cyan-400" /> },
                  ].map(({ label, value, icon, flag }) => (
                    <div key={label} className={`rounded-xl p-3 border ${flag ? "bg-rose-900/20 border-rose-500/30" : "bg-neutral-800/40 border-neutral-700/50"}`}>
                      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-xs text-neutral-500">{label}</span></div>
                      <div className={`font-mono font-semibold ${flag ? "text-rose-400" : "text-neutral-100"}`}>{value}</div>
                      {flag && <div className="text-xs text-rose-400 mt-1 flex items-center gap-1"><FlameKindling className="w-3 h-3" /> Red Flag</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 italic">{AM.noVitals}</p>
              )}

              {/* ③ AMHARIC VITALS ENTRY FORM */}
              {showVitalsForm && (
                <div className="mt-5 border-t border-neutral-800 pt-5 space-y-4">
                  {redFlag && parseFloat(temp) > 0 && (
                    <div className="bg-rose-900/30 border border-rose-500/40 rounded-xl px-4 py-3 flex items-start gap-3">
                      <FlameKindling className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-rose-300">{AM.redFlag}</div>
                        <div className="text-xs text-rose-400/80 mt-0.5">{AM.redFlagSub}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: AM.bpSys,  val: systolic,  set: setSystolic,  ph: "120",  type: "number" },
                      { label: AM.bpDia,  val: diastolic, set: setDiastolic, ph: "80",   type: "number" },
                      { label: AM.temp,   val: temp,      set: setTemp,      ph: "37.0", type: "number", step: "0.1", highlight: redFlag && parseFloat(temp) > 0 },
                      { label: AM.pulse,  val: pulse,     set: setPulse,     ph: "72",   type: "number" },
                      { label: AM.weight, val: weight,    set: setWeight,    ph: "65.0", type: "number", step: "0.1" },
                    ].map(({ label, val, set, ph, type, step, highlight }) => (
                      <div key={label}>
                        <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
                        <input
                          type={type}
                          step={step}
                          placeholder={ph}
                          value={val}
                          onChange={e => set(e.target.value)}
                          className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none border transition-all bg-neutral-900 text-white ${
                            highlight
                              ? "border-rose-500 focus:ring-1 focus:ring-rose-500"
                              : "border-neutral-700 focus:border-cyan-500/50"
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      onClick={() => setShowVitalsForm(false)}
                      className="text-xs text-neutral-500 hover:text-neutral-300 px-4 py-2 rounded-lg border border-neutral-700 transition-all"
                    >
                      ሰርዝ
                    </button>
                    <button
                      onClick={handleSaveVitals}
                      disabled={savingVitals}
                      className="text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {savingVitals ? AM.saving : AM.save}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Suggestion */}
            {aiSuggestion && (
              <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-lg">
                  <Brain className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-indigo-300">AI Triage Suggestion</h4>
                  <p className="text-xs text-indigo-200/80 mt-1">
                    {aiSuggestion.reason} → <strong className="text-indigo-200">{aiSuggestion.priority}</strong> priority &bull; <strong>{aiSuggestion.ward.replace(/_/g, " ")}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* ④ ASSIGN PATHWAY — Ward change keeps selected patient active */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-5">Assign Pathway</h3>

              {/* Priority */}
              <div className="mb-5">
                <label className="text-xs text-neutral-400 font-medium block mb-2">Triage Priority</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["RED", "YELLOW", "GREEN"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPriority(p)}
                      className={`py-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all ${
                        selectedPriority === p
                          ? p === "RED"    ? "bg-rose-500/10 border-rose-500 text-rose-400"
                          : p === "YELLOW" ? "bg-orange-500/10 border-orange-500 text-orange-400"
                          :                  "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                          : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                      }`}
                    >
                      {p}
                      <span className="text-[10px] font-normal opacity-70">
                        {p === "RED" && "Resuscitation"}
                        {p === "YELLOW" && "Urgent Care"}
                        {p === "GREEN" && "Standard"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ward + Service Type — ward change does NOT clear selectedPatient */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs text-neutral-400 font-medium block mb-2">{AM.ward}</label>
                  <select
                    value={selectedWard}
                    onChange={e => setSelectedWard(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-cyan-500/50 appearance-none"
                  >
                    <option value="OPD_OUTPATIENT">OPD / Outpatient</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="MEDICAL_WARD">Medical Ward</option>
                    <option value="SURGICAL_WARD">Surgical Ward</option>
                    <option value="MATERNITY_WARD">Maternity Ward</option>
                    <option value="PEDIATRIC_WARD">Pediatric Ward</option>
                    <option value="LABORATORY">Direct to Lab</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-medium block mb-2">Service Type</label>
                  <select
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-cyan-500/50 appearance-none"
                  >
                    <option value="OPD">Standard OPD</option>
                    <option value="EMERGENCY">Emergency Service</option>
                    <option value="CONSULTATION">Specialist Consultation</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing || !selectedPriority || !selectedWard}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white px-8 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors text-sm"
                >
                  {isProcessing ? "Processing..." : "Confirm Assignment"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 relative z-10">
            <div className="w-20 h-20 rounded-full bg-neutral-900/50 flex items-center justify-center mb-5">
              <Stethoscope className="w-9 h-9 text-neutral-700" />
            </div>
            <h2 className="text-lg font-medium text-neutral-300">Select a patient</h2>
            <p className="mt-2 max-w-xs text-center text-sm">
              Choose a patient from the Live Queue to open their Command Center.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
