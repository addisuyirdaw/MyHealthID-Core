"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Send,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { ReferralCreationWizard } from "@/components/referrals/ReferralCreationWizard";

export function ReferModal({
  patient,
}: {
  patient: any;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(null);

  const handleClose = () => {
    setOpen(false);
    setSummaryId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10 bg-transparent"
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          Issue Referral
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[650px] bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-2xl shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-950/60 to-neutral-900 border-b border-neutral-800 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                <Send className="w-4 h-4 text-orange-400" />
              </div>
              Cross-Facility Referral
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs mt-1">
              Issue a verified clinical referral summary for{" "}
              <span className="text-neutral-200 font-semibold">{patient.fullName}</span>.
              A cryptographic snapshot of their current vitals, medications, and lab results will be captured.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body / Content */}
        <div className="p-0">
          {summaryId ? (
            /* ── SUCCESS STATE ─────────────────────────────────────────── */
            <div className="flex flex-col items-center text-center gap-4 py-8 px-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-black text-white">Referral Summary Generated</p>
                <p className="text-xs text-neutral-400 mt-1">
                  A verified clinical snapshot has been issued and cryptographically sealed.
                </p>
              </div>
              <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-3 w-full text-left">
                <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider mb-1">
                  Summary Reference
                </p>
                <p className="text-xs font-mono text-neutral-300 break-all">{summaryId}</p>
              </div>
              <Button
                onClick={() => {
                  router.push(`/doctor/dashboard/referrals/${summaryId}`);
                  handleClose();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Referral Summary
              </Button>
              <button
                onClick={handleClose}
                className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors mt-2"
              >
                Close
              </button>
            </div>
          ) : (
            /* ── WIZARD FORM STATE ───────────────────────────────────────── */
            <ReferralCreationWizard
              activePatient={patient}
              onClose={handleClose}
              onSuccess={(refId) => {
                setSummaryId(refId);
                router.refresh();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
