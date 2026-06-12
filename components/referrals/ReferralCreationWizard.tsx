"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { REFERRAL_TRANSLATIONS } from "@/lib/constants/referralLang";
import { getHospitals } from "@/lib/actions/hospital.actions";
import { 
  Building, Stethoscope, AlertTriangle, Printer, Download, CheckCircle2, Loader2, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferralCreationWizardProps {
  activePatient: any;
  onClose: () => void;
  onSuccess?: (referralId: string) => void;
}

interface MappedHospital {
  clientKey: string;
  name: string;
  region?: string;
  zone?: string;
  woreda?: string;
  kebele?: string;
  isActive: boolean;
  isVerified: boolean;
}

const DEPARTMENTS = [
  "Obstetrics Emergency Unit",
  "Gynecology",
  "General Medicine",
  "Pediatrics",
  "Triage / Emergency",
  "Internal Medicine",
  "Surgical Services",
  "Cardiology",
  "Neurology"
];

const PRIORITIES = [
  { value: "ROUTINE", label: "Routine Referral (Blue)", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { value: "URGENT", label: "Urgent Referral (Orange)", color: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
  { value: "EMERGENCY", label: "Emergency Referral (Red)", color: "text-red-400 bg-red-500/10 border-red-500/30" },
  { value: "FOLLOW_UP", label: "Follow-up Referral (Green)", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" }
];

export function ReferralCreationWizard({ activePatient, onClose, onSuccess }: ReferralCreationWizardProps) {
  const { language } = useLanguage();
  const t = (key: keyof typeof REFERRAL_TRANSLATIONS.en) => {
    const dict = REFERRAL_TRANSLATIONS[language] || REFERRAL_TRANSLATIONS.en;
    return dict[key] || REFERRAL_TRANSLATIONS.en[key];
  };

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-populated Patient demographic & vitals states
  const [fullName] = useState(activePatient.fullName || "");
  const [age] = useState(activePatient.age || "");
  const [sex] = useState(activePatient.sex || "");
  const [phone] = useState(activePatient.phoneNumber || "Not recorded");

  // Vitals summary
  const latestVitals = activePatient.vitals?.[0];
  const [vitals] = useState(
    latestVitals
      ? `BP: ${latestVitals.bp || "N/A"} mmHg | Pulse: ${latestVitals.pulse || "N/A"} bpm | Temp: ${latestVitals.temp || "N/A"} °C | RR: ${latestVitals.rr || "N/A"} /min | SpO2: ${latestVitals.spO2 || "N/A"}%`
      : "No vitals recorded"
  );

  // Diagnoses
  const [workingDiagnosis] = useState(
    activePatient.clinicalExam?.workingDiagnosis || activePatient.suspectedDisease || ""
  );

  // Form input states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientKey, setSelectedClientKey] = useState("");
  const [receivingDepartment, setReceivingDepartment] = useState("");
  const [priorityLevel, setPriorityLevel] = useState("ROUTINE");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [reasonForReferral, setReasonForReferral] = useState("");
  const [detailedReferralNotes, setDetailedReferralNotes] = useState("");

  // Hospitals mapped to prevent leakage of internal MH- IDs
  const [mappedHospitals, setMappedHospitals] = useState<MappedHospital[]>([]);
  const hospitalLookup = useRef<Record<string, { id: string; isActive: boolean }>>({});

  // Warning & submission override states
  const [aiAlertOpen, setAiAlertOpen] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  // Load registered facilities
  useEffect(() => {
    async function loadHospitals() {
      const res = await getHospitals();
      if (res.success && res.hospitals) {
        const lookup: Record<string, { id: string; isActive: boolean }> = {};
        const mapped = res.hospitals.map((h: any, idx: number) => {
          const clientKey = `client_hosp_${idx}`;
          lookup[clientKey] = {
            id: h.id, // contains MH- internal ID
            isActive: h.isActive !== false // defaults to true
          };
          return {
            clientKey,
            name: h.name,
            region: h.region,
            zone: h.zone,
            woreda: h.woreda,
            kebele: h.kebele,
            isActive: h.isActive !== false,
            isVerified: h.isVerified || false
          };
        });
        setMappedHospitals(mapped);
        hospitalLookup.current = lookup;
      }
    }
    void loadHospitals();
  }, []);

  // Filter hospitals
  const filteredHospitals = mappedHospitals.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.region && h.region.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedHospital = mappedHospitals.find(h => h.clientKey === selectedClientKey);
  const selectedHospitalName = selectedHospital?.name || "";
  const isIntegrated = selectedHospital ? selectedHospital.isActive : true;

  // Print offline referral letter
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Referral Letter - ${fullName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>OFFLINE CLINICAL REFERRAL LETTER</h2>
            <p>Generated by MyHealthID Healthcare Network</p>
          </div>
          <div class="section grid">
            <div><span class="label">Patient Name:</span> ${fullName}</div>
            <div><span class="label">Age / Sex:</span> ${age} / ${sex}</div>
            <div><span class="label">Phone:</span> ${phone}</div>
            <div><span class="label">Priority:</span> ${priorityLevel}</div>
          </div>
          <div class="section">
            <span class="label">Destination Facility:</span> ${selectedHospitalName}
          </div>
          <div class="section">
            <span class="label">Destination Department:</span> ${receivingDepartment}
          </div>
          <div class="section">
            <span class="label">Vital Signs:</span><br/> ${vitals}
          </div>
          <div class="section">
            <span class="label">Working Diagnosis / Clinical Exam:</span><br/> ${workingDiagnosis}
          </div>
          <div class="section">
            <span class="label">Chief Complaint:</span><br/> ${chiefComplaint || "N/A"}
          </div>
          <div class="section">
            <span class="label">Reason for Referral:</span><br/> ${reasonForReferral || "N/A"}
          </div>
          <div class="section">
            <span class="label">Detailed Referral Notes:</span><br/> ${detailedReferralNotes || "N/A"}
          </div>
          <div class="section" style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px;">
            <p>Clinician Signature: _______________________________</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Export PDF / QR document mock
  const handleExportPDF = () => {
    alert("Exporting QR-Signed Offline Referral PDF Document... Saved to downloads.");
  };

  // Submission handler
  const executeSubmission = async (overrideValue: boolean) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const realHospitalId = hospitalLookup.current[selectedClientKey]?.id;
      if (!realHospitalId) {
        throw new Error("Invalid receiving hospital selection.");
      }

      // Combine structured notes into reason field
      const formattedReason = JSON.stringify({
        priority: priorityLevel,
        department: receivingDepartment,
        chiefComplaint,
        reasonForReferral,
        detailedReferralNotes,
        workingDiagnosis
      });

      const response = await fetch("/api/referrals/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: activePatient.id,
          reason: formattedReason,
          destinationFacility: selectedHospitalName,
          aiOverrideLogged: overrideValue,
          receivingFacilityId: realHospitalId,
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to submit referral.");
      }

      if (onSuccess) {
        onSuccess(data.referral.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientKey) {
      setErrorMsg("Please select a target hospital.");
      return;
    }
    if (!receivingDepartment) {
      setErrorMsg("Please select a receiving department.");
      return;
    }

    // AI validation wrapper pregnancy interceptor rules
    const containsHighRiskPregnancy = /pregnancy|obstetric|eclampsia|placenta/i.test(workingDiagnosis);
    const targetIsMaternalWard = ["OBSTETRICS", "GYNECOLOGY", "ANC", "OBSTETRICS EMERGENCY UNIT"].includes(receivingDepartment.toUpperCase());

    if (containsHighRiskPregnancy && !targetIsMaternalWard && !isBypassed) {
      setAiAlertOpen(true);
      return;
    }

    await executeSubmission(isBypassed);
  };

  return (
    <div className="bg-neutral-900 text-neutral-100 flex flex-col h-full max-h-[85vh]">
      {/* Scrollable Form Container */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 select-none">
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 bg-red-950/40 text-red-200 border border-red-900 rounded-xl flex gap-3 items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* AI Pregnancy Alert Warning Banner */}
        {aiAlertOpen && (
          <div className="p-4 bg-amber-950/40 text-amber-200 border border-amber-500/30 rounded-xl space-y-3 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-250 uppercase tracking-wide">AI Decision Support Warning</p>
                <p className="leading-relaxed">{t("aiAlertPregnancy")}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAiAlertOpen(false)}
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-[11px] h-8"
              >
                Change Department
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={async () => {
                  setAiAlertOpen(false);
                  setIsBypassed(true);
                  console.log("aiOverrideLogged = true");
                  await executeSubmission(true);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] h-8 font-bold"
              >
                Override &amp; Proceed
              </Button>
            </div>
          </div>
        )}

        {/* Wizard Step 1: Patient Details & Search */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Auto-populated Patient demographic box */}
            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-900 pb-2">
                Active Patient Reference (Auto-populated)
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-neutral-500">Name:</span>{" "}
                  <span className="text-neutral-200 font-bold">{fullName}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Age / Sex:</span>{" "}
                  <span className="text-neutral-200 font-bold">{age} / {sex}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500">Phone:</span>{" "}
                  <span className="text-neutral-200 font-bold">{phone}</span>
                </div>
                <div className="col-span-2 border-t border-neutral-900 pt-2">
                  <span className="text-neutral-500 block mb-1">Recent Clinical Vitals:</span>
                  <span className="text-neutral-300 bg-neutral-900 px-2.5 py-1.5 rounded-lg block font-semibold leading-relaxed">
                    {vitals}
                  </span>
                </div>
                <div className="col-span-2 mt-1">
                  <span className="text-neutral-500 block mb-1">Working Diagnosis:</span>
                  <span className="text-neutral-300 bg-neutral-900 px-2.5 py-1.5 rounded-lg block font-semibold italic">
                    {workingDiagnosis || "No working diagnosis on record"}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Hospital Search & Select */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-neutral-500" /> Destination Hospital Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type hospital name or location to filter..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-600 rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none transition-colors"
              />

              {/* Hospital Search Results (Excludes internal MH- code from UI rendering data list) */}
              <div className="max-h-[160px] overflow-y-auto border border-neutral-800 rounded-xl bg-neutral-950 divide-y divide-neutral-900">
                {filteredHospitals.length === 0 ? (
                  <p className="p-4 text-xs text-neutral-500 text-center">No facilities found.</p>
                ) : (
                  filteredHospitals.map(h => (
                    <button
                      key={h.clientKey}
                      type="button"
                      onClick={() => {
                        setSelectedClientKey(h.clientKey);
                        setStep(2);
                      }}
                      className={`w-full p-3 text-left text-xs hover:bg-neutral-900 transition-colors flex justify-between items-center ${
                        selectedClientKey === h.clientKey ? "bg-neutral-900 text-white border-l-2 border-orange-500" : "text-neutral-400"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-neutral-200">{h.name}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          {h.region || "Ethiopia"} • {h.zone || "Generic Zone"}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        h.isActive ? "bg-emerald-950/40 text-emerald-450 border border-emerald-900/40" : "bg-neutral-800 text-neutral-500 border border-neutral-700/20"
                      }`}>
                        {h.isActive ? "Integrated" : "Offline"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wizard Step 2: Clinical Details */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2.5">
              <div className="text-xs">
                <span className="text-neutral-500">Facility:</span>{" "}
                <span className="text-neutral-200 font-bold">{selectedHospitalName}</span>
                {!isIntegrated && (
                  <span className="ml-2 text-amber-400 font-bold block sm:inline">
                    ⚠️ {t("nonIntegratedWarning")}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
              >
                Back
              </button>
            </div>

            {/* Department & Priority Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-450 flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5" /> Destination Department
                  <span className="text-red-400">*</span>
                </label>
                <select
                  value={receivingDepartment}
                  onChange={e => setReceivingDepartment(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none appearance-none cursor-pointer"
                >
                  <option value="">— Select Target Department —</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-450">
                  Priority Level
                </label>
                <select
                  value={priorityLevel}
                  onChange={e => setPriorityLevel(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-200 outline-none appearance-none cursor-pointer"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rich Text Areas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-450">
                Chief Complaint
              </label>
              <textarea
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                placeholder="Enter patient's primary chief complaint..."
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-700 rounded-xl p-3 text-xs text-neutral-200 outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-450">
                Reason for Referral
              </label>
              <textarea
                value={reasonForReferral}
                onChange={e => setReasonForReferral(e.target.value)}
                placeholder="Summarize critical clinical indications or justification for transfer..."
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-700 rounded-xl p-3 text-xs text-neutral-200 outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-450">
                Detailed Referral Notes
              </label>
              <textarea
                value={detailedReferralNotes}
                onChange={e => setDetailedReferralNotes(e.target.value)}
                placeholder="Enter comprehensive medical notes, active investigations context, or instructions..."
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-700 rounded-xl p-3 text-xs text-neutral-200 outline-none resize-none"
              />
            </div>
          </div>
        )}

      </form>

      {/* Footer / Submit Buttons Block */}
      <div className="border-t border-neutral-800 px-6 py-4 bg-neutral-950/60 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="text-xs text-neutral-400 hover:text-neutral-200"
        >
          Cancel
        </Button>

        {step === 2 && (
          <div className="flex gap-2">
            {/* If target facility is integrated, show Standard DRN Submit */}
            {isIntegrated ? (
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 text-xs h-9 rounded-xl flex items-center gap-1.5 shadow-lg disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Dispatch DRN Referral
                  </>
                )}
              </Button>
            ) : (
              /* If offline / non-integrated, replace standard button with fallback row */
              <div className="flex gap-2 animate-in fade-in duration-300">
                <Button
                  type="button"
                  onClick={handlePrint}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-4 text-xs h-9 rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Referral Letter
                </Button>
                <Button
                  type="button"
                  onClick={handleExportPDF}
                  className="bg-orange-650 hover:bg-orange-600 text-white font-bold px-4 text-xs h-9 rounded-xl flex items-center gap-1.5 shadow-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export QR-Signed Offline Document
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
