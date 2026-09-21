"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { RegistrationFormData } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ManualRegistrationProps {
  initialData?: Partial<RegistrationFormData>;
  isFaydaVerified: boolean;
  onNext: (data: Partial<RegistrationFormData>) => void;
  onCancel: () => void;
}

export function ManualRegistration({ initialData, isFaydaVerified, onNext, onCancel }: ManualRegistrationProps) {
  const { t, language } = useLanguage();
  
  const [fullName, setFullName] = useState(initialData?.fullName || "");
  const [sex, setSex] = useState(initialData?.sex || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || "");
  const [ageRaw, setAgeRaw] = useState(initialData?.age ? String(initialData.age) : "");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "");

  // Derived age logic
  const dobDate = dateOfBirth ? new Date(dateOfBirth) : null;
  const calculatedAge = dobDate 
    ? Math.max(0, new Date().getFullYear() - dobDate.getFullYear())
    : null;
    
  const displayAge = calculatedAge !== null ? calculatedAge : ageRaw;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) return alert("Full name is required.");
    if (!sex) return alert("Sex is required.");
    if (!dateOfBirth && !ageRaw) return alert("Date of Birth or Age is required.");
    
    onNext({
      fullName: fullName.trim(),
      sex,
      dateOfBirth,
      age: calculatedAge !== null ? calculatedAge : parseInt(ageRaw, 10),
      phoneNumber: phoneNumber.trim(),
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t.registrationV2.sectionBasicInfo}</h2>
          <p className="text-sm text-slate-500">Step 1 of 3</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500 hover:text-slate-700">
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.fullNameLabel} *</Label>
          <Input 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isFaydaVerified}
            placeholder={t.registrationV2.fullNamePlaceholder}
            className="h-12 text-base bg-slate-50/50"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.sexLabel} *</Label>
            <Select 
              value={sex} 
              onValueChange={setSex} 
              disabled={isFaydaVerified}
            >
              <SelectTrigger className="h-12 bg-slate-50/50 text-base">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">{t.registrationV2.sexMale}</SelectItem>
                <SelectItem value="Female">{t.registrationV2.sexFemale}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.dobLabel}</Label>
            <Input 
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={isFaydaVerified}
              className="h-12 text-base bg-slate-50/50"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div>
          <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.ageLabel} {dateOfBirth ? "" : "*"}</Label>
          {dateOfBirth ? (
            <div className="h-12 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-md text-slate-500">
              {calculatedAge} {language === "EN" ? "years old" : "ዓመት"} — <span className="ml-1 text-xs">{t.registrationV2.ageFromDob}</span>
            </div>
          ) : (
            <Input 
              type="number"
              min="0"
              max="130"
              value={ageRaw}
              onChange={(e) => setAgeRaw(e.target.value)}
              placeholder={t.registrationV2.agePlaceholder}
              className="h-12 text-base bg-slate-50/50"
              required={!dateOfBirth}
            />
          )}
        </div>

        <div className="pt-2 border-t border-slate-100">
          <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.phoneLabel}</Label>
          <Input 
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder={t.registrationV2.phonePlaceholder}
            className="h-12 text-base bg-slate-50/50"
          />
        </div>

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1 h-12" onClick={onCancel}>
            Back
          </Button>
          <Button type="submit" className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white">
            Next <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
