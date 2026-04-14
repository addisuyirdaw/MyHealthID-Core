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
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [clinicalNote, setClinicalNote] = useState("");

  const toggleTest = (id: string) => {
    setSelectedTestIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleOrder = async () => {
    if (selectedTestIds.length === 0) return;
    
    setLoading(true);
    
    try {
      for (const tId of selectedTestIds) {
        const test = LAB_TESTS.find(t => t.id === tId);
        await createLabOrder({
          patientId,
          testName: test?.name || "Unknown Test",
          category: test?.category || "General",
          clinicalNote: clinicalNote,
        });
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
        setSelectedTestIds([]);
        setClinicalNote("");
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("Error ordering tests.");
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
            <div className="grid gap-2 mb-2">
              <label className="text-sm font-medium leading-none">Diagnostic Tests Checklist (Select multiple)</label>
              <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50 space-y-1">
                {LAB_TESTS.map((test) => (
                  <label key={test.id} className="flex items-center space-x-3 p-2 hover:bg-slate-100 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedTestIds.includes(test.id)}
                      onChange={() => toggleTest(test.id)}
                      className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700 select-none flex-1">
                      {test.name} <span className="text-xs text-slate-400 font-normal ml-1">[{test.category}]</span>
                    </span>
                  </label>
                ))}
              </div>
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
            <Button onClick={handleOrder} disabled={selectedTestIds.length === 0 || loading}>
              {loading ? "Ordering..." : `Submit Orders (${selectedTestIds.length})`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
