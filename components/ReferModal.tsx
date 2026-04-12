"use client";

import { useState } from "react";
import { createReferral } from "@/lib/actions/referral.actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2 } from "lucide-react";

export function ReferModal({ patientId, patientName }: { patientId: string, patientName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [destinationFacility, setDestinationFacility] = useState("");
  const [reason, setReason] = useState("");

  const handleRefer = async () => {
    if (!destinationFacility || !reason) {
      alert("Destination Facility and Reason are required.");
      return;
    }
    
    setLoading(true);
    
    try {
      await createReferral({
        patientId,
        destinationFacility,
        reason,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setOpen(false);
        setDestinationFacility("");
        setReason("");
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("Error processing referral.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 bg-white">
          <Send className="w-4 h-4 mr-1"/> Refer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Refer Patient Out</DialogTitle>
          <DialogDescription>
            Transfer {patientName} to another medical facility.
          </DialogDescription>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Patient Referred Successfully!</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="destinationFacility" className="text-sm font-medium leading-none">Destination Hospital / Clinic <span className="text-red-500">*</span></label>
              <input 
                id="destinationFacility"
                placeholder="e.g. Tikur Anbessa Hospital"
                value={destinationFacility}
                onChange={(e) => setDestinationFacility(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="reason" className="text-sm font-medium leading-none">Reason for Referral <span className="text-red-500">*</span></label>
              <textarea
                id="reason"
                placeholder="e.g. Requires specialized cardiovascular surgery..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[100px]"
              />
            </div>
          </div>
        )}
        
        {!isSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleRefer} disabled={!destinationFacility || !reason || loading} className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
              {loading ? "Processing..." : "Confirm Referral"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
