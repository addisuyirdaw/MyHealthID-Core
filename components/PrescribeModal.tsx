"use client";

import { useState } from "react";
import { createPrescription } from "@/lib/actions/pharmacy.actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pill, CheckCircle2, AlertTriangle } from "lucide-react";

export function PrescribeModal({ patientId, patientName, patientAllergies }: { patientId: string, patientName: string, patientAllergies?: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [prescriptionText, setPrescriptionText] = useState("");
  const [notes, setNotes] = useState("");

  const [acknowledged, setAcknowledged] = useState(false);

  // Safety Engine Logic: checks words from the unified prescription text against the patient's allergy list
  const hasAllergyWarning = Boolean(
    prescriptionText.trim().length > 2 &&
    patientAllergies &&
    prescriptionText.toLowerCase().split(/\s+/).some(word => word.length > 3 && patientAllergies.toLowerCase().includes(word))
  );

  const handlePrescribe = async () => {
    if (!prescriptionText.trim()) {
      alert("Please provide medicine names and dosages.");
      return;
    }
    if (hasAllergyWarning && !acknowledged) {
      alert("You must acknowledge the allergy warning.");
      return;
    }
    
    setLoading(true);
    
    try {
      await createPrescription({
        patientId,
        drugName: prescriptionText, // Push all text here so pharmacists can see it
        dosage: "As directed",      // Default placeholder
        frequency: "N/A",           // Default placeholder
        duration: "N/A",            // Default placeholder
        notes,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setOpen(false);
        setPrescriptionText("");
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
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="prescriptionText" className="text-sm font-medium leading-none">Medicine Names & Dosage <span className="text-red-500">*</span></label>
              <textarea
                id="prescriptionText"
                placeholder="e.g. Amoxicillin 500mg, Paracetamol 1000mg..."
                value={prescriptionText}
                onChange={(e) => setPrescriptionText(e.target.value)}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[120px]"
              />
            </div>

            {hasAllergyWarning && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md mt-1 mb-1 shadow-sm animate-in fade-in zoom-in duration-300">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">ALLERGY WARNING</p>
                    <p className="text-xs text-red-700 mt-1">
                      System detected a possible match with patient allergies! 
                      Recorded allergies: <span className="font-semibold">{patientAllergies}</span>.
                    </p>
                    <label className="flex items-center space-x-2 mt-3 cursor-pointer p-1 bg-white/50 rounded inline-flex">
                      <input 
                        type="checkbox" 
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-red-800 select-none">
                        I acknowledge this risk & authorize.
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
                disabled={!prescriptionText.trim() || loading || (hasAllergyWarning && !acknowledged)} 
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
