"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  User, HeartPulse, Stethoscope, FlaskConical,
  Pill, ArrowLeft, ClipboardList, CheckCircle2,
  AlertTriangle, Droplet, Activity, Thermometer,
  Wind, Scale, Brain, Save, ExternalLink, Clock,
  FileText, Microscope, Scan, TestTubeDiagonal,
  Sparkles, Shield, Lock, X, Info
} from "lucide-react";
import { saveClinicalExam, saveDoctorAssessment } from "@/lib/actions/patient.actions";
import { createLabOrder } from "@/lib/actions/investigation.actions";
import { generateClinicalContextStream } from "@/lib/actions/ai.actions";
import { OrderTestModal } from "@/components/OrderTestModal";
import { PrescribeModal } from "@/components/PrescribeModal";
import { DynamicVitalsModal } from "@/components/DynamicVitalsModal";
import { ReferModal } from "@/components/ReferModal";

// ─── Investigation Catalog ─────────────────────────────────────────────────
const INVESTIGATION_CATALOG = {
  Hematology: [
    "Complete Blood Count (CBC)",
    "Blood Group & Cross-match",
    "Peripheral Blood Smear",
    "Erythrocyte Sedimentation Rate (ESR)",
    "Coagulation Profile (PT, aPTT, INR)",
    "Reticulocyte Count",
    "D-Dimer",
  ],
  Biochemistry: [
    "Blood Glucose (Fasting/Random)",
    "Glycated Hemoglobin (HbA1c)",
    "Serum Electrolytes (Na, K, Cl)",
    "Serum Creatinine & Blood Urea (RFT)",
    "Liver Function Tests (ALT, AST, ALP, Bilirubin)",
    "Lipid Profile",
    "Urinalysis",
    "Serum Albumin & Total Protein",
    "Amylase & Lipase",
    "Iron Studies (Iron, TIBC, Ferritin)",
  ],
  Serology: [
    "HIV Test",
    "HBsAg (Hepatitis B Surface Antigen)",
    "Hepatitis C Serology (HCV)",
    "C-Reactive Protein (CRP)",
    "Rheumatoid Factor (RF)",
    "Anti-Streptolysin O (ASO) Titer",
    "Malaria RDT / Blood Smear",
    "Tuberculosis GeneXpert / AFB Smear",
    "Thyroid Function Tests (TSH, T3, T4)",
  ],
  Cultures: [
    "Blood Culture & Sensitivity",
    "Urine Culture & Sensitivity",
    "Sputum Culture",
    "Stool Culture",
    "Wound / Swab Culture",
  ],
  Imaging: [
    "Chest X-ray (PA / AP)",
    "Abdominal X-ray",
    "Extremity X-ray",
    "Ultrasound Abdomen & Pelvis",
    "Obstetric / Pelvic Ultrasound",
    "CT Scan Head",
    "CT Scan Abdomen",
    "CT Scan Chest",
    "MRI Brain",
    "MRI Spine",
    "MRI Joint",
    "Doppler Ultrasound",
  ],
  Cardiac: [
    "Electrocardiogram (ECG / EKG)",
    "Echocardiography",
    "Stress Test / Exercise ECG",
    "Holter Monitoring",
    "Cardiac Biomarkers (Troponin, CK-MB, BNP)",
  ],
  Pathology: [
    "Histopathology",
    "Cytology",
    "Fine Needle Aspiration Cytology (FNAC)",
    "Pap Smear",
    "Tissue Biopsy",
    "Frozen Section",
  ],
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Hematology: Droplet,
  Biochemistry: FlaskConical,
  Serology: Activity,
  Cultures: Microscope,
  Imaging: Scan,
  Cardiac: HeartPulse,
  Pathology: TestTubeDiagonal,
};

const CATEGORY_COLORS: Record<string, string> = {
  Hematology:   "text-rose-400 bg-rose-900/20 border-rose-700/30",
  Biochemistry: "text-amber-400 bg-amber-900/20 border-amber-700/30",
  Serology:     "text-blue-400 bg-blue-900/20 border-blue-700/30",
  Cultures:     "text-green-400 bg-green-900/20 border-green-700/30",
  Imaging:      "text-purple-400 bg-purple-900/20 border-purple-700/30",
  Cardiac:      "text-pink-400 bg-pink-900/20 border-pink-700/30",
  Pathology:    "text-cyan-400 bg-cyan-900/20 border-cyan-700/30",
};

const TABS = [
  { id: "identification", label: "Identification & Vitals",  icon: User },
  { id: "history",        label: "History & Examination",    icon: Stethoscope },
  { id: "assessment",     label: "Doctor Assessment",        icon: Brain },
  { id: "orders",         label: "Lab / Imaging / Pathology", icon: FlaskConical },
] as const;
type TabId = typeof TABS[number]["id"];

// ─── Field Row ────────────────────────────────────────────────────────────
function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-2 border-b border-neutral-700/30 text-sm">
      <span className="text-neutral-400 font-medium w-40 shrink-0">{label}</span>
      <span className="text-neutral-200 text-right flex-1">{value || <span className="text-neutral-600 italic">Not recorded</span>}</span>
    </div>
  );
}

// ─── Vital Card ───────────────────────────────────────────────────────────
function VitalCard({ icon: Icon, label, value, unit, color }: {
  icon: React.ElementType; label: string; value?: string | number | null; unit?: string; color: string;
}) {
  return (
    <div className={`rounded-xl p-4 border flex flex-col gap-1 ${color}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value ?? <span className="text-sm opacity-50">—</span>}</p>
      {unit && <span className="text-xs opacity-60">{unit}</span>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function DoctorPatientChart({ patient }: { patient: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("identification");

  // AI Clinical Support states
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiError, setAiError] = useState("");
  const [streamedBullets, setStreamedBullets] = useState<string[]>([]);

  const handleTriggerAI = async () => {
    setAiLoading(true);
    setAiError("");
    setStreamedBullets([]);
    try {
      const res = await generateClinicalContextStream(patient);
      setAiLoading(false);
      setAiStreaming(true);

      // Stream bullets sequentially
      let currentBulletIdx = 0;
      const streamNextBullet = () => {
        if (currentBulletIdx >= res.bullets.length) {
          setAiStreaming(false);
          return;
        }
        const fullText = res.bullets[currentBulletIdx];
        let charIdx = 0;
        const interval = setInterval(() => {
          setStreamedBullets(prev => {
            const copy = [...prev];
            copy[currentBulletIdx] = fullText.slice(0, charIdx);
            return copy;
          });
          charIdx += 6; // stream 6 characters at a time for smooth speed
          if (charIdx > fullText.length) {
            setStreamedBullets(prev => {
              const copy = [...prev];
              copy[currentBulletIdx] = fullText;
              return copy;
            });
            clearInterval(interval);
            currentBulletIdx++;
            setTimeout(streamNextBullet, 150); // small delay between bullets
          }
        }, 15);
      };
      streamNextBullet();
    } catch (err: any) {
      setAiLoading(false);
      setAiStreaming(false);
      setAiError(err.message || "Failed to generate AI insights.");
    }
  };

  // History & Examination state
  const [historyData, setHistoryData] = useState({
    preExistingConditions: patient.preExistingConditions || "",
    surgicalHistory:        patient.surgicalHistory || "",
    familyHistory:          patient.familyHistory || "",
    generalAppearance:      patient.clinicalExam?.generalAppearance || "",
    heent:                  patient.clinicalExam?.heent || "",
    lymphoglandular:        patient.clinicalExam?.lymphoglandular || "",
    respiratory:            patient.clinicalExam?.respiratory || "",
    cardiovascular:         patient.clinicalExam?.cardiovascular || "",
    abdomen:                patient.clinicalExam?.abdomen || "",
    genitourinary:          patient.clinicalExam?.genitourinary || "",
    musculoskeletal:        patient.clinicalExam?.musculoskeletal || "",
    integumentary:          patient.clinicalExam?.integumentary || "",
    neurological:           patient.clinicalExam?.neurological || "",
    clinicalNotes:          patient.clinicalExam?.clinicalNotes || "",
  });
  const [savingHistory, setSavingHistory] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);

  // Assessment state
  const [assessmentData, setAssessmentData] = useState({
    chiefAssessment:       patient.clinicalExam?.chiefAssessment || "",
    workingDiagnosis:      patient.clinicalExam?.workingDiagnosis || patient.suspectedDisease || "",
    differentialDiagnosis: patient.clinicalExam?.differentialDiagnosis || "",
    progressNotes:         patient.clinicalExam?.progressNotes || patient.detailedSituation || "",
  });
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentSaved, setAssessmentSaved] = useState(false);

  // Orders state
  const [selectedOrders, setSelectedOrders] = useState<Record<string, string[]>>({});
  const [orderNote, setOrderNote] = useState("");
  const [submittingOrders, setSubmittingOrders] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const toggleOrder = (category: string, test: string) => {
    setSelectedOrders(prev => {
      const arr = prev[category] || [];
      return {
        ...prev,
        [category]: arr.includes(test) ? arr.filter(t => t !== test) : [...arr, test],
      };
    });
  };
  const totalSelected = Object.values(selectedOrders).flat().length;

  const latestVital = patient.vitals?.[0];

  // ── Handlers ──
  const handleSaveHistory = async () => {
    setSavingHistory(true);
    try {
      await saveClinicalExam(patient.id, {
        generalAppearance: historyData.generalAppearance,
        heent:             historyData.heent,
        lymphoglandular:   historyData.lymphoglandular,
        respiratory:       historyData.respiratory,
        cardiovascular:    historyData.cardiovascular,
        abdomen:           historyData.abdomen,
        genitourinary:     historyData.genitourinary,
        musculoskeletal:   historyData.musculoskeletal,
        integumentary:     historyData.integumentary,
        neurological:      historyData.neurological,
        clinicalNotes:     historyData.clinicalNotes,
      });
      setHistorySaved(true);
      setTimeout(() => setHistorySaved(false), 3000);
    } catch (e) {
      alert("Failed to save. Please try again.");
    } finally {
      setSavingHistory(false);
    }
  };

  const handleSaveAssessment = async () => {
    setSavingAssessment(true);
    try {
      await saveDoctorAssessment(patient.id, assessmentData);
      setAssessmentSaved(true);
      setTimeout(() => setAssessmentSaved(false), 3000);
    } catch (e) {
      alert("Failed to save assessment. Please try again.");
    } finally {
      setSavingAssessment(false);
    }
  };

  const handleSubmitOrders = async () => {
    if (totalSelected === 0) return;
    setSubmittingOrders(true);
    try {
      for (const [category, tests] of Object.entries(selectedOrders)) {
        for (const testName of tests) {
          await createLabOrder({
            patientId: patient.id,
            testName,
            category,
            clinicalNote: orderNote,
          });
        }
      }
      setOrderSuccess(true);
      setSelectedOrders({});
      setOrderNote("");
      setTimeout(() => {
        setOrderSuccess(false);
        router.refresh();
      }, 2500);
    } catch (e) {
      alert("Failed to submit orders. Please try again.");
    } finally {
      setSubmittingOrders(false);
    }
  };

  const triageColor =
    patient.triageStatus === "RED" ? "bg-red-500" :
    patient.triageStatus === "YELLOW" ? "bg-amber-400" :
    patient.triageStatus === "GREEN" ? "bg-green-500" : "bg-neutral-500";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col">

      {/* ── Top Banner ── */}
      <div className="bg-[#171717] border-b border-neutral-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-700 border-2 border-neutral-500 flex items-center justify-center text-lg font-bold text-white">
                {patient.fullName?.charAt(0) || "?"}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{patient.fullName}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="font-mono text-blue-400 text-sm">{patient.healthId}</span>
                  {patient.nationalId && (
                    <span className="text-xs text-neutral-500 font-mono">NID: {patient.nationalId}</span>
                  )}
                  <span className="text-neutral-500">•</span>
                  <span className="text-sm text-neutral-400">{patient.age} yrs • {patient.sex}</span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-sm text-neutral-400">{patient.ward?.replace(/_/g," ")}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${triageColor}`} title={patient.triageStatus} />
                </div>
                {patient.allergyInformation && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-red-400 font-semibold">
                    <AlertTriangle className="w-3 h-3" /> ALLERGY: {patient.allergyInformation}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowAIPanel(prev => !prev)}
                className={`font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-all duration-300 ${
                  showAIPanel
                    ? "bg-blue-600 hover:bg-blue-500 text-white border border-blue-400"
                    : "bg-[#262626] hover:bg-[#323232] text-neutral-200 border border-neutral-700/60"
                }`}
              >
                <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                AI Clinical Support
              </Button>
              <DynamicVitalsModal patientId={patient.id} patientName={patient.fullName} />
              <PrescribeModal patientId={patient.id} patientName={patient.fullName} patientAllergies={patient.allergyInformation} />
              <ReferModal patientId={patient.id} patientName={patient.fullName} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="bg-[#171717] border-b border-neutral-700/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-600"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content and Sidebar Layout ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full min-w-0">

        {/* ══ TAB 1: Identification & Triage Vitals ══ */}
        {activeTab === "identification" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Patient Identity Card */}
            <div className="bg-[#171717] border border-neutral-700/50 rounded-2xl p-6 space-y-1">
              <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" /> Patient Identification
              </h2>
              <FieldRow label="Full Name"         value={patient.fullName} />
              <FieldRow label="MyHealth ID"       value={patient.healthId} />
              <FieldRow label="National ID (FIN)" value={patient.nationalId || patient.faydaId} />
              <FieldRow label="Hospital ID"       value={patient.hospitalId} />
              <FieldRow label="MRN"               value={patient.mrn} />
              <FieldRow label="Age"               value={`${patient.age} years`} />
              <FieldRow label="Sex"               value={patient.sex} />
              <FieldRow label="Date of Birth"     value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : undefined} />
              <FieldRow label="Religion"          value={patient.religion} />
              <FieldRow label="Occupation"        value={patient.occupation} />
              <FieldRow label="Marital Status"    value={patient.maritalStatus} />
              <FieldRow label="Education"         value={patient.educationalStatus} />
              <FieldRow label="Phone"             value={patient.phoneNumber} />
              <FieldRow label="Address"           value={[patient.address?.kebele, patient.address?.woreda, patient.address?.zone, patient.address?.region].filter(Boolean).join(", ")} />
              <FieldRow label="Emergency Contact" value={patient.emergencyContactName ? `${patient.emergencyContactName} — ${patient.emergencyContactPhone}` : undefined} />
              <FieldRow label="Ward"              value={patient.ward?.replace(/_/g," ")} />
              <FieldRow label="Admitted"          value={patient.dateOfAdmission ? new Date(patient.dateOfAdmission).toLocaleDateString() : undefined} />
              <FieldRow label="Blood Group"       value={patient.bloodGroup} />
              <FieldRow label="Allergies"         value={patient.allergyInformation} />
            </div>

            {/* Triage Info + Vitals */}
            <div className="space-y-6">
              {/* Triage & Chief Complaint */}
              <div className="bg-[#171717] border border-neutral-700/50 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-400" /> Triage & Chief Complaint
                </h2>
                <FieldRow label="Triage Status"   value={patient.triageStatus?.replace(/_/g," ")} />
                <FieldRow label="Priority Level"  value={patient.priorityLevel} />
                <FieldRow label="Service Type"    value={patient.serviceType} />
                <FieldRow label="Chief Complaint" value={patient.chiefComplaint} />
                <FieldRow label="Reason for Visit" value={patient.reasonForVisit} />
                {patient.suspectedDisease && (
                  <FieldRow label="Working Dx" value={patient.suspectedDisease} />
                )}
              </div>

              {/* Vitals */}
              <div className="bg-[#171717] border border-neutral-700/50 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-400" /> Latest Vital Signs
                  {latestVital && (
                    <span className="text-xs text-neutral-500 font-normal ml-auto">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(latestVital.createdAt).toLocaleString()}
                    </span>
                  )}
                </h2>
                {latestVital ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <VitalCard icon={HeartPulse}  label="Blood Pressure" value={latestVital.bp}          unit="mmHg"     color="border-rose-800/50 bg-rose-900/20 text-rose-300" />
                    <VitalCard icon={Activity}    label="Pulse Rate"     value={latestVital.pulse}        unit="bpm"      color="border-pink-800/50 bg-pink-900/20 text-pink-300" />
                    <VitalCard icon={Thermometer} label="Temperature"    value={latestVital.temp}         unit="°C"       color="border-orange-800/50 bg-orange-900/20 text-orange-300" />
                    <VitalCard icon={Wind}        label="Resp. Rate"     value={latestVital.rr}           unit="breaths/min" color="border-sky-800/50 bg-sky-900/20 text-sky-300" />
                    <VitalCard icon={Activity}    label="SpO2"           value={`${latestVital.spO2}`}    unit="%"        color="border-blue-800/50 bg-blue-900/20 text-blue-300" />
                    {latestVital.bmi && (
                      <VitalCard icon={Scale}     label="BMI"            value={latestVital.bmi}          unit="kg/m²"    color="border-violet-800/50 bg-violet-900/20 text-violet-300" />
                    )}
                    {latestVital.weightKg && (
                      <VitalCard icon={Scale}     label="Weight"         value={latestVital.weightKg}     unit="kg"       color="border-teal-800/50 bg-teal-900/20 text-teal-300" />
                    )}
                    {latestVital.heightCm && (
                      <VitalCard icon={Scale}     label="Height"         value={latestVital.heightCm}     unit="cm"       color="border-emerald-800/50 bg-emerald-900/20 text-emerald-300" />
                    )}
                    {latestVital.painLevel != null && (
                      <VitalCard icon={AlertTriangle} label="Pain Level" value={`${latestVital.painLevel}/10`} unit="scale" color="border-red-800/50 bg-red-900/20 text-red-300" />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500 italic">
                    <HeartPulse className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No vitals recorded yet
                  </div>
                )}

                {/* All vitals history */}
                {patient.vitals && patient.vitals.length > 1 && (
                  <details className="mt-4">
                    <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300">
                      View all {patient.vitals.length} vital recordings
                    </summary>
                    <div className="mt-3 space-y-2">
                      {patient.vitals.map((v: any, idx: number) => (
                        <div key={v.id} className="text-xs bg-neutral-800/50 rounded-lg px-3 py-2 flex justify-between items-center">
                          <span className="text-neutral-500">#{idx + 1}</span>
                          <span className="text-neutral-300 font-mono">BP: {v.bp} | P: {v.pulse} | T: {v.temp}°C | SpO2: {v.spO2}%</span>
                          <span className="text-neutral-600">{new Date(v.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB 2: Past Medical History & Clinical Examination ══ */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Medical History */}
            <div className="bg-[#171717] border border-neutral-700/50 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" /> Past Medical History
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "preExistingConditions", label: "Past Medical History", placeholder: "Diabetes, Hypertension, Cardiac disease, Asthma, TB, etc." },
                  { key: "surgicalHistory",        label: "Surgical History",     placeholder: "Previous operations, procedures, dates, outcomes..." },
                  { key: "familyHistory",          label: "Family History",       placeholder: "Inherited conditions, family illnesses, genetic concerns..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-neutral-300 font-semibold">{label}</Label>
                    <textarea
                      value={(historyData as any)[key]}
                      onChange={e => setHistoryData(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      rows={5}
                      className="w-full rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-200 placeholder-neutral-500 p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Physical Examination */}
            <div className="bg-[#171717] border border-neutral-700/50 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-purple-400" /> Physical Examination — Systems Review
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: "generalAppearance", label: "General Appearance", placeholder: "Alert, oriented, well-nourished, in no acute distress..." },
                  { key: "heent",             label: "HEENT",               placeholder: "Head, eyes, ears, nose, throat findings..." },
                  { key: "lymphoglandular",   label: "Lymphoglandular",     placeholder: "Lymph node assessment — size, tenderness, location..." },
                  { key: "respiratory",       label: "Respiratory",         placeholder: "Breath sounds, wheeze, crackles, percussion..." },
                  { key: "cardiovascular",    label: "Cardiovascular",      placeholder: "Heart sounds, murmurs, JVP, peripheral pulses..." },
                  { key: "abdomen",           label: "Abdomen",             placeholder: "Soft, tender, organomegaly, bowel sounds..." },
                  { key: "genitourinary",     label: "Genitourinary",       placeholder: "Renal angles, bladder, external genitalia..." },
                  { key: "musculoskeletal",   label: "Musculoskeletal",     placeholder: "Joint swelling, deformity, range of motion..." },
                  { key: "integumentary",     label: "Integumentary",       placeholder: "Skin color, texture, rashes, lesions, wounds..." },
                  { key: "neurological",      label: "Neurological",        placeholder: "GCS, cranial nerves, motor, sensory, reflexes..." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-neutral-300 text-xs font-bold uppercase tracking-wider">{label}</Label>
                    <textarea
                      value={(historyData as any)[key]}
                      onChange={e => setHistoryData(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      rows={3}
                      className="w-full rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-200 placeholder-neutral-500 p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Label className="text-neutral-300 font-semibold">Clinical Summary / Final Impressions</Label>
                <textarea
                  value={historyData.clinicalNotes}
                  onChange={e => setHistoryData(prev => ({ ...prev, clinicalNotes: e.target.value }))}
                  placeholder="Overall clinical summary, key findings, and preliminary impressions..."
                  rows={4}
                  className="w-full mt-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-200 placeholder-neutral-500 p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSaveHistory}
                  disabled={savingHistory}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6"
                >
                  {savingHistory ? (
                    <><Clock className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : historySaved ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-green-300" /> Saved!</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save Examination</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB 3: Doctor Assessment ══ */}
        {activeTab === "assessment" && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-[#171717] border border-neutral-700/50 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" /> Doctor's Clinical Assessment
              </h2>
              <div className="space-y-5">
                {/* Chief Assessment */}
                <div className="space-y-2">
                  <Label className="text-neutral-200 font-semibold text-base">Chief Assessment</Label>
                  <p className="text-xs text-neutral-500">The doctor's primary clinical summary of the patient's condition</p>
                  <textarea
                    value={assessmentData.chiefAssessment}
                    onChange={e => setAssessmentData(prev => ({ ...prev, chiefAssessment: e.target.value }))}
                    placeholder="e.g. 45-year-old male presenting with 3-day history of productive cough, fever, and pleuritic chest pain..."
                    rows={4}
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-200 placeholder-neutral-500 p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Working Diagnosis */}
                <div className="space-y-2">
                  <Label className="text-neutral-200 font-semibold text-base">Working Diagnosis (Main Diagnosis)</Label>
                  <p className="text-xs text-neutral-500">The most likely diagnosis based on current clinical picture</p>
                  <input
                    type="text"
                    value={assessmentData.workingDiagnosis}
                    onChange={e => setAssessmentData(prev => ({ ...prev, workingDiagnosis: e.target.value }))}
                    placeholder="e.g. Community-acquired pneumonia"
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-200 placeholder-neutral-500 p-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Differential Diagnoses */}
                <div className="space-y-2">
                  <Label className="text-neutral-200 font-semibold text-base">Differential Diagnoses</Label>
                  <p className="text-xs text-neutral-500">Other diagnoses being considered — list them in order of likelihood</p>
                  <textarea
                    value={assessmentData.differentialDiagnosis}
                    onChange={e => setAssessmentData(prev => ({ ...prev, differentialDiagnosis: e.target.value }))}
                    placeholder="1. Pulmonary tuberculosis&#10;2. Pleural effusion&#10;3. Bronchitis&#10;4. Lung malignancy"
                    rows={5}
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-200 placeholder-neutral-500 p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Progress Notes */}
                <div className="space-y-2">
                  <Label className="text-neutral-200 font-semibold text-base">Progress Notes & Plan</Label>
                  <p className="text-xs text-neutral-500">Ongoing clinical observations, management plan, follow-up instructions</p>
                  <textarea
                    value={assessmentData.progressNotes}
                    onChange={e => setAssessmentData(prev => ({ ...prev, progressNotes: e.target.value }))}
                    placeholder="Plan:&#10;1. Start empirical antibiotics (Amoxicillin 500mg TID × 7 days)&#10;2. Order CXR and CBC&#10;3. Monitor temperature and oxygen saturation&#10;4. Review results in 48hrs&#10;5. Counsel patient on infection control..."
                    rows={6}
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-200 placeholder-neutral-500 p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveAssessment}
                    disabled={savingAssessment}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 h-11"
                  >
                    {savingAssessment ? (
                      <><Clock className="w-4 h-4 mr-2 animate-spin" /> Saving Assessment...</>
                    ) : assessmentSaved ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2 text-green-300" /> Assessment Saved!</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Save Assessment</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing Results Summary */}
            {(patient.investigations?.length > 0 || patient.prescriptions?.length > 0) && (
              <div className="bg-[#171717] border border-neutral-700/50 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-indigo-400" /> Current Investigation Results
                </h2>
                <div className="space-y-3">
                  {patient.investigations?.map((inv: any) => (
                    <div key={inv.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/30">
                      <div>
                        <p className="text-sm font-semibold text-neutral-200">{inv.testName}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{inv.category}</p>
                        {inv.status === "COMPLETED" && (
                          <p className="text-xs text-green-400 mt-1 font-mono">{inv.result}</p>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${inv.status === "COMPLETED" ? "bg-green-900/40 text-green-400" : "bg-amber-900/40 text-amber-400"}`}>
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB 4: Lab / Imaging / Pathology Orders ══ */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {orderSuccess ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-green-400">Orders Submitted!</h2>
                <p className="text-neutral-400 mt-2">Investigation requests have been sent to the relevant departments.</p>
              </div>
            ) : (
              <>
                {/* Selected Orders Summary Bar */}
                {totalSelected > 0 && (
                  <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-blue-300">{totalSelected} test{totalSelected !== 1 ? "s" : ""} selected:</span>
                      {Object.entries(selectedOrders).flatMap(([cat, tests]) =>
                        tests.map(t => (
                          <span key={`${cat}-${t}`} className="text-xs bg-blue-800/50 text-blue-200 px-2 py-0.5 rounded-full border border-blue-700/50">
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                    <Button
                      onClick={handleSubmitOrders}
                      disabled={submittingOrders}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold shrink-0"
                    >
                      {submittingOrders ? "Submitting..." : `Submit ${totalSelected} Order${totalSelected !== 1 ? "s" : ""}`}
                    </Button>
                  </div>
                )}

                {/* Clinical Note */}
                <div className="bg-[#171717] border border-neutral-700/50 rounded-xl p-4">
                  <Label className="text-neutral-300 font-semibold text-sm mb-2 block">Clinical Indication / Reason for Tests</Label>
                  <textarea
                    value={orderNote}
                    onChange={e => setOrderNote(e.target.value)}
                    placeholder="Clinical justification for the ordered tests (e.g. 'Rule out pneumonia — CXR + CBC requested', 'Monitor diabetes — HbA1c + Fasting glucose')..."
                    rows={3}
                    className="w-full rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-200 placeholder-neutral-500 p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Investigation Categories Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Object.entries(INVESTIGATION_CATALOG).map(([category, tests]) => {
                    const Icon = CATEGORY_ICONS[category] || FlaskConical;
                    const colorClass = CATEGORY_COLORS[category] || "text-neutral-400 bg-neutral-800/30 border-neutral-700/30";
                    const selected = selectedOrders[category] || [];
                    return (
                      <div key={category} className={`rounded-xl border p-4 ${colorClass}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="w-4 h-4" />
                          <h3 className="font-bold text-sm uppercase tracking-wider">{category}</h3>
                          {selected.length > 0 && (
                            <span className="ml-auto text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                              {selected.length} selected
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {tests.map(test => (
                            <label key={test} className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group">
                              <input
                                type="checkbox"
                                checked={selected.includes(test)}
                                onChange={() => toggleOrder(category, test)}
                                className="mt-0.5 h-4 w-4 rounded border-neutral-500 bg-neutral-700 accent-blue-500 cursor-pointer shrink-0"
                              />
                              <span className="text-sm leading-snug select-none">{test}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit Footer */}
                {totalSelected > 0 && (
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSubmitOrders}
                      disabled={submittingOrders}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 h-12 text-base"
                    >
                      {submittingOrders
                        ? <><Clock className="w-5 h-5 mr-2 animate-spin" /> Submitting Orders...</>
                        : <><FlaskConical className="w-5 h-5 mr-2" /> Submit {totalSelected} Investigation Order{totalSelected !== 1 ? "s" : ""}</>
                      }
                    </Button>
                  </div>
                )}

                {/* Past Orders Reference */}
                {patient.investigations?.length > 0 && (
                  <div className="bg-[#171717] border border-neutral-700/50 rounded-2xl p-5">
                    <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-500" /> Previously Ordered Investigations
                    </h2>
                    <div className="space-y-2">
                      {patient.investigations.map((inv: any) => (
                        <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-neutral-800/40 border border-neutral-700/20 text-sm">
                          <div>
                            <span className="font-semibold text-neutral-200">{inv.testName}</span>
                            <span className="text-neutral-500 ml-2 text-xs">[{inv.category || "General"}]</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-neutral-600">{new Date(inv.createdAt).toLocaleDateString()}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${inv.status === "COMPLETED" ? "bg-green-900/40 text-green-400" : "bg-amber-900/40 text-amber-400"}`}>
                              {inv.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        </div>

        {/* ── AI Support Sidebar Panel ── */}
        {showAIPanel && (
          <aside className="w-full lg:w-96 shrink-0 bg-[#141414] border border-neutral-850 rounded-2xl p-5 flex flex-col gap-4 self-start lg:sticky lg:top-6 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                <span className="font-bold text-white tracking-tight">AI Clinical Support</span>
              </div>
              <button
                onClick={() => setShowAIPanel(false)}
                className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Privacy Shield Info */}
            <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
              patient.isRestricted 
                ? "bg-red-950/20 border-red-900/30 text-red-300"
                : "bg-blue-950/20 border-blue-900/30 text-blue-300"
            }`}>
              {patient.isRestricted ? (
                <>
                  <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Estonian Model: Restricted</span>
                    Cross-facility data sharing is restricted by patient request.
                  </div>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Estonian Model: Active</span>
                    Access is audited. Read-only clinical analysis enabled.
                  </div>
                </>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
              {/* Error State */}
              {aiError && (
                <div className="p-3 bg-red-900/20 border border-red-800/40 rounded-xl text-red-300 text-xs flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <div>
                    <p className="font-semibold">Request Aborted</p>
                    <p className="mt-1 leading-relaxed">{aiError}</p>
                  </div>
                </div>
              )}

              {/* Initial Idle State */}
              {!aiLoading && streamedBullets.length === 0 && !aiError && (
                <div className="flex flex-col items-center justify-center text-center py-10 px-4 gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-blue-400">
                    <Brain className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-200 text-sm">Clinical Assistant</h4>
                    <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                      Analyze legacy medication logs, pre-existing patient behaviors, and suggest diagnostic investigation panels.
                    </p>
                  </div>
                  {!patient.isRestricted && (
                    <Button
                      onClick={handleTriggerAI}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Sparkles className="w-4 h-4" /> Generate Insights
                    </Button>
                  )}
                </div>
              )}

              {/* Loading State */}
              {aiLoading && (
                <div className="flex flex-col gap-4 py-6 flex-1 justify-center">
                  <div className="flex items-center gap-3 justify-center text-neutral-400 text-sm">
                    <Clock className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Analyzing record history...</span>
                  </div>
                  <div className="space-y-2 px-4">
                    <div className="h-4 bg-neutral-800 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-neutral-800 rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-neutral-800 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              )}

              {/* Streaming / Loaded Insights */}
              {(streamedBullets.length > 0) && (
                <div className="space-y-4 text-xs">
                  {streamedBullets.map((bullet, idx) => {
                    let sectionTitle = "Insight";
                    let sectionClass = "border-neutral-850 bg-neutral-900/40 text-neutral-300";
                    let IconComp = Info;

                    if (bullet.includes("Cross-Hospital Alert") || bullet.includes("Medication")) {
                      sectionTitle = "Medication Safety & Cross-Facility Alert";
                      sectionClass = "border-amber-800/30 bg-amber-950/10 text-amber-200";
                      IconComp = AlertTriangle;
                    } else if (bullet.includes("Behavioral Analytics") || bullet.includes("behavior")) {
                      sectionTitle = "Behavioral & Lifestyle Risks";
                      sectionClass = "border-indigo-800/30 bg-indigo-950/10 text-indigo-200";
                      IconComp = Brain;
                    } else if (bullet.includes("Diagnostic Recommendations") || bullet.includes("recommends")) {
                      sectionTitle = "Suggested Diagnostic panel";
                      sectionClass = "border-blue-800/30 bg-blue-950/10 text-blue-200";
                      IconComp = FlaskConical;
                    }

                    return (
                      <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-2 transition-all duration-300 ${sectionClass}`}>
                        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] opacity-80">
                          <IconComp className="w-3.5 h-3.5" />
                          {sectionTitle}
                        </div>
                        <p className="leading-relaxed font-medium whitespace-pre-wrap">{bullet}</p>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {aiStreaming && (
                    <div className="flex items-center gap-1.5 pl-2 text-neutral-500 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="text-[10px] ml-1">AI compiling...</span>
                    </div>
                  )}

                  {/* Sync State Status Indicators */}
                  {!aiStreaming && (
                    <div className="pt-3 border-t border-neutral-800 space-y-1.5 text-[10px] text-neutral-500 font-medium">
                      <div className="flex justify-between items-center">
                        <span>Source Engine:</span>
                        <span className="text-blue-400 font-bold font-mono">CROSS_FACILITY_V2</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Sync status:</span>
                        <span className="text-green-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-ping" /> Real-time Synced
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Last sync:</span>
                        <span>{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-neutral-800 text-[9px] text-neutral-600 leading-relaxed font-semibold">
              ⚠️ This assistant panel operates in read-only mode. Access is audited under Estonian X-Road privacy regulation guidelines.
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
