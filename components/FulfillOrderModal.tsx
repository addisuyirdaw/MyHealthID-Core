"use client";

import { useState } from "react";
import { updateLabResult } from "@/lib/actions/investigation.actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

export function FulfillOrderModal({ 
  investigationId, 
  testName, 
  patientName,
  onSuccess
}: { 
  investigationId: string, 
  testName: string, 
  patientName: string,
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [resultValue, setResultValue] = useState("");
  const [comments, setComments] = useState("");
  const [techName, setTechName] = useState("");

  const handleFulfill = async () => {
    if (!resultValue) {
      alert("Result value is required.");
      return;
    }
    
    setLoading(true);
    
    try {
      await updateLabResult({
        investigationId,
        resultValue,
        technicianComments: comments,
        technicianName: techName,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setOpen(false);
        setResultValue("");
        setComments("");
        setTechName("");
        onSuccess();
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("Error fulfilling order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm gap-2">
          <ClipboardCheck className="w-4 h-4" />
          Fulfill Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Fulfill Lab Order</DialogTitle>
          <DialogDescription>
            Enter results for {testName} ({patientName}).
          </DialogDescription>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Result Saved Successfully!</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="resValue" className="text-sm font-medium leading-none">Result Summary <span className="text-red-500">*</span></label>
              <input 
                id="resValue"
                placeholder="e.g. Positive, 98 mg/dL, etc."
                value={resultValue}
                onChange={(e) => setResultValue(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="techComments" className="text-sm font-medium leading-none">Technician Comments</label>
              <textarea
                id="techComments"
                placeholder="Any observations or context..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[80px]"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="techName" className="text-sm font-medium leading-none">Technician Signature</label>
              <input 
                id="techName"
                placeholder="e.g. John Doe, LT-105"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>
          </div>
        )}
        
        {!isSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleFulfill} disabled={!resultValue || loading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {loading ? "Saving..." : "Submit Result"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
