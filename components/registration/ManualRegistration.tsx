"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { RegistrationFormData } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ChevronDown, ChevronUp, AlertCircle, MapPin, UserSquare2, Loader2, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGIONS } from "@/lib/locales/enums";
import Link from "next/link";

interface ManualRegistrationProps {
  initialData?: Partial<RegistrationFormData>;
  isFaydaVerified: boolean;
  duplicateWarning: string | null;
  isSubmitting: boolean;
  onSubmit: (data: Partial<RegistrationFormData>) => void;
  onCancel: () => void;
}

export function ManualRegistration({ initialData, isFaydaVerified, duplicateWarning, isSubmitting, onSubmit, onCancel }: ManualRegistrationProps) {
  const { t, language } = useLanguage();
  
  const [fullName, setFullName] = useState(initialData?.fullName || "");
  const [sex, setSex] = useState(initialData?.sex || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth || "");
  const [ageRaw, setAgeRaw] = useState(initialData?.age ? String(initialData.age) : "");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "");
  const [reasonForVisit, setReasonForVisit] = useState(initialData?.reasonForVisit || "");
  const [password, setPassword] = useState(initialData?.password || "");
  
  // Advanced fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [region, setRegion] = useState(initialData?.addressRegion || "");
  const [zone, setZone] = useState(initialData?.addressZone || "");
  const [woreda, setWoreda] = useState(initialData?.addressWoreda || "");
  const [kebele, setKebele] = useState(initialData?.addressKebele || "");
  const [ward, setWard] = useState(initialData?.ward || "OPD_OUTPATIENT");
  const [chiefComplaint, setChiefComplaint] = useState(initialData?.chiefComplaint || "");

  // Derived age logic
  const dobDate = dateOfBirth ? new Date(dateOfBirth) : null;
  const calculatedAge = dobDate 
    ? Math.max(0, new Date().getFullYear() - dobDate.getFullYear())
    : null;
    
  const displayAge = calculatedAge !== null ? calculatedAge : ageRaw;

  // Derived Severity Logic for Triage Warning
  const getSeverity = (reason: string) => {
    if (!reason.trim()) return null;
    const lower = reason.toLowerCase();
    
    const criticalWords = ['heart', 'stroke', 'chest', 'bleed', 'blood', 'unconscious', 'breath', 'severe', 'accident', 'trauma', 'fracture', 'coma', 'suicide', 'poison', 'gun', 'stab'];
    const urgentWords = ['fever', 'pain', 'infection', 'vomit', 'diarrhea', 'abdomen', 'abdominal', 'asthma', 'burn', 'cut', 'dizzy', 'migraine', 'nausea', 'injur', 'break'];
    
    if (criticalWords.some(w => lower.includes(w))) {
      return { level: 'CRITICAL', color: 'text-red-700 bg-red-100 border-red-300', text: 'Critical / Emergency', ring: 'focus-visible:ring-red-500', border: 'border-red-300 bg-red-50/50' };
    }
    if (urgentWords.some(w => lower.includes(w))) {
      return { level: 'URGENT', color: 'text-amber-700 bg-amber-100 border-amber-300', text: 'Urgent / Moderate', ring: 'focus-visible:ring-amber-500', border: 'border-amber-300 bg-amber-50/50' };
    }
    return { level: 'ROUTINE', color: 'text-emerald-700 bg-emerald-100 border-emerald-300', text: 'Routine / Minor', ring: 'focus-visible:ring-emerald-500', border: 'border-emerald-300 bg-emerald-50/50' };
  };

  const severity = getSeverity(reasonForVisit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) return alert("Full name is required.");
    if (!sex) return alert("Sex is required.");
    if (!dateOfBirth && !ageRaw) return alert("Date of Birth or Age is required.");
    if (!reasonForVisit.trim()) return alert("Reason for visit is required.");
    if (password.length < 4) return alert("Password must be at least 4 characters.");
    
    onSubmit({
      ...initialData,
      fullName: fullName.trim(),
      sex,
      dateOfBirth,
      age: calculatedAge !== null ? calculatedAge : parseInt(ageRaw, 10),
      phoneNumber: phoneNumber.trim(),
      reasonForVisit: reasonForVisit.trim(),
      password: password.trim(),
      addressRegion: region,
      addressZone: zone,
      addressWoreda: woreda,
      addressKebele: kebele,
      ward,
      chiefComplaint: chiefComplaint.trim()
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Patient Identity Registration</h2>
          <p className="text-sm text-slate-500">Create or Link MyHealthID</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500 hover:text-slate-700" disabled={isSubmitting}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Identity Purpose Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">About this Registration</p>
            <p>
              Register this patient to give them a portable <strong>MyHealthID</strong> that can be recognized at any participating healthcare facility. 
              {isFaydaVerified 
                ? " Their verified Fayda identity is being linked." 
                : " The system will generate a new identity if they do not have a national ID."}
            </p>
          </div>
        </div>

        {/* Duplicate Warning */}
        {duplicateWarning === "DUPLICATE" && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-5 flex gap-4 text-rose-900 shadow-sm">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-600 mt-1" />
            <div>
              <h3 className="font-bold text-base mb-1">Patient Already Exists</h3>
              <p className="text-sm mb-3">
                A patient with this {initialData?.faydaId ? "Fayda FIN" : "phone number"} was already found in the global registry (possibly from another facility). 
                To prevent duplicate medical records, you should use their existing identity.
              </p>
              <Button asChild variant="outline" className="border-rose-300 hover:bg-rose-100 bg-white text-rose-700">
                <Link href={`/doctor/dashboard?search=${encodeURIComponent(initialData?.faydaId || phoneNumber)}`}>
                  Search for this patient instead
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div>
          <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.fullNameLabel} *</Label>
          <Input 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isFaydaVerified || isSubmitting}
            placeholder={t.registrationV2.fullNamePlaceholder}
            className="h-12 text-base bg-slate-50/50"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.sexLabel} *</Label>
            <Select value={sex} onValueChange={setSex} disabled={isFaydaVerified || isSubmitting}>
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
              disabled={isFaydaVerified || isSubmitting}
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
              disabled={isSubmitting}
            />
          )}
        </div>

        {initialData?.faydaId && (
          <div>
            <Label className="text-slate-700 font-semibold mb-2">Fayda FIN</Label>
            <div className="h-12 px-3 flex items-center bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 font-mono tracking-wider font-semibold">
              {initialData.faydaId}
            </div>
          </div>
        )}

        <div>
          <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.phoneLabel}</Label>
          <Input 
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder={t.registrationV2.phonePlaceholder}
            className="h-12 text-base bg-slate-50/50"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label className="text-slate-700 font-semibold mb-2">Portal Access Password *</Label>
          <Input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 text-base bg-slate-50/50 text-lg"
            required
            disabled={isSubmitting}
          />
          <p className="text-xs text-slate-500 mt-1.5">Required for the patient to log into their medical records online.</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-slate-700 font-semibold">Reason for Visit *</Label>
            {severity && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${severity.color} uppercase tracking-wider transition-colors`}>
                {severity.text}
              </span>
            )}
          </div>
          <Input 
            value={reasonForVisit}
            onChange={(e) => setReasonForVisit(e.target.value)}
            placeholder="e.g. Routine checkup, fever, etc."
            className={`h-12 text-base transition-colors ${severity ? severity.border : 'bg-slate-50/50 border-slate-200'} ${severity ? severity.ring : ''}`}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Advanced / Optional Fields Accordion */}
        <div className="pt-2 border-t border-slate-200">
          {!showAdvanced ? (
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              disabled={isSubmitting}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <UserSquare2 className="w-4 h-4" />
              Show Advanced Information
              <ChevronDown className="w-4 h-4" />
            </button>
          ) : (
            <div className="space-y-5 p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-slate-700 font-semibold text-sm uppercase tracking-wider">Advanced Information</Label>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center"
                >
                  Hide <ChevronUp className="w-3 h-3 ml-1" />
                </button>
              </div>

              <div>
                <Label className="text-slate-700 font-medium mb-1.5 text-sm">{t.registrationV2.regionLabel}</Label>
                <Select value={region} onValueChange={setRegion} disabled={isSubmitting}>
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue placeholder={t.registrationV2.regionPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REGIONS).map(([val, labels]: any) => (
                      <SelectItem key={val} value={val}>{labels.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 text-sm">{t.registrationV2.zoneLabel}</Label>
                  <Input value={zone} onChange={(e) => setZone(e.target.value)} className="h-11 bg-white" disabled={isSubmitting} />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium mb-1.5 text-sm">{t.registrationV2.woredaLabel}</Label>
                  <Input value={woreda} onChange={(e) => setWoreda(e.target.value)} className="h-11 bg-white" disabled={isSubmitting} />
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium mb-1.5 text-sm">{t.registrationV2.kebeleLabel}</Label>
                <Input value={kebele} onChange={(e) => setKebele(e.target.value)} className="h-11 bg-white" disabled={isSubmitting} />
              </div>

              <div>
                <Label className="text-slate-700 font-medium mb-1.5 text-sm">Target Ward</Label>
                <Select value={ward} onValueChange={setWard} disabled={isSubmitting}>
                  <SelectTrigger className="h-11 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPD_OUTPATIENT">OPD (Outpatient)</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="MATERNITY_WARD">Maternity Ward</SelectItem>
                    <SelectItem value="PEDIATRIC_WARD">Pediatric Ward</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 text-sm">Chief Complaint (Medical details)</Label>
                <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} className="h-11 bg-white" disabled={isSubmitting} placeholder="Optional detailed complaint" />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 flex gap-3 border-t border-slate-200 mt-6 pt-6">
          <Button type="button" variant="outline" className="flex-1 h-14 font-semibold text-lg" onClick={onCancel} disabled={isSubmitting}>
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting || duplicateWarning === "DUPLICATE"} className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg">
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : null}
            {isSubmitting ? "Registering..." : "Register Patient"}
          </Button>
        </div>
      </form>
    </div>
  );
}
