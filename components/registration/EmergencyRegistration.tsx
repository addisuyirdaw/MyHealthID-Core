"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { RegistrationFormData } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface EmergencyRegistrationProps {
  onSubmit: (data: Partial<RegistrationFormData>) => Promise<void>;
  onCancel: () => void;
}

export function EmergencyRegistration({ onSubmit, onCancel }: EmergencyRegistrationProps) {
  const { t } = useLanguage();
  
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      alert("Name must be at least 2 characters.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        // Hardcoded defaults for emergency path
        sex: "Not Specified",
        age: 25,
        ward: "EMERGENCY",
        chiefComplaint: "Emergency — expedited desk registration",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border-2 border-rose-200 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-rose-50 border-b border-rose-100 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-rose-900">{t.registrationV2.emergencyTitle}</h2>
            <p className="text-sm text-rose-700/80">{t.registrationV2.emergencyDesc}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <Label className="text-slate-700 font-semibold mb-2 text-lg">{t.registrationV2.emergencyNameLabel} *</Label>
          <Input 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t.registrationV2.emergencyNamePlaceholder}
            className="h-14 text-lg border-rose-200 focus-visible:ring-rose-500 bg-rose-50/30"
            required
            autoFocus
          />
        </div>

        <div>
          <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.emergencyPhoneLabel}</Label>
          <Input 
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder={t.registrationV2.emergencyPhonePlaceholder}
            className="h-12 text-base bg-slate-50/50"
          />
        </div>

        <div className="pt-6 flex gap-3">
          <Button type="button" variant="outline" className="flex-1 h-14" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="flex-[2] h-14 bg-rose-600 hover:bg-rose-700 text-white text-lg font-bold" 
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <AlertTriangle className="w-5 h-5 mr-2" />}
            {isSubmitting ? t.registrationV2.emergencyRegistering : t.registrationV2.emergencySubmit}
          </Button>
        </div>
      </form>
    </div>
  );
}
