"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordVitals } from "@/lib/actions/patient.actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2 } from "lucide-react";

export function AddVitalsModal({ patientId, patientName }: { patientId: string, patientName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Form Fields
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [temp, setTemp] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");

  const handleSave = async () => {
    if (!systolic || !diastolic || !temp || !pulse || !weight) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    
    try {
      await recordVitals({
        patientId,
        bp: `${systolic}/${diastolic}`,
        temp: parseFloat(temp),
        pulse: parseInt(pulse, 10),
        weight: parseFloat(weight),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
        // Reset form
        setSystolic("");
        setDiastolic("");
        setTemp("");
        setPulse("");
        setWeight("");
        
        // Refresh the page data
        router.refresh();
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("Error recording vitals.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-slate-600 border-slate-300">
          <Plus className="w-4 h-4 mr-1"/> Add Vitals
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Vitals</DialogTitle>
          <DialogDescription>
            Enter the latest vital signs for {patientName}.
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Vitals Recorded Successfully!</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">BP Systolic</label>
                <input 
                  type="number"
                  placeholder="e.g. 120"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">BP Diastolic</label>
                <input 
                  type="number"
                  placeholder="e.g. 80"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Temperature (°C)</label>
                <input 
                  type="number"
                  step="0.1"
                  placeholder="e.g. 37.0"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Heart Rate (BPM)</label>
                <input 
                  type="number"
                  placeholder="e.g. 72"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium leading-none">Weight (kg)</label>
                <input 
                  type="number"
                  step="0.1"
                  placeholder="e.g. 70.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
        
        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Vitals"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
