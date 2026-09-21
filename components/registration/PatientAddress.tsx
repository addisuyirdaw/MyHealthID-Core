"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { RegistrationFormData } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGIONS } from "@/lib/locales/enums";

interface PatientAddressProps {
  initialData?: Partial<RegistrationFormData>;
  onNext: (data: Partial<RegistrationFormData>) => void;
  onBack: () => void;
}

export function PatientAddress({ initialData, onNext, onBack }: PatientAddressProps) {
  const { t } = useLanguage();
  
  const [region, setRegion] = useState(initialData?.addressRegion || "");
  const [zone, setZone] = useState(initialData?.addressZone || "");
  const [woreda, setWoreda] = useState(initialData?.addressWoreda || "");
  const [kebele, setKebele] = useState(initialData?.addressKebele || "");
  
  // Has the user expanded the optional fields?
  const [showDetails, setShowDetails] = useState(!!(zone || woreda || kebele));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!region) return alert("Region is required.");
    
    onNext({
      addressRegion: region,
      addressZone: zone,
      addressWoreda: woreda,
      addressKebele: kebele,
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t.registrationV2.sectionAddress}</h2>
          <p className="text-sm text-slate-500">Step 2 of 3</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.regionLabel} *</Label>
          <Select value={region} onValueChange={setRegion} required>
            <SelectTrigger className="h-12 bg-slate-50/50 text-base">
              <SelectValue placeholder={t.registrationV2.regionPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REGIONS).map(([val, labels]: any) => (
                <SelectItem key={val} value={val}>
                  {labels.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!showDetails ? (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <MapPin className="w-4 h-4" />
            {t.registrationV2.addressOptional}
            <ChevronDown className="w-4 h-4" />
          </button>
        ) : (
          <div className="space-y-5 p-5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-slate-700 font-semibold text-sm uppercase tracking-wider">Detailed Address</Label>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center"
              >
                Hide <ChevronUp className="w-3 h-3 ml-1" />
              </button>
            </div>
            
            <div>
              <Label className="text-slate-700 font-medium mb-1.5 text-sm">{t.registrationV2.zoneLabel}</Label>
              <Input 
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="h-11 bg-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 text-sm">{t.registrationV2.woredaLabel}</Label>
                <Input 
                  value={woreda}
                  onChange={(e) => setWoreda(e.target.value)}
                  className="h-11 bg-white"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-medium mb-1.5 text-sm">{t.registrationV2.kebeleLabel}</Label>
                <Input 
                  value={kebele}
                  onChange={(e) => setKebele(e.target.value)}
                  className="h-11 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1 h-12" onClick={onBack}>
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
