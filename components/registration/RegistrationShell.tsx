"use client";

import { useState, useEffect } from "react";
import { IdentityMode, RegisteredPatient, RegistrationFormData, UserContext } from "./types";
import { RegistrationModeSelector } from "./RegistrationModeSelector";
import { FaydaRegistration } from "./FaydaRegistration";
import { ManualRegistration } from "./ManualRegistration";
import { EmergencyRegistration } from "./EmergencyRegistration";
import { PatientAddress } from "./PatientAddress";
import { RegistrationReview } from "./RegistrationReview";
import { RegistrationSuccess } from "./RegistrationSuccess";
import { registerPatient } from "@/lib/actions/patient.actions";
import { checkInToQueue } from "@/lib/actions/queue.actions";
import { checkDuplicate } from "./utils"; // we'll extract this simple helper
import { EscapeHatch } from "@/components/navigation/EscapeHatch";

// Helper to check duplicates against the API
const checkDuplicateApi = async (nationalId?: string, phone?: string) => {
  const cleanNid = nationalId?.replace(/\s/g, '');
  const cleanPhone = phone?.replace(/\s/g, '');
  if (!cleanNid && !cleanPhone) return false;
  try {
    const res = await fetch(`/api/patients/check-exists?nid=${cleanNid || ''}&phone=${cleanPhone || ''}`);
    const data = await res.json();
    return data.exists === true;
  } catch (err) {
    return false;
  }
};

export function RegistrationShell() {
  const [userContext, setUserContext] = useState<UserContext>("UNKNOWN");
  const [step, setStep] = useState<number>(0);
  const [mode, setMode] = useState<IdentityMode>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  
  // Collected data
  const [formData, setFormData] = useState<Partial<RegistrationFormData>>({});
  const [registeredPatient, setRegisteredPatient] = useState<RegisteredPatient | null>(null);

  // Determine user context on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.split("; ").find((r) => r.startsWith("userRole="));
      setUserContext(match ? "STAFF" : "CITIZEN");
    }
  }, []);

  const handleReset = () => {
    setStep(0);
    setMode(null);
    setFormData({});
    setRegisteredPatient(null);
    setDuplicateWarning(null);
  };

  const advanceStep = () => setStep(s => s + 1);
  const previousStep = () => setStep(s => s - 1);

  const handleFaydaVerified = (data: Partial<RegistrationFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    advanceStep(); // Go to address step
  };

  const handleManualNext = (data: Partial<RegistrationFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    advanceStep(); // Go to address step
  };

  const handleAddressNext = async (data: Partial<RegistrationFormData>) => {
    const merged = { ...formData, ...data };
    setFormData(merged);
    
    // Run duplicate check before showing review
    const isDup = await checkDuplicateApi(merged.faydaId, merged.phoneNumber);
    if (isDup) setDuplicateWarning("DUPLICATE");
    else setDuplicateWarning(null);
    
    advanceStep(); // Go to review step
  };

  const submitEmergency = async (data: Partial<RegistrationFormData>) => {
    const result = await registerPatient({
      fullName: data.fullName!,
      generateMyHealthId: true,
      age: data.age!,
      sex: data.sex!,
      chiefComplaint: data.chiefComplaint!,
      reasonForVisit: "Emergency intake",
      ward: data.ward as any,
      triageStatus: "WAITING_FOR_TRIAGE" as any,
      emergencyFlag: true,
      phoneNumber: data.phoneNumber || undefined,
    });
    
    if (!result || result.error || !result.id) {
      if (result?.error === "DUPLICATE_PATIENT_IDENTITY") {
         alert("A patient with this phone number already exists.");
      } else {
         alert(result?.error || "Registration failed.");
      }
      return;
    }

    try { await checkInToQueue(result.id); } catch {}

    setRegisteredPatient({
      id: result.id,
      name: result.name || data.fullName!,
      uniqueId: result.uniqueId,
      nationalId: result.nationalId,
      ward: data.ward,
      priorityLevel: "EMERGENCY",
      organizationId: result.organizationId,
    });
    setStep(4); // Success screen
  };

  const submitFullRegistration = async (finalData: Partial<RegistrationFormData>) => {
    const result = await registerPatient({
      fullName: finalData.fullName!,
      faydaId: mode === "FAYDA" ? finalData.faydaId : undefined,
      nationalId: (mode === "FAYDA" || mode === "MANUAL") ? finalData.faydaId : undefined,
      generateMyHealthId: mode === "NO_ID" || mode === "MANUAL",
      fcn: mode === "FAYDA" ? finalData.fcn : undefined,
      dateOfBirth: finalData.dateOfBirth ? new Date(`${finalData.dateOfBirth}T00:00:00.000Z`) : undefined,
      age: finalData.age!,
      sex: finalData.sex!,
      reasonForVisit: "Routine Triage Assessment",
      ward: finalData.ward as any,
      triageStatus: "WAITING_FOR_TRIAGE" as any,
      emergencyFlag: false,
      addressRegion: finalData.addressRegion,
      addressZone: finalData.addressZone,
      addressWoreda: finalData.addressWoreda,
      addressKebele: finalData.addressKebele,
      phoneNumber: finalData.phoneNumber || undefined,
      password: finalData.password || undefined,
      chiefComplaint: finalData.chiefComplaint!,
    });

    if (!result || result.error || !result.id) {
      if (result?.error === "DUPLICATE_PATIENT_IDENTITY") {
        setDuplicateWarning("DUPLICATE");
      } else {
        alert(result?.error || "Registration failed.");
      }
      return;
    }

    try { await checkInToQueue(result.id); } catch {}

    setRegisteredPatient({
      id: result.id,
      name: result.name || finalData.fullName!,
      uniqueId: result.uniqueId,
      nationalId: result.nationalId,
      ward: finalData.ward,
      priorityLevel: "ROUTINE",
      organizationId: result.organizationId,
    });
    setStep(4); // Success screen
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 pb-24 relative">
      
      {/* Honest Network Status Indicator */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-[10px] font-bold tracking-wide text-slate-500 uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Cloud Connected (Offline Engine Planned)
        </div>
      </div>

      {/* Dynamic escape hatch based on context */}
      {userContext === "STAFF" ? (
        <EscapeHatch href="/triage" label="Back to Triage" />
      ) : (
        <EscapeHatch href="/" label="Back to Home" />
      )}

      <div className="w-full">
        {step === 0 && (
          <RegistrationModeSelector onSelectMode={(m) => {
            setMode(m);
            setStep(1);
          }} />
        )}

        {step === 1 && mode === "FAYDA" && (
          <FaydaRegistration onVerified={handleFaydaVerified} onCancel={handleReset} />
        )}
        
        {step === 1 && (mode === "NO_ID" || mode === "MANUAL") && (
          <ManualRegistration 
            initialData={formData}
            isFaydaVerified={false} // mode is NO_ID or MANUAL here
            onNext={handleManualNext}
            onCancel={handleReset}
          />
        )}

        {step === 1 && mode === "EMERGENCY" && (
          <EmergencyRegistration onSubmit={submitEmergency} onCancel={handleReset} />
        )}

        {step === 2 && (mode === "FAYDA" || mode === "NO_ID" || mode === "MANUAL") && (
          <PatientAddress 
            initialData={formData}
            onNext={handleAddressNext}
            onBack={previousStep}
          />
        )}

        {step === 3 && (mode === "FAYDA" || mode === "NO_ID" || mode === "MANUAL") && (
          <RegistrationReview 
            data={formData}
            duplicateWarning={duplicateWarning}
            onSubmit={submitFullRegistration}
            onBack={previousStep}
          />
        )}

        {step === 4 && registeredPatient && (
          <RegistrationSuccess 
            patient={registeredPatient}
            userContext={userContext}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
