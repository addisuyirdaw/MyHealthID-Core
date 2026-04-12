"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { processTriage } from "@/lib/actions/patient.actions";
import { Stethoscope, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function ClinicalJudgmentModal({ patient }: { patient: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const department = formData.get("department") as any;
    const priority = formData.get("priority") as any;
    const serviceType = formData.get("serviceType") as string;

    try {
      await processTriage(patient.id, department, priority, serviceType);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to process triage.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full sm:w-auto">
          <Stethoscope className="w-4 h-4 mr-2" />
          Assess Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-indigo-600" />
            Clinical Judgment: {patient.fullName}
          </DialogTitle>
          <DialogDescription>
            Review the patient's initial input and assign them to the proper queue.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-6 mt-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-3">
            <div>
              <span className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                Chief Complaint
              </span>
              <p className="text-slate-600 bg-white p-2 rounded border border-slate-100">
                {patient.chiefComplaint || "No complaint recorded."}
              </p>
            </div>
            {patient.detailedSituation && (
              <div>
                <span className="font-semibold text-slate-700 mb-1 block">Detailed Situation</span>
                <p className="text-slate-600 bg-white p-2 rounded border border-slate-100">
                  {patient.detailedSituation}
                </p>
              </div>
            )}
            {patient.vitals && patient.vitals.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-700 mb-1 block">Latest Vitals</span>
                <div className="flex gap-4 text-slate-600">
                  <span>BP: {patient.vitals[0].bp}</span>
                  <span>Temp: {patient.vitals[0].temp}°C</span>
                  <span>PR: {patient.vitals[0].pulse}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department">Assign Department</Label>
              <Select name="department" required defaultValue="OPD_OUTPATIENT">
                <SelectTrigger>
                  <SelectValue placeholder="Select Department..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDICAL_WARD">Medical</SelectItem>
                  <SelectItem value="SURGICAL_WARD">Surgical</SelectItem>
                  <SelectItem value="GYNECOLOGY">Gynecology</SelectItem>
                  <SelectItem value="PEDIATRIC_WARD">Pediatrics</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem value="OPD_OUTPATIENT">General OPD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Triage Priority</Label>
              <Select name="priority" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Priority..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RED">Emergency (Red)</SelectItem>
                  <SelectItem value="YELLOW">Urgent (Yellow)</SelectItem>
                  <SelectItem value="GREEN">Routine (Green)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Select name="serviceType" required defaultValue="OPD">
                <SelectTrigger>
                  <SelectValue placeholder="Select Service Type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPD">OPD</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button disabled={loading} type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
              {loading ? "Completing Triage..." : "Complete Triage"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
