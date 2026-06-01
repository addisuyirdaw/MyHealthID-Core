"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateReferralSummary } from "@/lib/services/referralSummary.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Send,
  CheckCircle2,
  ShieldCheck,
  Building2,
  FileText,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

const REFERRAL_HOSPITALS = [
  "Black Lion (Tikur Anbessa) Specialized Hospital",
  "St. Paul's (Pawlos) Hospital Millennium Medical College",
  "Debre Berhan Referral Hospital",
  "Jimma University Medical Center",
  "Hawassa University Referral Hospital",
  "Gondar University Hospital",
  "Ayder Referral Hospital (Mekelle)",
  "Zewditu Memorial Hospital",
  "Alert Specialized Hospital",
  "Yekatit 12 Hospital Medical College",
  "Gandhi Memorial Hospital",
  "Minilik II Hospital",
];

export function ReferModal({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [destinationFacility, setDestinationFacility] = useState("");
  const [urgency, setUrgency] = useState<"ROUTINE" | "URGENT" | "EMERGENCY">("ROUTINE");

  const handleRefer = async () => {
    if (!destinationFacility) {
      setErrorMsg("Please select a destination facility.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      const result = await generateReferralSummary({
        patientId,
        // destinationOrganizationId is not set here (facility chosen by name, not ID)
        destinationOrganizationId: null,
      });

      if (!result.success) {
        setErrorMsg(result.error || "Failed to generate referral summary.");
        return;
      }

      setSummaryId(result.referralSummaryId!);
      router.refresh();
    } catch (e: any) {
      console.error("[ReferModal] error:", e);
      setErrorMsg(e.message || "Unexpected error processing referral.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSummaryId(null);
    setErrorMsg(null);
    setDestinationFacility("");
    setUrgency("ROUTINE");
  };

  const URGENCY_CONFIG = {
    ROUTINE: {
      label: "Routine",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
    },
    URGENT: {
      label: "Urgent",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
    },
    EMERGENCY: {
      label: "Emergency",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/25",
    },
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

      <DialogContent className="sm:max-w-[500px] bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-2xl shadow-2xl p-0 overflow-hidden">
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
              <span className="text-neutral-200 font-semibold">{patientName}</span>.
              A cryptographic snapshot of their current vitals, medications, and lab results will be captured.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {summaryId ? (
            /* ── SUCCESS STATE ─────────────────────────────────────────── */
            <div className="flex flex-col items-center text-center gap-4 py-4">
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
                onClick={() => router.push(`/doctor/dashboard/referrals/${summaryId}`)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Referral Summary
              </Button>
              <button
                onClick={handleClose}
                className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            /* ── FORM STATE ────────────────────────────────────────────── */
            <>
              {/* Error Banner */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                  {errorMsg}
                </div>
              )}

              {/* Destination Facility */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> Destination Facility
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={destinationFacility}
                    onChange={(e) => setDestinationFacility(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-2.5 text-sm text-neutral-200 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">— Select Receiving Hospital —</option>
                    {REFERRAL_HOSPITALS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Urgency Level */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ROUTINE", "URGENT", "EMERGENCY"] as const).map((level) => {
                    const cfg = URGENCY_CONFIG[level];
                    const selected = urgency === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setUrgency(level)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          selected
                            ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                            : "bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:border-neutral-600"
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clinical Snapshot Note */}
              <div className="flex items-start gap-2.5 bg-blue-950/30 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-300">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                <p>
                  A tamper-evident SHA-256 snapshot of the patient&apos;s current vitals, active
                  prescriptions, and completed lab results will be sealed into this referral
                  document automatically.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!summaryId && (
          <DialogFooter className="border-t border-neutral-800 px-6 py-4 bg-neutral-900/50">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefer}
              disabled={!destinationFacility || loading}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 rounded-xl shadow-lg disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Issue Referral Summary
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
