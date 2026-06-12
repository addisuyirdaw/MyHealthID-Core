"use client";

import { useState, useTransition } from "react";
import { updateReferralStatus } from "@/lib/actions/referral.actions";
import { ReferralStatus } from "@prisma/client";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Siren,
  ArrowUpRight,
  FileText,
  RefreshCw,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface ReferralPatient {
  id: string;
  fullName: string;
  age: number;
  sex: string;
  phoneNumber?: string | null;
  priorityLevel: string;
  status?: string | null;
}

interface InboundReferral {
  id: string;
  patientId: string;
  reason: string;
  destinationFacility: string;
  receivingFacilityId?: string | null;
  status: ReferralStatus;
  rejectionReason?: string | null;
  aiOverrideLogged: boolean;
  createdAt: string;
  patient: ReferralPatient;
}

interface Props {
  initialReferrals: InboundReferral[];
  facilityName: string;
}

/* ─── Priority Badge ────────────────────────────────────────────────────────── */

function PriorityBadge({ level }: { level: string }) {
  if (level === "EMERGENCY") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-red-950/60 text-red-400 border-red-900 animate-pulse">
        <Siren className="w-3 h-3" />
        Emergency
      </span>
    );
  }
  if (level === "URGENT") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-orange-950/60 text-orange-400 border-orange-900">
        <AlertTriangle className="w-3 h-3" />
        Urgent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-900/60 text-indigo-400 border-slate-800">
      <Clock className="w-3 h-3" />
      Routine
    </span>
  );
}

/* ─── Status Chip ───────────────────────────────────────────────────────────── */

function StatusChip({ status }: { status: ReferralStatus }) {
  if (status === "ACCEPTED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-900">
        <CheckCircle2 className="w-3 h-3" /> Accepted
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/40 text-red-400 border border-red-900">
        <XCircle className="w-3 h-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/50 text-amber-400 border border-amber-900">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

/* ─── Rejection Modal ───────────────────────────────────────────────────────── */

function RejectionModal({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl ring-1 ring-white/5">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-56 h-56 rounded-full bg-red-500/10 blur-3xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/50 border border-red-800/50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Reject Referral</h3>
              <p className="text-slate-400 text-xs">Provide a clinical reason for rejection</p>
            </div>
          </div>

          <textarea
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 text-sm placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-red-600/40 transition-all"
            rows={4}
            placeholder="e.g. Facility at full capacity for the specified department. Patient should be redirected to..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(reason)}
              disabled={!reason.trim() || isPending}
              className="flex-1 h-10 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold transition-all"
            >
              {isPending ? "Rejecting…" : "Confirm Rejection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Referral Row ──────────────────────────────────────────────────────────── */

function ReferralRow({
  referral,
  onAccept,
  onReject,
  isPending,
}: {
  referral: InboundReferral;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  let parsedReason: Record<string, string> = {};
  try {
    parsedReason = JSON.parse(referral.reason);
  } catch {
    parsedReason = { reasonForReferral: referral.reason };
  }

  const isSettled = referral.status !== "PENDING";

  return (
    <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700 transition-all duration-200 overflow-hidden">
      {/* Emergency pulse accent */}
      {referral.patient.priorityLevel === "EMERGENCY" && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl animate-pulse" />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold text-sm">{referral.patient.fullName}</span>
              <span className="text-slate-500 text-xs">
                {referral.patient.age}y · {referral.patient.sex}
              </span>
              <PriorityBadge level={referral.patient.priorityLevel} />
            </div>
            {referral.patient.phoneNumber && (
              <p className="text-slate-500 text-xs mt-0.5">{referral.patient.phoneNumber}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusChip status={referral.status} />
          </div>
        </div>

        {/* Clinical info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {parsedReason.reasonForReferral && (
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
              <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Reason</p>
              <p className="text-slate-200 text-sm leading-relaxed line-clamp-2">
                {parsedReason.reasonForReferral}
              </p>
            </div>
          )}
          {parsedReason.workingDiagnosis && (
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
              <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Working Diagnosis</p>
              <p className="text-slate-200 text-sm leading-relaxed line-clamp-2">
                {parsedReason.workingDiagnosis}
              </p>
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {parsedReason.department && (
              <span className="flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-slate-300">{parsedReason.department}</span>
              </span>
            )}
            <span>
              {new Date(referral.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {referral.aiOverrideLogged && (
              <span className="text-amber-500 font-medium">⚠ AI Override</span>
            )}
          </div>

          {/* Action buttons — only visible when PENDING */}
          {!isSettled && (
            <div className="flex gap-2">
              <button
                onClick={() => onReject(referral.id)}
                disabled={isPending}
                className="h-8 px-3 rounded-lg border border-red-900 bg-red-950/30 text-red-400 text-xs font-semibold hover:bg-red-900/50 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
              <button
                onClick={() => onAccept(referral.id)}
                disabled={isPending}
                className="h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Accept &amp; Ingest
              </button>
            </div>
          )}
        </div>

        {/* Rejection reason footer */}
        {referral.status === "REJECTED" && referral.rejectionReason && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-300 leading-relaxed">
            <span className="font-bold text-red-400">Rejection reason: </span>
            {referral.rejectionReason}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────────── */

export default function ReferralIngestionQueue({ initialReferrals, facilityName }: Props) {
  const [referrals, setReferrals] = useState<InboundReferral[]>(initialReferrals);
  const [filter, setFilter] = useState<"ALL" | ReferralStatus>("ALL");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const displayed = filter === "ALL" ? referrals : referrals.filter((r) => r.status === filter);

  const handleAccept = (referralId: string) => {
    setActionError(null);
    startTransition(async () => {
      try {
        await updateReferralStatus(referralId, ReferralStatus.ACCEPTED);
        setReferrals((prev) =>
          prev.map((r) =>
            r.id === referralId ? { ...r, status: ReferralStatus.ACCEPTED } : r
          )
        );
      } catch (e: any) {
        setActionError(e.message || "Failed to accept referral.");
      }
    });
  };

  const handleRejectConfirm = (reason: string) => {
    if (!rejectTarget) return;

    // Server-boundary guard: re-validate the reason string here, independent of
    // the modal's disabled prop, so an empty payload can never reach the server
    // action even if the UI constraint is bypassed programmatically.
    if (!reason.trim()) {
      setActionError("A rejection reason is required before this action can be submitted.");
      return;
    }

    setActionError(null);
    startTransition(async () => {
      try {
        await updateReferralStatus(rejectTarget, ReferralStatus.REJECTED, reason.trim());
        setReferrals((prev) =>
          prev.map((r) =>
            r.id === rejectTarget
              ? { ...r, status: ReferralStatus.REJECTED, rejectionReason: reason.trim() }
              : r
          )
        );
        setRejectTarget(null);
      } catch (e: any) {
        setActionError(e.message || "Failed to reject referral.");
      }
    });
  };

  const pendingCount = referrals.filter((r) => r.status === "PENDING").length;

  return (
    <>
      <RejectionModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        isPending={isPending}
      />

      <div className="min-h-screen bg-slate-950 text-white">
        {/* Ambient background glows */}
        <div className="pointer-events-none fixed top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-600/5 blur-3xl" />
          <div className="absolute top-1/2 -right-40 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Page header */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">Inbound Referrals</h1>
                <p className="text-slate-400 text-sm">{facilityName}</p>
              </div>
            </div>
            {pendingCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/50 border border-amber-800/50 text-amber-400 text-sm font-semibold">
                <Clock className="w-4 h-4" />
                {pendingCount} pending referral{pendingCount !== 1 ? "s" : ""} require attention
              </div>
            )}
          </div>

          {/* Error banner */}
          {actionError && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              {actionError}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "PENDING", "ACCEPTED", "REJECTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  filter === tab
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                {tab === "PENDING" && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-900/70 text-amber-400 text-xs">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1 text-slate-500 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Updates on action</span>
            </div>
          </div>

          {/* Referral list */}
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <FileText className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400 font-semibold">No referrals in this category</p>
              <p className="text-slate-600 text-sm">
                {filter === "ALL"
                  ? "No inbound referrals have been received yet."
                  : `No ${filter.toLowerCase()} referrals at this time.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((referral) => (
                <ReferralRow
                  key={referral.id}
                  referral={referral}
                  onAccept={handleAccept}
                  onReject={(id) => setRejectTarget(id)}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
