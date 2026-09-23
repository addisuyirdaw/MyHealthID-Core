"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPrescription } from "@/lib/actions/pharmacy.actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pill, CheckCircle2, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { ethiopianMedicines, EthiopianMedicine } from "@/lib/data/ethiopianMedicines";

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) { matrix[0][i] = i; }
  for (let j = 0; j <= b.length; j += 1) { matrix[j][0] = j; }
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

function getSuggestions(input: string): EthiopianMedicine[] {
  if (!input || input.length < 2) return [];
  const lowerInput = input.toLowerCase();
  
  const scored = ethiopianMedicines.map(med => {
    const lowerName = med.name.toLowerCase();
    if (lowerName.includes(lowerInput)) return { med, score: 0 };
    
    const words = lowerName.split(/[\s-]+/);
    let bestDist = Infinity;
    
    for (const w of words) {
        const prefix = w.substring(0, lowerInput.length);
        const dist = levenshteinDistance(lowerInput, prefix);
        if (dist < bestDist) bestDist = dist;
    }
    return { med, score: bestDist };
  });

  const threshold = input.length <= 4 ? 1 : 2;
  const filtered = scored.filter(s => s.score <= threshold).sort((a, b) => a.score - b.score);
  return filtered.map(f => f.med).slice(0, 8);
}

export function PrescribeModal({ patientId, patientName, patientAllergies, patientHistory }: { patientId: string, patientName: string, patientAllergies?: string | null, patientHistory?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  
  const [medications, setMedications] = useState([{ drugName: "", dosage: "", route: "", frequency: "", duration: "", quantity: "", instructions: "" }]);
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
        validMeds.map(med => {
          // Safely bundle EMR fields into the notes to avoid breaking the DB schema
          const extendedNotes = `[Route: ${med.route || "N/A"}] [Qty: ${med.quantity || "N/A"}] Inst: ${med.instructions || "N/A"}\nGeneral Notes: ${notes}`;
          return createPrescription({
            patientId,
            drugName: med.drugName,
            dosage: med.dosage || "As directed",
            frequency: med.frequency || "N/A",
            duration: med.duration || "N/A",
            notes: extendedNotes,
          });
        })
      );
      router.refresh();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setOpen(false);
        setMedications([{ drugName: "", dosage: "", route: "", frequency: "", duration: "", quantity: "", instructions: "" }]);
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
      <DialogContent className="sm:max-w-[1000px] bg-slate-950 border border-slate-800 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2"><Pill className="w-5 h-5 text-indigo-400"/> Prescribe Medication</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a structured EMR prescription for <span className="font-semibold text-slate-200">{patientName}</span>. Select a standard Ethiopian STG medicine to auto-fill clinical defaults.
          </DialogDescription>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Prescription Sent to Pharmacy!</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner bg-slate-900/50">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Medicine (STG)</th>
                    <th className="px-4 py-3">Dose</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Freq</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Instructions</th>
                    <th className="px-4 py-3 w-10 text-center">Act</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {medications.map((med, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-2 relative">
                        <input
                          value={med.drugName}
                          onChange={(e) => {
                            const newMeds = [...medications];
                            const selectedName = e.target.value;
                            newMeds[idx].drugName = selectedName;
                            
                            // Auto-fill logic
                            const stgDrug = ethiopianMedicines.find(d => d.name.toLowerCase() === selectedName.toLowerCase());
                            if (stgDrug) {
                              newMeds[idx].dosage = stgDrug.defaultDose;
                              newMeds[idx].route = stgDrug.defaultRoute;
                              newMeds[idx].frequency = stgDrug.defaultFrequency;
                              newMeds[idx].duration = stgDrug.defaultDuration;
                              newMeds[idx].quantity = stgDrug.defaultQuantity;
                              newMeds[idx].instructions = stgDrug.instructions;
                            }
                            
                            setMedications(newMeds);
                          }}
                          onFocus={() => setFocusedIdx(idx)}
                          onBlur={() => setTimeout(() => setFocusedIdx(null), 200)}
                          placeholder="Drug name..."
                          autoComplete="off"
                          className="w-full min-w-[140px] rounded-lg bg-slate-800 border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
                        />
                        {focusedIdx === idx && med.drugName.length >= 2 && getSuggestions(med.drugName).length > 0 && (
                          <div className="absolute z-50 left-2 min-w-[200px] top-[calc(100%-8px)] mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                            {getSuggestions(med.drugName).map((suggestion, sIdx) => (
                              <div
                                key={sIdx}
                                className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 border-b border-slate-700/50 last:border-0"
                                onClick={() => {
                                  const newMeds = [...medications];
                                  newMeds[idx].drugName = suggestion.name;
                                  newMeds[idx].dosage = suggestion.defaultDose;
                                  newMeds[idx].route = suggestion.defaultRoute;
                                  newMeds[idx].frequency = suggestion.defaultFrequency;
                                  newMeds[idx].duration = suggestion.defaultDuration;
                                  newMeds[idx].quantity = suggestion.defaultQuantity;
                                  newMeds[idx].instructions = suggestion.instructions;
                                  setMedications(newMeds);
                                  setFocusedIdx(null);
                                }}
                              >
                                <div className="font-semibold text-white truncate">{suggestion.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{suggestion.defaultDose} | {suggestion.defaultRoute}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          value={med.dosage}
                          onChange={(e) => {
                            const newMeds = [...medications];
                            newMeds[idx].dosage = e.target.value;
                            setMedications(newMeds);
                          }}
                          placeholder="e.g. 500mg"
                          className="w-full min-w-[80px] rounded-lg bg-slate-800 border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={med.route}
                          onChange={(e) => {
                            const newMeds = [...medications];
                            newMeds[idx].route = e.target.value;
                            setMedications(newMeds);
                          }}
                          placeholder="e.g. PO"
                          className="w-full min-w-[60px] rounded-lg bg-slate-800 border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={med.frequency}
                          onChange={(e) => {
                            const newMeds = [...medications];
                            newMeds[idx].frequency = e.target.value;
                            setMedications(newMeds);
                          }}
                          placeholder="e.g. TID"
                          className="w-full min-w-[70px] rounded-lg bg-slate-800 border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={med.duration}
                          onChange={(e) => {
                            const newMeds = [...medications];
                            newMeds[idx].duration = e.target.value;
                            setMedications(newMeds);
                          }}
                          placeholder="e.g. 5 days"
                          className="w-full min-w-[80px] rounded-lg bg-slate-800 border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={med.quantity}
                          onChange={(e) => {
                            const newMeds = [...medications];
                            newMeds[idx].quantity = e.target.value;
                            setMedications(newMeds);
                          }}
                          placeholder="e.g. 15 tabs"
                          className="w-full min-w-[80px] rounded-lg bg-slate-800 border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={med.instructions}
                          onChange={(e) => {
                            const newMeds = [...medications];
                            newMeds[idx].instructions = e.target.value;
                            setMedications(newMeds);
                          }}
                          placeholder="e.g. Take with food"
                          className="w-full min-w-[140px] rounded-lg bg-slate-800 border-slate-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          disabled={medications.length === 1}
                          onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30 w-8 h-8 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-slate-900/80 border-t border-slate-800">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setMedications([...medications, { drugName: "", dosage: "", route: "", frequency: "", duration: "", quantity: "", instructions: "" }])}
                  className="w-full border-dashed border-slate-700 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/50 hover:bg-indigo-900/10 rounded-lg bg-transparent"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Another Medication row
                </Button>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block">General Pharmacy Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional instructions for the pharmacist (optional)"
                rows={2}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 resize-none"
              />
            </div>

            {(hasAllergyWarning || activeHistoryWarning) && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-4 mt-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex gap-3">
                  <AlertTriangle className="text-red-400 w-5 h-5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold text-red-300">CLINICAL SAFETY WARNING</p>
                    
                    {hasAllergyWarning && (
                      <p className="text-red-200 mt-1">
                        System detected a possible match with patient allergies! 
                        Recorded allergies: <span className="font-semibold">{patientAllergies}</span>.
                      </p>
                    )}

                    {activeHistoryWarning && (
                      <p className="text-red-200 mt-1">
                        CONTRAINDICATION ALERT: Drug '{activeHistoryWarning.toUpperCase()}' is antagonistic to patient's recorded medical history: <span className="underline">{patientHistory}</span>
                      </p>
                    )}

                    <label className="flex items-center gap-2 mt-4 cursor-pointer p-2 bg-red-900/30 rounded-lg border border-red-900/30 hover:bg-red-900/50 transition-colors w-max">
                      <input 
                        type="checkbox" 
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="rounded border-red-500 text-red-500 focus:ring-red-500 bg-red-950"
                      />
                      <span className="text-red-300 font-semibold text-xs uppercase tracking-wider select-none">
                        I acknowledge this high-risk prescription & authorize.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
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
