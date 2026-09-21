"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { RegisteredPatient, UserContext } from "./types";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { QueueHandoff } from "./QueueHandoff";
import { CheckCircle2, Copy, Calendar, Stethoscope, User, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface RegistrationSuccessProps {
  patient: RegisteredPatient;
  userContext: UserContext;
  onReset: () => void;
}

export function RegistrationSuccess({ patient, userContext, onReset }: RegistrationSuccessProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(patient.uniqueId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isStaff = userContext === "STAFF";

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-5 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-900">{t.registrationV2.successTitle}</h2>
      </div>

      <div className="p-6 space-y-6 flex flex-col items-center">
        {/* ID Display Card */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <QRCodeSVG value={patient.uniqueId} size={100} />
          </div>
          <div className="flex-1 text-center sm:text-left w-full">
            <p className="text-sm text-slate-500 font-semibold mb-1">{t.registrationV2.mhidLabel}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">{patient.uniqueId}</span>
              <button 
                onClick={copyId}
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                title="Copy ID"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto sm:mx-0">
              {t.registrationV2.mhidExplainer}
            </p>
          </div>
        </div>

        {/* Queue Status */}
        <QueueHandoff 
          patientId={patient.id} 
          priorityLevel={patient.priorityLevel || "ROUTINE"} 
          ward={patient.ward || "OPD_OUTPATIENT"} 
        />

        {/* Action Buttons */}
        <div className="w-full space-y-3 pt-2">
          {isStaff ? (
            <>
              {/* Primary action for staff is going back to Triage Dashboard */}
              <Button 
                onClick={() => router.push("/triage")}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl"
              >
                <Stethoscope className="w-5 h-5 mr-2" />
                {t.registrationV2.actionTriage}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => router.push(`/citizen/appointments?patientId=${patient.id}`)}
                  variant="outline" 
                  className="h-12 border-slate-300 rounded-xl"
                >
                  <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                  {t.registrationV2.actionBookAppointment}
                </Button>
                <Button 
                  onClick={onReset}
                  variant="outline" 
                  className="h-12 border-slate-300 rounded-xl bg-slate-50"
                >
                  <RefreshCcw className="w-4 h-4 mr-2 text-slate-500" />
                  {t.registrationV2.actionRegisterAnother}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Primary action for citizen is going to Portal */}
              <Button 
                onClick={() => router.push("/signin")}
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold rounded-xl"
              >
                <User className="w-5 h-5 mr-2" />
                {t.registrationV2.actionSetupPortal}
              </Button>
              <Button 
                onClick={() => router.push(`/citizen/appointments?patientId=${patient.id}`)}
                variant="outline" 
                className="w-full h-12 border-slate-300 rounded-xl"
              >
                <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                {t.registrationV2.actionBookAppointment}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
