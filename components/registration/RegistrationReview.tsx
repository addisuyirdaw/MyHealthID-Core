"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { RegistrationFormData } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

interface RegistrationReviewProps {
  data: Partial<RegistrationFormData>;
  duplicateWarning: string | null;
  onSubmit: (data: Partial<RegistrationFormData>) => Promise<void>;
  onBack: () => void;
}

export function RegistrationReview({ data, duplicateWarning, onSubmit, onBack }: RegistrationReviewProps) {
  const { t } = useLanguage();
  
  const [setupPassword, setSetupPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (setupPassword) {
      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setPasswordError("Passwords do not match.");
        return;
      }
    }

    setPasswordError("");
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...data,
        password: setupPassword ? password : "",
        // Hardcode defaults for the remaining fields not collected in the minimal UI
        ward: "OPD_OUTPATIENT",
        chiefComplaint: "Routine Triage Assessment",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Final Step</h2>
          <p className="text-sm text-slate-500">Review & Submit</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {duplicateWarning && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <div className="mt-0.5">⚠️</div>
            <div>
              <p className="font-semibold text-sm">{t.registrationV2.duplicateWarning}</p>
              <Button variant="link" className="text-rose-700 p-0 h-auto font-bold mt-1">
                {t.registrationV2.duplicateGoSignIn}
              </Button>
            </div>
          </div>
        )}

        {/* Minimal Summary Card */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="text-sm text-slate-500 mb-1">{t.registrationV2.fullNameLabel}</p>
            <p className="font-bold text-slate-900 text-lg">{data.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">{t.registrationV2.sexLabel}</p>
            <p className="font-medium text-slate-900">{data.sex}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">{t.registrationV2.ageLabel}</p>
            <p className="font-medium text-slate-900">{data.age} yrs</p>
          </div>
          {data.faydaId && (
            <div className="col-span-2 pt-2 border-t border-slate-200 mt-1">
              <p className="text-sm text-slate-500 mb-1">{t.registrationV2.finLabel}</p>
              <p className="font-mono text-sm bg-slate-200/50 inline-block px-2 py-0.5 rounded text-slate-700">{data.faydaId}</p>
            </div>
          )}
        </div>

        {/* Optional Portal Access (Password Deferral) */}
        <div className={`rounded-2xl border-2 transition-all ${setupPassword ? "border-blue-500 bg-blue-50/30" : "border-slate-200 bg-white"} overflow-hidden`}>
          <div 
            className="p-5 flex items-center justify-between cursor-pointer"
            onClick={() => setSetupPassword(!setupPassword)}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${setupPassword ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{t.registrationV2.portalAccessTitle}</h3>
                <p className="text-sm text-slate-500">{t.registrationV2.portalAccessDesc}</p>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={setupPassword} 
              onChange={(e) => setSetupPassword(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {setupPassword && (
            <div className="p-5 pt-0 border-t border-blue-100/50 mt-2 space-y-4">
              {passwordError && <p className="text-sm text-rose-600 font-medium">{passwordError}</p>}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.passwordLabel}</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-white pr-10"
                      placeholder={t.registrationV2.passwordPlaceholder}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.confirmPasswordLabel}</Label>
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 bg-white"
                    placeholder={t.registrationV2.confirmPasswordPlaceholder}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1 h-14" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !!duplicateWarning}
            className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-5 h-5 mr-2" />
            )}
            {isSubmitting ? t.registrationV2.registering : t.registrationV2.completeRegistration}
          </Button>
        </div>
      </div>
    </div>
  );
}
