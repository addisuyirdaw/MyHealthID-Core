"use client";

import { useState } from "react";
import { createLabOrder } from "@/lib/actions/investigation.actions";
import { LAB_TESTS } from "@/lib/constants/labTests";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TestTubeDiagonal, CheckCircle2 } from "lucide-react";

export function OrderTestModal({ patientId, patientName }: { patientId: string, patientName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [clinicalNote, setClinicalNote] = useState("");

  const handleOrder = async () => {
    if (!selectedTestId) return;
    
    setLoading(true);
    const test = LAB_TESTS.find(t => t.id === selectedTestId);
    
    try {
      await createLabOrder({
        patientId,
        testName: test?.name || "Unknown Test",
        category: test?.category || "General",
        clinicalNote: clinicalNote,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
        setSelectedTestId("");
        setClinicalNote("");
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("Error ordering test.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-slate-600 border-slate-300">
          <TestTubeDiagonal className="w-4 h-4 mr-1" />
          Order Lab
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Order Investigation</DialogTitle>
          <DialogDescription>
            Select a diagnostic test for {patientName}.
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Test Ordered Successfully!</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="test" className="text-sm font-medium leading-none">Diagnostic Test (e.g. Blood Sugar)</label>
              <select 
                id="test"
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="" disabled>Select a test...</option>
                {LAB_TESTS.map((test) => (
                  <option key={test.id} value={test.id}>
                    [{test.category}] {test.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="note" className="text-sm font-medium leading-none">Clinical Note</label>
              <textarea
                id="note"
                placeholder="Explain why you are ordering this test..."
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[80px]"
              />
            </div>
          </div>
        )}
        
        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleOrder} disabled={!selectedTestId || loading}>
              {loading ? "Ordering..." : "Submit Order"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
