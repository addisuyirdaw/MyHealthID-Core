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
import { Activity, AlertTriangle, ArrowLeft, FileText, Stethoscope, Syringe, User } from "lucide-react";

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
    /** Matches `stageBloodPressure` in clinicalEngine: crisis = SBP >180 OR DBP >120. */
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
  if (isHypertensiveCrisisBp(bp)) return "text-red-600 font-semibold";
  if (spo2 > 0 && spo2 < 92) return "text-red-600 font-semibold";
  if (temp >= 39) return "text-red-600 font-semibold";
  const p = parseBp(bp);
  if (p && (p.sys >= 140 || p.dia >= 90)) return "text-amber-800 font-medium";
  if (spo2 > 0 && spo2 < 94) return "text-amber-800 font-medium";
  if (temp >= 38.5) return "text-amber-800 font-medium";
  return "text-slate-600";
}

export default function ManageWorkspaceClient({ bundle }: { bundle: Bundle }) {
  const router = useRouter();
  const { patient, lastClinicalActivity } = bundle;
  const [recorder, setRecorder] = useState("");
  const [pending, startTransition] = useTransition();

  /** No clinical touch for ≥24h — aligns with longitudinal chart review alerts. */
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
      setBp("");
      setPulse("");
      setRr("");
      setTemp("");
      setSpo2("");
      setWt("");
      setHt("");
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
      setNIv("");
      setNIn("");
      setNOut("");
      setNMeds("");
      setNBody("");
      router.refresh();
    });
  };

  /* IPPA state */
  const [exOpen, setExOpen] = useState(false);
  const [exBody, setExBody] = useState("");
  const [ippa, setIppa] = useState<Record<string, Partial<Record<string, string>>>>({});

  const setIppaCell = (sys: string, phase: string, val: string) => {
    setIppa((prev) => ({
      ...prev,
      [sys]: { ...prev[sys], [phase]: val },
    }));
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
      setExBody("");
      setIppa({});
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col pb-24">
      <header className="border-b bg-white px-4 py-3 flex flex-wrap items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/doctor/patient/${patient.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          EMR Manage Workspace
        </h1>
        <div className="ml-auto flex items-center gap-2 min-w-[200px] flex-1 max-w-md">
          <Label className="text-xs shrink-0">Recording as</Label>
          <Input
            placeholder="Full professional name"
            value={recorder}
            onChange={(e) => setRecorder(e.target.value)}
            className="h-9"
          />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Summary rail */}
        <aside className="w-72 shrink-0 border-r bg-slate-900 text-slate-100 p-4 space-y-4 hidden lg:block overflow-y-auto">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <User className="w-4 h-4" />
            Patient summary
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">{patient.fullName}</p>
            <p className="text-xs font-mono text-slate-400 mt-1">MyHealthID: {patient.healthId}</p>
            <p className="text-xs font-mono text-slate-400">MRN: {mrn}</p>
          </div>
          <div className="rounded-lg bg-slate-800/80 p-3 text-sm space-y-1">
            <p>
              <span className="text-slate-500">Blood group:</span>{" "}
              <span className="text-white font-medium">{patient.bloodGroup || "—"}</span>
            </p>
            <p>
              <span className="text-slate-500">Allergy alert:</span>{" "}
              <span className={patient.allergyInformation ? "text-amber-300 font-medium" : "text-slate-400"}>
                {patient.allergyInformation || "None recorded"}
              </span>
            </p>
            <p>
              <span className="text-slate-500">Triage:</span>{" "}
              <span className="font-mono text-cyan-300">{patient.triageStatus}</span>
              {latestScreen && (
                <span className="block text-xs text-slate-400 mt-1">
                  Last screen: {latestScreen.triageResult} ({latestScreen.screeningType})
                </span>
              )}
            </p>
          </div>
          {stale && (
            <div className="rounded-lg border border-red-500/70 bg-red-950/50 p-3 text-red-100 text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="font-semibold text-red-50">Patient has not been updated for 24 hours.</span>
            </div>
          )}
          <p className="text-[10px] text-slate-500">
            Last activity: {new Date(lastClinicalActivity).toLocaleString()}
          </p>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="lg:hidden rounded-xl bg-slate-900 text-slate-100 p-4 space-y-2 text-sm">
            <p className="font-semibold">{patient.fullName}</p>
            <p className="font-mono text-xs text-slate-400">{patient.healthId}</p>
            {stale && (
              <p className="text-red-400 text-xs font-semibold">
                Patient has not been updated for 24 hours.
              </p>
            )}
          </div>

          <Accordion type="multiple" defaultValue={["vitals", "identification"]} className="space-y-2">
            {EMR_SECTION_IDS.map((sid) => {
              const rows = bySection.get(sid) || [];
              return (
                <AccordionItem key={sid} value={sid} className="border rounded-xl bg-white px-4 shadow-sm">
                  <AccordionTrigger className="hover:no-underline text-left font-semibold">
                    {EMR_SECTION_LABELS[sid].en}
                    <span className="ml-2 text-xs font-normal text-slate-400">({rows.length} entries)</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    {sid === "identification" && (
                      <div className="text-xs rounded-lg bg-slate-50 border p-3 space-y-1 text-slate-700">
                        <p>
                          <span className="text-slate-500">Age / sex:</span> {patient.age} / {patient.sex}
                        </p>
                        <p>
                          <span className="text-slate-500">Ward:</span> {String(patient.ward).replace(/_/g, " ")}
                        </p>
                        <p>
                          <span className="text-slate-500">Phone:</span> {patient.phoneNumber || "—"}
                        </p>
                      </div>
                    )}

                    {sid === "past_history" && (
                      <div className="text-xs rounded-lg bg-slate-50 border p-3 space-y-2 text-slate-700 whitespace-pre-wrap">
                        <p>
                          <span className="font-semibold">Conditions:</span> {patient.preExistingConditions || "—"}
                        </p>
                        <p>
                          <span className="font-semibold">Family:</span> {patient.familyHistory || "—"}
                        </p>
                        <p>
                          <span className="font-semibold">Surgical:</span> {patient.surgicalHistory || "—"}
                        </p>
                      </div>
                    )}

                    {sid === "investigations" && (
                      <div className="text-xs space-y-1 max-h-40 overflow-y-auto border rounded p-2 bg-slate-50">
                        {(patient.investigations || []).map((i: any) => (
                          <div key={i.id} className="border-b border-slate-200 py-1">
                            <span className="font-medium">{i.testName}</span> — {i.status}
                            {i.result && <span className="text-slate-600"> — {i.result}</span>}
                          </div>
                        ))}
                        {(!patient.investigations || patient.investigations.length === 0) && (
                          <p className="text-slate-500 italic">No orders.</p>
                        )}
                      </div>
                    )}

                    {sid === "medications" && (
                      <div className="text-xs space-y-1 max-h-40 overflow-y-auto border rounded p-2 bg-slate-50">
                        {(patient.prescriptions || []).map((p: any) => (
                          <div key={p.id} className="border-b border-slate-200 py-1">
                            {p.drugName} — {p.dosage} ({p.status})
                          </div>
                        ))}
                        {(!patient.prescriptions || patient.prescriptions.length === 0) && (
                          <p className="text-slate-500 italic">No prescriptions.</p>
                        )}
                      </div>
                    )}

                    {sid === "referrals" && (
                      <div className="text-xs space-y-1 max-h-40 overflow-y-auto border rounded p-2 bg-slate-50">
                        {(patient.referrals || []).map((r: any) => (
                          <div key={r.id} className="border-b border-slate-200 py-1">
                            {r.destinationFacility}: {r.reason}
                          </div>
                        ))}
                        {(!patient.referrals || patient.referrals.length === 0) && (
                          <p className="text-slate-500 italic">No referrals.</p>
                        )}
                      </div>
                    )}

                    {sid === "clinical_exam" && patient.clinicalExam && (
                      <p className="text-xs text-slate-600 italic border rounded p-2 bg-amber-50/50">
                        Legacy single-record exam exists on file (editable elsewhere). New IPPA entries append below as
                        immutable timeline rows.
                      </p>
                    )}

                    {sid === "vitals" && (
                      <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/80 space-y-3">
                        <p className="text-xs font-bold text-slate-600 uppercase">Record vitals (immutable row)</p>
                        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">BP (sys/dia)</Label>
                            <Input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" className="h-9" />
                          </div>
                          <div>
                            <Label className="text-xs">Pulse (/min)</Label>
                            <Input value={pulse} onChange={(e) => setPulse(e.target.value)} className="h-9" type="number" />
                          </div>
                          <div>
                            <Label className="text-xs">RR</Label>
                            <Input value={rr} onChange={(e) => setRr(e.target.value)} className="h-9" type="number" />
                          </div>
                          <div>
                            <Label className="text-xs">Temp °C</Label>
                            <Input value={temp} onChange={(e) => setTemp(e.target.value)} className="h-9" type="number" step="0.1" />
                          </div>
                          <div>
                            <Label className="text-xs">SpO₂ %</Label>
                            <Input value={spo2} onChange={(e) => setSpo2(e.target.value)} className="h-9" type="number" />
                          </div>
                          <div>
                            <Label className="text-xs">Weight kg</Label>
                            <Input value={wt} onChange={(e) => setWt(e.target.value)} className="h-9" type="number" step="0.1" />
                          </div>
                          <div>
                            <Label className="text-xs">Height cm</Label>
                            <Input value={ht} onChange={(e) => setHt(e.target.value)} className="h-9" type="number" step="0.5" />
                          </div>
                        </div>
                        {previewAlerts.length > 0 && (
                          <div className="space-y-1">
                            {previewAlerts.map((a, i) => (
                              <p
                                key={i}
                                className={`text-xs font-medium ${a.level === "red" ? "text-red-600" : "text-amber-700"}`}
                              >
                                {a.msg}
                              </p>
                            ))}
                          </div>
                        )}
                        <Button size="sm" onClick={submitVitals} disabled={pending}>
                          Save vitals + timeline
                        </Button>
                        <div className="border-t pt-3 space-y-2 max-h-48 overflow-y-auto">
                          {(patient.vitals || []).slice(0, 8).map((v: any) => (
                            <div
                              key={v.id}
                              className={`text-xs font-mono border-b border-slate-100 pb-1 ${vitalHistoryRowClass(
                                String(v.bp || ""),
                                Number(v.spO2) || 0,
                                Number(v.temp) || 0
                              )}`}
                            >
                              {new Date(v.createdAt).toLocaleString()} — {v.bp} PR {v.pulse} RR {v.rr} T {v.temp} SpO₂{" "}
                              {v.spO2}
                              {v.bmi != null ? ` BMI ${v.bmi}` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sid === "clinical_exam" && (
                      <Button variant="outline" size="sm" onClick={() => setExOpen(true)}>
                        <Stethoscope className="w-4 h-4 mr-1" />
                        Add systems exam (IPPA)
                      </Button>
                    )}

                    {sid === "nursing_progress" && (
                      <Button variant="outline" size="sm" onClick={() => setNOpen(true)}>
                        <Syringe className="w-4 h-4 mr-1" />
                        Add nursing / I-O note
                      </Button>
                    )}

                    <div className="space-y-2">
                      {rows.length === 0 && <p className="text-xs text-slate-500 italic">No entries yet.</p>}
                      {rows.map((r: any) => (
                        <div key={r.id} className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
                          <div className="flex justify-between gap-2 text-xs text-slate-500">
                            <span>{new Date(r.createdAt).toLocaleString()}</span>
                            <span className="font-medium text-slate-700">{r.professionalName}</span>
                          </div>
                          {r.title && <p className="font-semibold text-slate-800 mt-1">{r.title}</p>}
                          <p className="text-slate-700 whitespace-pre-wrap mt-1">{r.body}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{r.logEntry}</p>
                        </div>
                      ))}
                    </div>

                    <Button variant="secondary" size="sm" onClick={() => openNote(sid)}>
                      <FileText className="w-4 h-4 mr-1" />+ Add note
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </main>
      </div>

      {/* Footer action bar */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur py-2 px-4 flex flex-wrap items-center justify-center gap-2 z-40">
        <OrderTestModal patientId={patient.id} patientName={patient.fullName} />
        <PrescribeModal
          patientId={patient.id}
          patientName={patient.fullName}
          patientAllergies={patient.allergyInformation}
          patientHistory={patient.preExistingConditions}
        />
        <ReferModal patientId={patient.id} patientName={patient.fullName} />
        <Button variant="default" className="bg-slate-800 hover:bg-slate-700" onClick={() => setAdOpen(true)}>
          Admit / Ward
        </Button>
      </footer>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add note — {noteSection.replace(/_/g, " ")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Title (optional)</Label>
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={5} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitNote} disabled={pending}>
              Save permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={nOpen} onOpenChange={setNOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nursing progress</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>IV fluids</Label>
              <Textarea rows={2} value={nIv} onChange={(e) => setNIv(e.target.value)} />
            </div>
            <div>
              <Label>Intake</Label>
              <Input value={nIn} onChange={(e) => setNIn(e.target.value)} />
            </div>
            <div>
              <Label>Output</Label>
              <Input value={nOut} onChange={(e) => setNOut(e.target.value)} />
            </div>
            <div>
              <Label>Medications administered</Label>
              <Textarea rows={2} value={nMeds} onChange={(e) => setNMeds(e.target.value)} />
            </div>
            <div>
              <Label>Narrative</Label>
              <Textarea rows={3} value={nBody} onChange={(e) => setNBody(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitNursing} disabled={pending || !nBody.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exOpen} onOpenChange={setExOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Systems examination (IPPA)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Overall clinical impression</Label>
              <Textarea rows={3} value={exBody} onChange={(e) => setExBody(e.target.value)} />
            </div>
            {EXAM_SYSTEMS.map((sys) => (
              <div key={sys} className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold">{EXAM_SYSTEM_LABELS[sys]}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                  IPPA — {IPPA_PHASES.map((ph) => IPPA_PHASE_LABELS[ph]).join(" → ")}
                </p>
                <div className="flex flex-col gap-3">
                  {IPPA_PHASES.map((ph) => (
                    <div key={ph}>
                      <Label className="text-xs font-medium text-slate-700">{IPPA_PHASE_LABELS[ph]}</Label>
                      <Textarea
                        rows={2}
                        className="text-xs mt-1"
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
            <Button onClick={submitExam} disabled={pending || !exBody.trim()}>
              Save immutable exam entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adOpen} onOpenChange={setAdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admit / assign ward</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>Ward</Label>
            <select
              className="mt-1 w-full border rounded-md h-10 px-2 bg-white"
              value={adWard}
              onChange={(e) => setAdWard(e.target.value as Ward)}
            >
              {WARD_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button onClick={submitAdmit} disabled={pending}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
