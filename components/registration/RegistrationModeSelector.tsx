"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { IdentityMode } from "./types";
import { IdCard, User, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RegistrationModeSelectorProps {
  onSelectMode: (mode: IdentityMode) => void;
}

export function RegistrationModeSelector({ onSelectMode }: RegistrationModeSelectorProps) {
  const { t } = useLanguage();
  const allowFayda = String(process.env.NEXT_PUBLIC_ALLOW_FAYDA ?? "true").toLowerCase() !== "false";
  const allowNoId = String(process.env.NEXT_PUBLIC_ALLOW_NO_ID ?? "true").toLowerCase() !== "false";

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">{t.registrationV2.pageTitle}</h2>
        <p className="text-slate-500 text-lg">{t.registrationV2.pageSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Fayda Option */}
        <div className={`relative flex flex-col items-center p-8 rounded-2xl border-2 transition-all ${
          allowFayda 
            ? "border-slate-200 hover:border-blue-500 hover:shadow-lg cursor-pointer bg-white group" 
            : "border-slate-200 bg-slate-50 opacity-70"
        }`}
          onClick={() => allowFayda && onSelectMode("FAYDA")}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${
            allowFayda ? "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white" : "bg-slate-200 text-slate-400"
          }`}>
            <IdCard className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">{t.registrationV2.modeFayda}</h3>
          <p className="text-slate-500 text-center mb-6">{t.registrationV2.modeFaydaDesc}</p>
          
          {allowFayda ? (
            <div className="mt-auto flex items-center justify-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span>{t.registrationV2.faydaSandboxNote}</span>
            </div>
          ) : (
            <div className="mt-auto flex items-center justify-center gap-2 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <span>{t.registrationV2.faydaUnavailable}</span>
            </div>
          )}
        </div>

        {/* No ID Option */}
        {allowNoId && (
          <div 
            className="relative flex flex-col items-center p-8 rounded-2xl border-2 border-slate-200 bg-white transition-all hover:border-emerald-500 hover:shadow-lg cursor-pointer group"
            onClick={() => onSelectMode("NO_ID")}
          >
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">{t.registrationV2.modeNoId}</h3>
            <p className="text-slate-500 text-center">{t.registrationV2.modeNoIdDesc}</p>
          </div>
        )}
      </div>

      {/* Emergency Fast Path Option */}
      <div 
        className="relative flex items-center p-5 rounded-xl border-2 border-rose-100 bg-rose-50 transition-all hover:border-rose-400 hover:shadow-md cursor-pointer group"
        onClick={() => onSelectMode("EMERGENCY")}
      >
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mr-5 transition-colors group-hover:bg-rose-500 group-hover:text-white">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-rose-900 mb-1">{t.registrationV2.modeEmergency}</h3>
          <p className="text-rose-700/80 text-sm">{t.registrationV2.modeEmergencyDesc}</p>
        </div>
      </div>
    </div>
  );
}
