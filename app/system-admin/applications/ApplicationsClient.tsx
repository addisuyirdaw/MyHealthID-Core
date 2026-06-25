"use client";

/**
 * app/system-admin/applications/ApplicationsClient.tsx
 *
 * Interactive review panel for FacilityApplication records.
 * Tabs: Pending | Approved | Rejected | All
 * Actions: Approve (with confirmation modal) | Reject (with reason modal)
 */

import React, { useState, useTransition } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Mail,
  FileText,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldAlert,
  ExternalLink,
  Hash,
} from "lucide-react";
import {
  approveFacilityApplication,
  rejectFacilityApplication,
} from "@/lib/actions/facility-application.actions";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FacilityApplication {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  businessLicenseNumber: string;
  contactEmail: string;
  registeredBy: string;
  officialName: string;
  facilityType: string;
  ownershipType?: string | null;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  kebele?: string | null;
  metadata: {
    license_url?: string | null;
    representative_id_type?: string | null;
    representative_id_url?: string | null;
    physician_lead_name?: string | null;
    notes?: string | null;
    [key: string]: unknown;
  };
  approvedFacilityId?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

type TabId = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const STATUS_STYLES: Record<FacilityApplication["status"], string> = {
  PENDING:  "bg-amber-500/10 text-amber-400 border-amber-500/25",
  APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/25",
};

const STATUS_ICONS: Record<FacilityApplication["status"], React.ElementType> = {
  PENDING:  Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtFacilityType(raw: string) {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main component ──────────────────────────────────────────────────────────
export function ApplicationsClient({
  initialApplications,
}: {
  initialApplications: FacilityApplication[];
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [activeTab, setActiveTab] = useState<TabId>("PENDING");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Approve modal
  const [approveTarget, setApproveTarget] = useState<FacilityApplication | null>(null);
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveResult, setApproveResult] = useState<{ tenantId: string } | null>(null);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<FacilityApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "PENDING",  label: "Pending",  count: applications.filter((a) => a.status === "PENDING").length },
    { id: "APPROVED", label: "Approved", count: applications.filter((a) => a.status === "APPROVED").length },
    { id: "REJECTED", label: "Rejected", count: applications.filter((a) => a.status === "REJECTED").length },
    { id: "ALL",      label: "All",      count: applications.length },
  ];

  const filtered = activeTab === "ALL"
    ? applications
    : applications.filter((a) => a.status === activeTab);

  // ── Approve flow ───────────────────────────────────────────────────────────
  async function handleApprove() {
    if (!approveTarget) return;
    setApproveLoading(true);
    try {
      const res = await approveFacilityApplication(approveTarget.id);
      if (res.success && res.tenantId) {
        setApproveResult({ tenantId: res.tenantId });
        setApplications((prev) =>
          prev.map((a) =>
            a.id === approveTarget.id
              ? { ...a, status: "APPROVED", approvedFacilityId: res.tenantId, approvedAt: new Date().toISOString() }
              : a
          )
        );
        showToast(`✅ Facility approved. Tenant ID: ${res.tenantId}`);
      } else {
        showToast(res.error ?? "Approval failed.", false);
        setApproveTarget(null);
      }
    } catch (e: any) {
      showToast(e.message ?? "Unexpected error.", false);
      setApproveTarget(null);
    } finally {
      setApproveLoading(false);
    }
  }

  function closeApproveModal() {
    setApproveTarget(null);
    setApproveResult(null);
  }

  // ── Reject flow ────────────────────────────────────────────────────────────
  async function handleReject() {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      showToast("Please provide a rejection reason.", false);
      return;
    }
    setRejectLoading(true);
    try {
      const res = await rejectFacilityApplication(rejectTarget.id, rejectReason);
      if (res.success) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === rejectTarget.id
              ? { ...a, status: "REJECTED", rejectionReason: rejectReason }
              : a
          )
        );
        showToast("Application rejected and applicant notified.");
        setRejectTarget(null);
        setRejectReason("");
      } else {
        showToast(res.error ?? "Rejection failed.", false);
      }
    } catch (e: any) {
      showToast(e.message ?? "Unexpected error.", false);
    } finally {
      setRejectLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold backdrop-blur-md border transition-all
          ${toast.ok
            ? "bg-emerald-900/80 text-emerald-300 border-emerald-500/30"
            : "bg-red-900/80 text-red-300 border-red-500/30"
          }`}>
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-1 w-fit">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === id
                ? "bg-neutral-700/70 text-white shadow"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              id === "PENDING" && count > 0 ? "bg-amber-500/25 text-amber-400" : "bg-neutral-700 text-neutral-400"
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-neutral-600" />
          </div>
          <p className="text-neutral-400 text-sm">No {activeTab !== "ALL" ? activeTab.toLowerCase() : ""} applications found.</p>
        </div>
      )}

      {/* Application cards */}
      <div className="space-y-3">
        {filtered.map((app) => {
          const StatusIcon = STATUS_ICONS[app.status];
          const isExpanded = expandedId === app.id;
          const meta = app.metadata as any;

          return (
            <div
              key={app.id}
              className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl overflow-hidden backdrop-blur-sm transition-all"
            >
              {/* Card header */}
              <div className="flex items-center gap-4 p-5">
                <div className="w-10 h-10 rounded-xl bg-neutral-800/70 border border-neutral-700/50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-neutral-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 flex-wrap">
                    <h3 className="text-white font-bold text-sm truncate">{app.officialName}</h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[app.status]}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {app.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
                    <span className="text-xs text-neutral-500">{fmtFacilityType(app.facilityType)}</span>
                    <span className="flex items-center gap-1 text-xs text-neutral-500">
                      <Mail className="w-3 h-3" /> {app.contactEmail}
                    </span>
                    <span className="text-xs text-neutral-600">Submitted {fmtDate(app.createdAt)}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {app.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => setApproveTarget(app)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/25 text-emerald-400 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => { setRejectTarget(app); setRejectReason(""); }}
                        className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/25 text-red-400 text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                  {app.status === "APPROVED" && app.approvedFacilityId && (
                    <div className="text-xs text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg truncate max-w-[180px]" title={app.approvedFacilityId}>
                      {app.approvedFacilityId}
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                    className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-neutral-800/60 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <Detail icon={Hash}      label="License Number"    value={app.businessLicenseNumber} />
                  <Detail icon={User}      label="Ownership"         value={app.ownershipType ?? "—"} />
                  <Detail icon={MapPin}    label="Location"          value={[app.region, app.zone, app.woreda, app.kebele].filter(Boolean).join(", ") || "—"} />
                  <Detail icon={User}      label="Lead Physician"    value={meta?.physician_lead_name ?? "—"} />
                  <Detail icon={FileText}  label="Rep. ID Type"      value={meta?.representative_id_type ?? "—"} />

                  {meta?.license_url && (
                    <div className="sm:col-span-2">
                      <span className="text-neutral-500 text-xs uppercase tracking-wider">License Document</span>
                      <a href={meta.license_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-400 hover:underline text-xs mt-0.5">
                        <ExternalLink className="w-3 h-3" /> View Document
                      </a>
                    </div>
                  )}
                  {meta?.representative_id_url && (
                    <div className="sm:col-span-2">
                      <span className="text-neutral-500 text-xs uppercase tracking-wider">Representative ID</span>
                      <a href={meta.representative_id_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-400 hover:underline text-xs mt-0.5">
                        <ExternalLink className="w-3 h-3" /> View Document
                      </a>
                    </div>
                  )}
                  {meta?.notes && (
                    <div className="sm:col-span-2">
                      <span className="text-neutral-500 text-xs uppercase tracking-wider">Notes</span>
                      <p className="text-neutral-300 text-xs mt-0.5">{meta.notes}</p>
                    </div>
                  )}
                  {app.status === "REJECTED" && app.rejectionReason && (
                    <div className="sm:col-span-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Rejection Reason</span>
                      <p className="text-red-300 text-xs mt-1">{app.rejectionReason}</p>
                    </div>
                  )}
                  {app.status === "APPROVED" && app.approvedFacilityId && (
                    <div className="sm:col-span-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                      <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Tenant ID (Facility ID)</span>
                      <p className="text-emerald-300 font-mono text-xs mt-1 break-all">{app.approvedFacilityId}</p>
                      {app.approvedAt && (
                        <p className="text-neutral-500 text-[10px] mt-1">Approved on {fmtDate(app.approvedAt)}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Approve Confirmation Modal ─── */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-700/60 rounded-2xl p-6 shadow-2xl">
            {approveResult ? (
              // Success state inside modal
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-white text-center mb-2">Facility Activated!</h3>
                <p className="text-neutral-400 text-sm text-center mb-4">
                  <strong className="text-white">{approveTarget.officialName}</strong> is now live on the platform.
                </p>
                <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-4 mb-5">
                  <p className="text-xs text-neutral-500 mb-1 font-medium uppercase tracking-widest">Tenant ID</p>
                  <code className="text-emerald-400 font-mono text-sm break-all">{approveResult.tenantId}</code>
                </div>
                <p className="text-xs text-neutral-500 text-center mb-5">
                  A notification has been sent to <span className="text-neutral-300">{approveTarget.contactEmail}</span>.
                </p>
                <button
                  onClick={closeApproveModal}
                  className="w-full py-2.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-semibold text-sm transition"
                >
                  Close
                </button>
              </>
            ) : (
              // Confirm state
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Approve Application?</h3>
                    <p className="text-xs text-neutral-500">This will create an active facility on the platform.</p>
                  </div>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-4 mb-5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Facility</span>
                    <span className="text-white font-medium">{approveTarget.officialName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Type</span>
                    <span className="text-white">{fmtFacilityType(approveTarget.facilityType)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">License #</span>
                    <span className="text-white font-mono text-xs">{approveTarget.businessLicenseNumber}</span>
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-amber-300 text-xs mb-5">
                  <ShieldAlert className="inline w-3 h-3 mr-1" />
                  A TenantID will be generated and the applicant will be notified by email.
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={closeApproveModal}
                    disabled={approveLoading}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={approveLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
                  >
                    {approveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {approveLoading ? "Approving…" : "Confirm Approval"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Reject Modal ─── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-700/60 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reject Application</h3>
                <p className="text-xs text-neutral-500">The applicant will be notified with your reason.</p>
              </div>
            </div>
            <p className="text-sm text-neutral-400 mb-3">
              Rejecting: <span className="text-white font-semibold">{rejectTarget.officialName}</span>
            </p>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
              Rejection Reason *
            </label>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Missing required documentation, license number could not be verified…"
              className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition resize-none mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                disabled={rejectLoading}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectLoading || !rejectReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                {rejectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {rejectLoading ? "Rejecting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────
function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <span className="flex items-center gap-1 text-neutral-500 text-xs uppercase tracking-wider mb-0.5">
        <Icon className="w-3 h-3" /> {label}
      </span>
      <p className="text-neutral-200 text-sm">{value}</p>
    </div>
  );
}
