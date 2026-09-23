"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPrescription } from "@/lib/actions/pharmacy.actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pill, CheckCircle2, AlertTriangle } from "lucide-react";

export function PrescribeModal({ patientId, patientName, patientAllergies, patientHistory }: { patientId: string, patientName: string, patientAllergies?: string | null, patientHistory?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [medications, setMedications] = useState([{ drugName: "", dosage: "", route: "", frequency: "", duration: "" }]);
  const [notes, setNotes] = useState("");

  const [acknowledged, setAcknowledged] = useState(false);

  const allDrugText = medications.map(m => m.drugName).join(" ");

  // Safety Engine Logic: checks words from the unified prescription text against the patient's allergy list
  const hasAllergyWarning = Boolean(
    allDrugText.trim().length > 2 &&
    patientAllergies &&
    allDrugText.toLowerCase().split(/\s+/).some(word => word.length > 3 && patientAllergies.toLowerCase().includes(word))
  );

  // Safety Guard (Drug/History Conflict)
  const antagonists: Record<string, string[]> = {
    "ibuprofen": ["ulcer", "peptic", "bleeding", "kidney"],
    "diclofenac": ["ulcer", "peptic", "heart", "kidney"],
    "nsaid": ["ulcer", "peptic", "kidney", "asthma"],
    "aspirin": ["ulcer", "bleeding", "asthma", "bleed"],
    "steroid": ["diabetes", "infection"],
    "metformin": ["kidney", "renal", "liver"],
  };

  const activeHistoryWarning = Object.keys(antagonists).find(drug => {
    if (allDrugText.toLowerCase().includes(drug)) {
      return antagonists[drug].some(condition => patientHistory?.toLowerCase().includes(condition));
    }
    return false;
  });

  const handlePrescribe = async () => {
    const validMeds = medications.filter(m => m.drugName.trim());
    if (validMeds.length === 0) {
      alert("Please provide at least one medicine name.");
      return;
    }
    if ((hasAllergyWarning || activeHistoryWarning) && !acknowledged) {
      alert("You must acknowledge the safety warnings before prescribing.");
      return;
    }
    
    setLoading(true);
    
    try {
      await Promise.all(
        validMeds.map(med => 
          createPrescription({
            patientId,
            drugName: med.drugName,
            dosage: med.dosage || "As directed",
            frequency: med.frequency || "N/A",
            duration: med.duration || "N/A",
            notes: notes + (med.route ? ` [Route: ${med.route}]` : ""),
          })
        )
      );
      router.refresh();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setOpen(false);
        setMedications([{ drugName: "", dosage: "", route: "", frequency: "", duration: "" }]);
        setNotes("");
        setAcknowledged(false);
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("Error prescribing medication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shadow-sm">
          <Pill className="w-4 h-4 mr-1"/> Prescribe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Prescribe Medication</DialogTitle>
          <DialogDescription>
            Create a new prescription for {patientName}.
          </DialogDescription>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Prescription Sent to Pharmacy!</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid gap-2">
              <label className="text-sm font-medium leading-none">Structured Medications <span className="text-red-500">*</span></label>
              
              {medications.map((med, idx) => (
                <div key={idx} className="bg-neutral-50 p-3 rounded-md border border-neutral-200 space-y-3 relative">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Medicine Name</label>
                      <input
                        value={med.drugName}
                        onChange={(e) => {
                          const newMeds = [...medications];
                          newMeds[idx].drugName = e.target.value;
                          setMedications(newMeds);
                        }}
                        placeholder="e.g. Amoxicillin"
                        className="w-full rounded border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Dosage</label>
                      <input
                        value={med.dosage}
                        onChange={(e) => {
                          const newMeds = [...medications];
                          newMeds[idx].dosage = e.target.value;
                          setMedications(newMeds);
                        }}
                        placeholder="e.g. 500mg"
                        className="w-full rounded border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Route</label>
                      <input
                        value={med.route}
                        onChange={(e) => {
                          const newMeds = [...medications];
                          newMeds[idx].route = e.target.value;
                          setMedications(newMeds);
                        }}
                        placeholder="e.g. PO"
                        className="w-full rounded border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Frequency</label>
                      <input
                        value={med.frequency}
                        onChange={(e) => {
                          const newMeds = [...medications];
                          newMeds[idx].frequency = e.target.value;
                          setMedications(newMeds);
                        }}
                        placeholder="e.g. TID"
                        className="w-full rounded border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Duration</label>
                      <input
                        value={med.duration}
                        onChange={(e) => {
                          const newMeds = [...medications];
                          newMeds[idx].duration = e.target.value;
                          setMedications(newMeds);
                        }}
                        placeholder="e.g. 7 days"
                        className="w-full rounded border-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  {medications.length > 1 && (
                    <button 
                      onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-200 text-xs shadow-sm border border-red-200 font-bold"
                      title="Remove Medication"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMedications([...medications, { drugName: "", dosage: "", route: "", frequency: "", duration: "" }])}
                className="w-full border-dashed mt-1 bg-white hover:bg-slate-50"
              >
                + Add Medicine
              </Button>
            </div>

            {(hasAllergyWarning || activeHistoryWarning) && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md mt-1 mb-1 shadow-sm animate-in fade-in zoom-in duration-300">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">CRITICAL SAFETY WARNING</p>
                    
                    {hasAllergyWarning && (
                      <p className="text-xs text-red-700 mt-1">
                        System detected a possible match with patient allergies! 
                        Recorded allergies: <span className="font-semibold">{patientAllergies}</span>.
                      </p>
                    )}

                    {activeHistoryWarning && (
                      <p className="text-xs text-red-700 mt-1 font-bold">
                        CONTRAINDICATION ALERT: Drug '{activeHistoryWarning.toUpperCase()}' is antagonistic to patient's recorded medical history: <span className="underline">{patientHistory}</span>
                      </p>
                    )}

                    <label className="flex items-center space-x-2 mt-3 cursor-pointer p-1 bg-white/50 rounded inline-flex">
                      <input 
                        type="checkbox" 
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-red-800 select-none">
                        I acknowledge this high-risk prescription & authorize.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <label htmlFor="notes" className="text-sm font-medium leading-none">Clinical Instructions (Optional)</label>
              <textarea
                id="notes"
                placeholder="Optional context or detailed instructions for pharmacist..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[60px]"
              />
            </div>
          </div>
        )}
        
        {!isSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
                onClick={handlePrescribe} 
                disabled={medications.filter(m => m.drugName.trim()).length === 0 || loading || ((hasAllergyWarning || Boolean(activeHistoryWarning)) && !acknowledged)} 
                className="bg-primary hover:bg-primary/90 text-white"
            >
              {loading ? "Saving..." : "Send to Pharmacy"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
