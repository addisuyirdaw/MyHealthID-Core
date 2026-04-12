"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { saveClinicalExam } from "@/lib/actions/patient.actions";
import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";

export function ClinicalExamModal({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const examData = {
      generalAppearance: formData.get("generalAppearance") as string,
      heent: formData.get("heent") as string,
      lymphoglandular: formData.get("lymphoglandular") as string,
      respiratory: formData.get("respiratory") as string,
      cardiovascular: formData.get("cardiovascular") as string,
      abdomen: formData.get("abdomen") as string,
      genitourinary: formData.get("genitourinary") as string,
      musculoskeletal: formData.get("musculoskeletal") as string,
      integumentary: formData.get("integumentary") as string,
      neurological: formData.get("neurological") as string,
      clinicalNotes: formData.get("clinicalNotes") as string,
    };

    try {
      await saveClinicalExam(patientId, examData);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to save clinical examination.");
    } finally {
      setLoading(false);
    }
  }

  const systems = [
    { id: "generalAppearance", label: "General Appearance", placeholder: "Patient's general state..." },
    { id: "heent", label: "HEENT", placeholder: "Head, Eyes, Ears, Nose, Throat..." },
    { id: "lymphoglandular", label: "Lymphoglandular", placeholder: "Lymph nodes status..." },
    { id: "respiratory", label: "Respiratory", placeholder: "Lungs and breathing..." },
    { id: "cardiovascular", label: "Cardiovascular", placeholder: "Heart and circulatory..." },
    { id: "abdomen", label: "Abdomen", placeholder: "Soft, non-tender..." },
    { id: "genitourinary", label: "Genitourinary", placeholder: "Genitals, urinary tract..." },
    { id: "musculoskeletal", label: "Musculoskeletal", placeholder: "Muscles, bones, joints..." },
    { id: "integumentary", label: "Integumentary", placeholder: "Skin, hair, nails..." },
    { id: "neurological", label: "Neurological", placeholder: "Mental status, cranial nerves, reflexes..." },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex-1 sm:flex-none">
          <ClipboardList className="w-4 h-4 mr-2" />
          Clinical Exam
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2 text-indigo-900">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Clinical Examination
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Conducting physical exam for <strong className="text-slate-800">{patientName}</strong>. 
            Expand the specific system sections you are investigating.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6 mt-4">
          <Accordion type="multiple" className="w-full space-y-2">
            {systems.map((sys) => (
              <AccordionItem key={sys.id} value={sys.id} className="border border-slate-200 rounded-lg px-4 bg-slate-50 relative overflow-hidden">
                <AccordionTrigger className="hover:no-underline py-4 text-slate-700 font-semibold focus:outline-none">
                  {sys.label}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <Textarea
                    name={sys.id}
                    placeholder={sys.placeholder}
                    className="min-h-[100px] bg-white border-slate-200 focus:border-indigo-300"
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="pt-6 border-t border-slate-200 space-y-3">
            <Label htmlFor="clinicalNotes" className="text-lg font-semibold text-slate-800">Final Impressions (Amharic / English)</Label>
            <p className="text-xs text-slate-500">Provide final diagnostic impressions, differentials, and general notes.</p>
            <Textarea 
              id="clinicalNotes"
              name="clinicalNotes"
              required
              className="min-h-[150px] border-indigo-200 focus:border-indigo-400 text-base"
              placeholder="e.g. Patient presents with acute tonsillitis. Rule out systemic infection..."
            />
          </div>

          <div className="flex justify-end pt-4 sticky bottom-0 bg-white border-t border-slate-100 py-4 mt-auto z-10">
            <Button disabled={loading} type="submit" size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md">
              {loading ? "Saving Exam..." : "Save Examination & Complete"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
