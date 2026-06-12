"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EMR_SECTION_IDS,
  EMR_SECTION_LABELS,
  EXAM_SYSTEMS,
  EXAM_SYSTEM_LABELS,
  IPPA_PHASES,
  IPPA_PHASE_LABELS,
  type EmrSectionId,
} from "@/lib/emr/emrSections";
import {
  appendTimelineNote,
  appendVitalsWithTimeline,
  appendNursingProgress,
  appendSystemsExam,
  logAdmissionToWard,
} from "@/lib/actions/emr.actions";
import { MedicalTimelineEntryType, Ward } from "@prisma/client";
import { OrderTestModal } from "@/components/OrderTestModal";
import { PrescribeModal } from "@/components/PrescribeModal";
import { ReferModal } from "@/components/ReferModal";
import {
  Activity, AlertTriangle, ArrowLeft, FileText, Stethoscope, Syringe, User,
  HeartPulse, Clock, ChevronDown, Thermometer, Droplets, Wind,
} from "lucide-react";

const WARD_OPTIONS: Ward[] = [
  "OPD_OUTPATIENT",
  "EMERGENCY",
  "MEDICAL_WARD",
  "SURGICAL_WARD",
  "MATERNITY_WARD",
  "GYNECOLOGY",
  "PEDIATRIC_WARD",
  "NEWBORN_NEONATAL",
  "INPATIENT_GENERAL_WARD",
  "LABORATORY",
  "PHARMACY",
  "PROCEDURE_MINOR_OPERATION",
  "ISOLATION",
  "SUPPORT_UNITS",
];

type Bundle = {
  patient: any;
  lastClinicalActivity: string;
};

function parseBp(bp: string): { sys: number; dia: number } | null {
  const m = bp.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  return { sys: Number(m[1]), dia: Number(m[2]) };
}

function liveVitalAlerts(bp: string, spo2: number, temp: number): { level: "red" | "amber"; msg: string }[] {
  const out: { level: "red" | "amber"; msg: string }[] = [];
  const p = parseBp(bp);
  if (p) {
    if (p.sys > 180 || p.dia > 120)
      out.push({ level: "red", msg: "Hypertensive crisis (SBP >180 or DBP >120)" });
    else if (p.sys >= 140 || p.dia >= 90) out.push({ level: "amber", msg: "BP Stage 2 or higher (≥140 or ≥90)" });
  }
  if (spo2 > 0 && spo2 < 92) out.push({ level: "red", msg: "SpO₂ critically low (<92%)" });
  else if (spo2 > 0 && spo2 < 94) out.push({ level: "amber", msg: "SpO₂ low (<94%)" });
  if (temp >= 39) out.push({ level: "red", msg: "High fever (≥39°C)" });
  else if (temp >= 38.5) out.push({ level: "amber", msg: "Fever ≥38.5°C" });
  return out;
}

function hoursSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function isHypertensiveCrisisBp(bp: string): boolean {
  const p = parseBp(bp);
  return Boolean(p && (p.sys > 180 || p.dia > 120));
}

function vitalHistoryRowClass(bp: string, spo2: number, temp: number): string {
  if (isHypertensiveCrisisBp(bp)) return "text-red-400 font-semibold";
  if (spo2 > 0 && spo2 < 92) return "text-red-400 font-semibold";
  if (temp >= 39) return "text-red-400 font-semibold";
  const p = parseBp(bp);
  if (p && (p.sys >= 140 || p.dia >= 90)) return "text-amber-400 font-medium";
  if (spo2 > 0 && spo2 < 94) return "text-amber-400 font-medium";
  if (temp >= 38.5) return "text-amber-400 font-medium";
  return "text-neutral-400";
}

function TriageChip({ status }: { status: string }) {
  const cfg =
    status === "RED"
      ? "bg-red-900/40 text-red-300 border-red-500/30"
      : status === "YELLOW"
      ? "bg-amber-900/40 text-amber-300 border-amber-500/30"
      : status === "GREEN"
      ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/30"
      : "bg-neutral-800 text-neutral-400 border-neutral-700";
  return (
    <span className={`inline-flex items-center font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cfg}`}>
      {status}
    </span>
  );
}

export default function ManageWorkspaceClient({ bundle }: { bundle: Bundle }) {
  const router = useRouter();
  const { patient, lastClinicalActivity } = bundle;
  const [recorder, setRecorder] = useState("");
  const [pending, startTransition] = useTransition();

  const stale = hoursSince(lastClinicalActivity) >= 24;

  const bySection = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const id of EMR_SECTION_IDS) m.set(id, []);
    for (const row of patient.medicalTimeline || []) {
      const arr = m.get(row.emrSection);
      if (arr) arr.push(row);
    }
    return m;
  }, [patient.medicalTimeline]);

  const latestScreen = patient.screenings?.[0];

  const openNote = (section: EmrSectionId) => {
    setNoteSection(section);
    setNoteTitle("");
    setNoteBody("");
    setNoteOpen(true);
  };

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteSection, setNoteSection] = useState<EmrSectionId>("identification");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const submitNote = () => {
    if (recorder.trim().length < 2) {
      alert("Set your professional name in the header first.");
      return;
    }
    startTransition(async () => {
      await appendTimelineNote({
        patientId: patient.id,
        professionalName: recorder,
        emrSection: noteSection,
        entryType: MedicalTimelineEntryType.SECTION_NOTE,
        title: noteTitle || undefined,
        body: noteBody,
      });
      setNoteOpen(false);
      router.refresh();
    });
  };

  /* Vitals form */
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [rr, setRr] = useState("");
  const [temp, setTemp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [wt, setWt] = useState("");
  const [ht, setHt] = useState("");

  const previewAlerts = useMemo(() => {
    const s = Number(spo2);
    const t = Number(temp);
    return liveVitalAlerts(bp, Number.isFinite(s) ? s : 0, Number.isFinite(t) ? t : 0);
  }, [bp, spo2, temp]);

  const submitVitals = () => {
    if (recorder.trim().length < 2) return alert("Set professional name.");
    startTransition(async () => {
      await appendVitalsWithTimeline({
        patientId: patient.id,
        professionalName: recorder,
        bp,
        pulse: Number(pulse),
        rr: Number(rr),
        temp: Number(temp),
        spO2: Number(spo2),
        weightKg: wt ? Number(wt) : undefined,
        heightCm: ht ? Number(ht) : undefined,
      });
      setBp(""); setPulse(""); setRr(""); setTemp(""); setSpo2(""); setWt(""); setHt("");
      router.refresh();
    });
  };

  /* Nursing dialog */
  const [nOpen, setNOpen] = useState(false);
  const [nIv, setNIv] = useState("");
  const [nIn, setNIn] = useState("");
  const [nOut, setNOut] = useState("");
  const [nMeds, setNMeds] = useState("");
  const [nBody, setNBody] = useState("");

  const submitNursing = () => {
    if (recorder.trim().length < 2) return alert("Set professional name.");
    startTransition(async () => {
      await appendNursingProgress({
        patientId: patient.id,
        professionalName: recorder,
        body: nBody,
        ivFluids: nIv,
        intake: nIn,
        output: nOut,
        medicationsGiven: nMeds,
      });
      setNOpen(false);
      setNIv(""); setNIn(""); setNOut(""); setNMeds(""); setNBody("");
      router.refresh();
    });
  };

  /* IPPA state */
  const [exOpen, setExOpen] = useState(false);
  const [exBody, setExBody] = useState("");
  const [ippa, setIppa] = useState<Record<string, Partial<Record<string, string>>>>({});

  const setIppaCell = (sys: string, phase: string, val: string) => {
    setIppa((prev) => ({ ...prev, [sys]: { ...prev[sys], [phase]: val } }));
  };

  const submitExam = () => {
    if (recorder.trim().length < 2) return alert("Set professional name.");
    startTransition(async () => {
      await appendSystemsExam({
        patientId: patient.id,
        professionalName: recorder,
        body: exBody,
        ippaBySystem: ippa,
      });
      setExOpen(false);
      setExBody(""); setIppa({});
      router.refresh();
    });
  };

  /* Admit */
  const [adOpen, setAdOpen] = useState(false);
  const [adWard, setAdWard] = useState<Ward>("MEDICAL_WARD");
  const submitAdmit = () => {
    if (recorder.trim().length < 2) return alert("Set professional name.");
    startTransition(async () => {
      await logAdmissionToWard({ patientId: patient.id, professionalName: recorder, ward: adWard });
      setAdOpen(false);
      router.refresh();
    });
  };

  const mrn = patient.mrn || patient.hospitalId || patient.internalId;

  /* Dark input className helper */
  const darkInput = "bg-neutral-900 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500/60 focus:ring-blue-500/20";
  const darkTextarea = "bg-neutral-900 border-neutral-700 text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500/60 focus:ring-blue-500/20";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col pb-24">

      {/* ── HEADER ── */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md px-4 py-3 flex flex-wrap items-center gap-3 shrink-0 sticky top-0 z-50">
        <Link href={`/doctor/patient/${patient.id}`}>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition px-3 py-2 rounded-xl hover:bg-neutral-800">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <h1 className="text-sm font-bold text-white">EMR Manage Workspace</h1>
        </div>

        <div className="ml-auto flex items-center gap-2 min-w-[200px] flex-1 max-w-sm">
          <Label className="text-xs text-neutral-500 shrink-0 font-semibold">Recording as</Label>
          <Input
            placeholder="Full professional name"
            value={recorder}
            onChange={(e) => setRecorder(e.target.value)}
            className={`h-9 text-sm ${darkInput}`}
          />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">

        {/* ── LEFT SIDEBAR — Patient summary ── */}
        <aside className="w-72 shrink-0 border-r border-neutral-800 bg-neutral-900/60 p-5 space-y-5 hidden lg:flex lg:flex-col overflow-y-auto">

          {/* Patient identity */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-3">
              <User className="w-3.5 h-3.5" /> Patient Summary
            </div>
            <p className="text-base font-bold text-white leading-tight">{patient.fullName}</p>
            <p className="text-xs font-mono text-neutral-500">ID: {patient.healthId}</p>
            {mrn && <p className="text-xs font-mono text-neutral-500">MRN: {mrn}</p>}
          </div>

          {/* Key facts */}
          <div className="rounded-xl bg-neutral-800/60 border border-neutral-700/60 p-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs">Age / Sex</span>
              <span className="text-white font-semibold">{patient.age} / {patient.sex}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs">Blood Group</span>
              <span className="text-white font-semibold">{patient.bloodGroup || "—"}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-neutral-500 text-xs shrink-0">Allergy</span>
              <span className={`text-xs font-semibold text-right ${patient.allergyInformation ? "text-amber-300" : "text-neutral-500"}`}>
                {patient.allergyInformation || "None recorded"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 text-xs">Triage</span>
              <TriageChip status={patient.triageStatus} />
            </div>
            {latestScreen && (
              <p className="text-[10px] text-neutral-500 border-t border-neutral-700 pt-2">
                Screen: {latestScreen.triageResult} ({latestScreen.screeningType})
              </p>
            )}
          </div>

          {/* Stale alert */}
          {stale && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 flex gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span className="font-semibold text-red-300">No update in 24 hours — review required.</span>
            </div>
          )}

          {/* Last activity */}
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
            <Clock className="w-3 h-3" />
            Last activity: {new Date(lastClinicalActivity).toLocaleString()}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">

          {/* Mobile patient bar */}
          <div className="lg:hidden rounded-xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-bold text-white">{patient.fullName}</p>
              <p className="font-mono text-xs text-neutral-500">{patient.healthId}</p>
            </div>
            <TriageChip status={patient.triageStatus} />
          </div>

          {stale && (
            <div className="lg:hidden rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> No clinical update in 24 hours.
            </div>
          )}

          {/* EMR accordion */}
          <Accordion type="multiple" defaultValue={["vitals", "identification"]} className="space-y-2">
            {EMR_SECTION_IDS.map((sid) => {
              const rows = bySection.get(sid) || [];
              return (
                <AccordionItem
                  key={sid}
                  value={sid}
                  className="border border-neutral-800 rounded-2xl bg-neutral-900/60 px-4 overflow-hidden"
                >
                  <AccordionTrigger className="hover:no-underline text-left font-semibold text-neutral-200 py-4 [&[data-state=open]>svg]:rotate-180">
                    <span className="flex items-center gap-2">
                      {EMR_SECTION_LABELS[sid].en}
                      <span className="text-[10px] font-normal text-neutral-600 bg-neutral-800 rounded-lg px-2 py-0.5">
                        {rows.length} entries
                      </span>
                    </span>
                  </AccordionTrigger>

                  <AccordionContent className="space-y-4 pb-4">

                    {/* Identification static data */}
                    {sid === "identification" && (
                      <div className="text-xs rounded-xl bg-neutral-800/60 border border-neutral-700/50 p-4 space-y-2 text-neutral-300">
                        <div className="flex justify-between"><span className="text-neutral-500">Age / sex</span><span>{patient.age} / {patient.sex}</span></div>
                        <div className="flex justify-between"><span className="text-neutral-500">Ward</span><span>{String(patient.ward).replace(/_/g, " ")}</span></div>
                        <div className="flex justify-between"><span className="text-neutral-500">Phone</span><span className="font-mono">{patient.phoneNumber || "—"}</span></div>
                      </div>
                    )}

                    {/* Past history */}
                    {sid === "past_history" && (
                      <div className="text-xs rounded-xl bg-neutral-800/60 border border-neutral-700/50 p-4 space-y-2 text-neutral-300 whitespace-pre-wrap">
                        <p><span className="font-semibold text-neutral-400">Conditions: </span>{patient.preExistingConditions || "—"}</p>
                        <p><span className="font-semibold text-neutral-400">Family: </span>{patient.familyHistory || "—"}</p>
                        <p><span className="font-semibold text-neutral-400">Surgical: </span>{patient.surgicalHistory || "—"}</p>
                      </div>
                    )}

                    {/* Investigations list */}
                    {sid === "investigations" && (
                      <div className="text-xs space-y-1 max-h-40 overflow-y-auto rounded-xl border border-neutral-700/50 bg-neutral-900 p-3">
                        {(patient.investigations || []).map((i: any) => (
                          <div key={i.id} className="border-b border-neutral-800 py-1.5 flex justify-between">
                            <span className="font-medium text-neutral-200">{i.testName}</span>
                            <span className="text-neutral-500">{i.status}{i.result && ` — ${i.result}`}</span>
                          </div>
                        ))}
                        {(!patient.investigations || patient.investigations.length === 0) && (
                          <p className="text-neutral-600 italic">No orders.</p>
                        )}
                      </div>
                    )}

                    {/* Medications list */}
                    {sid === "medications" && (
                      <div className="text-xs space-y-1 max-h-40 overflow-y-auto rounded-xl border border-neutral-700/50 bg-neutral-900 p-3">
                        {(patient.prescriptions || []).map((p: any) => (
                          <div key={p.id} className="border-b border-neutral-800 py-1.5 flex justify-between">
                            <span className="font-medium text-neutral-200">{p.drugName}</span>
                            <span className="text-neutral-500">{p.dosage} · {p.status}</span>
                          </div>
                        ))}
                        {(!patient.prescriptions || patient.prescriptions.length === 0) && (
                          <p className="text-neutral-600 italic">No prescriptions.</p>
                        )}
                      </div>
                    )}

                    {/* Referrals list */}
                    {sid === "referrals" && (
                      <div className="text-xs space-y-1 max-h-40 overflow-y-auto rounded-xl border border-neutral-700/50 bg-neutral-900 p-3">
                        {(patient.referrals || []).map((r: any) => (
                          <div key={r.id} className="border-b border-neutral-800 py-1.5">
                            <span className="font-medium text-neutral-200">{r.destinationFacility}</span>
                            <span className="text-neutral-500"> — {r.reason}</span>
                          </div>
                        ))}
                        {(!patient.referrals || patient.referrals.length === 0) && (
                          <p className="text-neutral-600 italic">No referrals.</p>
                        )}
                      </div>
                    )}

                    {/* Legacy clinical exam note */}
                    {sid === "clinical_exam" && patient.clinicalExam && (
                      <p className="text-xs text-amber-400/80 italic border border-amber-500/20 bg-amber-950/20 rounded-xl p-3">
                        Legacy single-record exam on file. New IPPA entries append below as immutable timeline rows.
                      </p>
                    )}

                    {/* ── VITALS ENTRY FORM ── */}
                    {sid === "vitals" && (
                      <div className="rounded-xl border border-neutral-700/60 bg-neutral-900 p-5 space-y-4">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                          <HeartPulse className="w-3.5 h-3.5 text-emerald-400" /> Record vitals (immutable row)
                        </p>

                        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: "BP (sys/dia)", val: bp, set: setBp, placeholder: "120/80" },
                            { label: "Pulse (/min)", val: pulse, set: setPulse, type: "number" },
                            { label: "RR (/min)", val: rr, set: setRr, type: "number" },
                            { label: "Temp °C", val: temp, set: setTemp, type: "number", step: "0.1" },
                            { label: "SpO₂ %", val: spo2, set: setSpo2, type: "number" },
                            { label: "Weight kg", val: wt, set: setWt, type: "number", step: "0.1" },
                            { label: "Height cm", val: ht, set: setHt, type: "number", step: "0.5" },
                          ].map(({ label, val, set, type, step, placeholder }) => (
                            <div key={label}>
                              <Label className="text-[10px] text-neutral-500 uppercase tracking-wide font-semibold">{label}</Label>
                              <Input
                                value={val}
                                onChange={(e) => set(e.target.value)}
                                placeholder={placeholder}
                                type={type}
                                step={step}
                                className={`h-9 mt-1 ${darkInput}`}
                              />
                            </div>
                          ))}
                        </div>

                        {previewAlerts.length > 0 && (
                          <div className="space-y-1">
                            {previewAlerts.map((a, i) => (
                              <p key={i} className={`text-xs font-semibold flex items-center gap-1.5 ${a.level === "red" ? "text-red-400" : "text-amber-400"}`}>
                                <AlertTriangle className="w-3 h-3 shrink-0" /> {a.msg}
                              </p>
                            ))}
                          </div>
                        )}

                        <Button
                          size="sm"
                          onClick={submitVitals}
                          disabled={pending}
                          className="bg-emerald-700 hover:bg-emerald-600 text-white"
                        >
                          <HeartPulse className="w-3.5 h-3.5 mr-1.5" />
                          Save vitals + timeline
                        </Button>

                        {/* Vitals history */}
                        {(patient.vitals || []).length > 0 && (
                          <div className="border-t border-neutral-800 pt-3 space-y-1 max-h-48 overflow-y-auto">
                            <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest mb-2">History</p>
                            {(patient.vitals || []).slice(0, 8).map((v: any) => (
                              <div
                                key={v.id}
                                className={`text-xs font-mono border-b border-neutral-800/60 pb-1.5 ${vitalHistoryRowClass(
                                  String(v.bp || ""),
                                  Number(v.spO2) || 0,
                                  Number(v.temp) || 0
                                )}`}
                              >
                                <span className="text-neutral-600">{new Date(v.createdAt).toLocaleString()}</span>
                                {" "}<span>BP {v.bp}</span> · <span>PR {v.pulse}</span> · <span>RR {v.rr}</span> · <span>T {v.temp}°C</span> · <span>SpO₂ {v.spO2}%</span>
                                {v.bmi != null && <span> · BMI {v.bmi}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Clinical exam button */}
                    {sid === "clinical_exam" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExOpen(true)}
                        className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                      >
                        <Stethoscope className="w-4 h-4 mr-1" /> Add systems exam (IPPA)
                      </Button>
                    )}

                    {/* Nursing note button */}
                    {sid === "nursing_progress" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNOpen(true)}
                        className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                      >
                        <Syringe className="w-4 h-4 mr-1" /> Add nursing / I-O note
                      </Button>
                    )}

                    {/* Timeline rows */}
                    <div className="space-y-2">
                      {rows.length === 0 && <p className="text-xs text-neutral-600 italic">No entries yet.</p>}
                      {rows.map((r: any) => (
                        <div key={r.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm">
                          <div className="flex justify-between gap-2 text-xs text-neutral-600 mb-1.5">
                            <span>{new Date(r.createdAt).toLocaleString()}</span>
                            <span className="font-semibold text-neutral-400">{r.professionalName}</span>
                          </div>
                          {r.title && <p className="font-semibold text-neutral-200 mb-1">{r.title}</p>}
                          <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed">{r.body}</p>
                          {r.logEntry && (
                            <p className="text-[10px] text-neutral-600 mt-2 font-mono truncate">{r.logEntry}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openNote(sid)}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700"
                    >
                      <FileText className="w-4 h-4 mr-1" /> + Add note
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </main>
      </div>

      {/* ── STICKY FOOTER ACTION BAR ── */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md py-3 px-4 flex flex-wrap items-center justify-center gap-2 z-40">
        <OrderTestModal patientId={patient.id} patientName={patient.fullName} />
        <PrescribeModal
          patientId={patient.id}
          patientName={patient.fullName}
          patientAllergies={patient.allergyInformation}
          patientHistory={patient.preExistingConditions}
        />
        <ReferModal patient={patient} />
        <Button
          variant="default"
          className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
          onClick={() => setAdOpen(true)}
        >
          Admit / Ward
        </Button>
      </footer>

      {/* ── DIALOGS ── */}

      {/* Add Note */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
          <DialogHeader>
            <DialogTitle className="text-white">Add note — {noteSection.replace(/_/g, " ")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-neutral-400 text-xs">Title (optional)</Label>
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className={`mt-1 ${darkInput}`} />
            </div>
            <div>
              <Label className="text-neutral-400 text-xs">Body</Label>
              <Textarea rows={5} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} className={`mt-1 ${darkTextarea}`} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)} className="border-neutral-700 text-neutral-400 hover:text-white">Cancel</Button>
            <Button onClick={submitNote} disabled={pending} className="bg-blue-600 hover:bg-blue-500 text-white">Save permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nursing progress */}
      <Dialog open={nOpen} onOpenChange={setNOpen}>
        <DialogContent className="max-w-lg bg-neutral-900 border-neutral-800 text-neutral-100">
          <DialogHeader>
            <DialogTitle className="text-white">Nursing progress</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {[
              { label: "IV fluids", val: nIv, set: setNIv, rows: 2 },
              { label: "Intake", val: nIn, set: setNIn, rows: 1 },
              { label: "Output", val: nOut, set: setNOut, rows: 1 },
              { label: "Medications administered", val: nMeds, set: setNMeds, rows: 2 },
              { label: "Narrative", val: nBody, set: setNBody, rows: 3 },
            ].map(({ label, val, set, rows }) => (
              <div key={label}>
                <Label className="text-neutral-400 text-xs">{label}</Label>
                {rows > 1 ? (
                  <Textarea rows={rows} value={val} onChange={(e) => set(e.target.value)} className={`mt-1 ${darkTextarea}`} />
                ) : (
                  <Input value={val} onChange={(e) => set(e.target.value)} className={`mt-1 ${darkInput}`} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={submitNursing} disabled={pending || !nBody.trim()} className="bg-blue-600 hover:bg-blue-500 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IPPA Systems exam */}
      <Dialog open={exOpen} onOpenChange={setExOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-800 text-neutral-100">
          <DialogHeader>
            <DialogTitle className="text-white">Systems examination (IPPA)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-neutral-400 text-xs">Overall clinical impression</Label>
              <Textarea rows={3} value={exBody} onChange={(e) => setExBody(e.target.value)} className={`mt-1 ${darkTextarea}`} />
            </div>
            {EXAM_SYSTEMS.map((sys) => (
              <div key={sys} className="border border-neutral-800 rounded-xl p-4 space-y-3 bg-neutral-950/40">
                <p className="text-sm font-semibold text-neutral-200">{EXAM_SYSTEM_LABELS[sys]}</p>
                <p className="text-[10px] text-neutral-600 uppercase tracking-wide">
                  IPPA — {IPPA_PHASES.map((ph) => IPPA_PHASE_LABELS[ph]).join(" → ")}
                </p>
                <div className="flex flex-col gap-3">
                  {IPPA_PHASES.map((ph) => (
                    <div key={ph}>
                      <Label className="text-xs font-medium text-neutral-400">{IPPA_PHASE_LABELS[ph]}</Label>
                      <Textarea
                        rows={2}
                        className={`text-xs mt-1 ${darkTextarea}`}
                        value={ippa[sys]?.[ph] || ""}
                        onChange={(e) => setIppaCell(sys, ph, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={submitExam} disabled={pending || !exBody.trim()} className="bg-blue-600 hover:bg-blue-500 text-white">
              Save immutable exam entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admit / Ward */}
      <Dialog open={adOpen} onOpenChange={setAdOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
          <DialogHeader>
            <DialogTitle className="text-white">Admit / assign ward</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-neutral-400 text-xs">Ward</Label>
            <select
              className="mt-1 w-full border border-neutral-700 rounded-xl h-10 px-3 bg-neutral-950 text-neutral-100 focus:border-blue-500/60 outline-none"
              value={adWard}
              onChange={(e) => setAdWard(e.target.value as Ward)}
            >
              {WARD_OPTIONS.map((w) => (
                <option key={w} value={w} className="bg-neutral-900">
                  {w.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button onClick={submitAdmit} disabled={pending} className="bg-blue-600 hover:bg-blue-500 text-white">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
