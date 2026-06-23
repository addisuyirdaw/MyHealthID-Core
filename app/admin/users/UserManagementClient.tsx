"use client";

import {
  useState,
  useTransition,
  useDeferredValue,
  useCallback,
  type ChangeEvent,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  Users,
  Shield,
  User,
  Activity,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  ShieldOff,
  ShieldCheck,
  RefreshCw,
  Building2,
  Stethoscope,
  ClipboardList,
  UserPlus,
} from "lucide-react";
import {
  type DirectoryRecord,
  type AccountType,
  getAdministrativeDirectory,
  updateUserProfileFields,
  toggleAccountState,
  safePurgeAccount,
} from "@/lib/actions/admin.actions";
import { onboardHealthcareProfessional } from "@/lib/actions/auth.actions";

// ─────────────────────────────────────────────────────────────────────────────
// Role metadata helpers (mirrors the admin dashboard style)
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  HOSPITAL_CEO: "Hospital CEO",
  IT_HIS_ADMIN: "IT / HIS Admin",
  GENERAL_PRACTITIONER: "General Practitioner",
  MEDICAL_SPECIALIST: "Medical Specialist",
  SUB_SPECIALIST: "Sub-Specialist",
  HEALTH_OFFICER: "Health Officer",
  CLINICAL_NURSE: "Clinical Nurse",
  SPECIALIZED_NURSE: "Specialized Nurse",
  MIDWIFE: "Midwife",
  PHARMACIST: "Pharmacist",
  LABORATORY_TECHNICIAN: "Lab Technician",
  LABORATORY_TECHNOLOGIST: "Lab Technologist",
  RECEPTIONIST: "Receptionist",
  CARD_ROOM_CLERK: "Card Room Clerk",
  ANESTHETIST: "Anesthetist",
  RADIOGRAPHER: "Radiographer",
  IESO: "IESO",
  FINANCE_INSURANCE: "Finance / Insurance",
  AMBULANCE_DRIVER: "Ambulance Driver",
  SECURITY_GUARD: "Security Guard",
  CLEANER: "Cleaner",
  CITIZEN: "Patient / Citizen",
  ADMIN: "Administrator",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  LAB_TECH: "Lab Technician",
};

const ROLE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  HOSPITAL_CEO:            { text: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/25" },
  IT_HIS_ADMIN:            { text: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/25" },
  GENERAL_PRACTITIONER:    { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  MEDICAL_SPECIALIST:      { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  SUB_SPECIALIST:          { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  HEALTH_OFFICER:          { text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25" },
  CLINICAL_NURSE:          { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  SPECIALIZED_NURSE:       { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  MIDWIFE:                 { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  PHARMACIST:              { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25" },
  LABORATORY_TECHNICIAN:   { text: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25" },
  LABORATORY_TECHNOLOGIST: { text: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25" },
  RECEPTIONIST:            { text: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/25" },
  CARD_ROOM_CLERK:         { text: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/25" },
  CITIZEN:                 { text: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/25" },
};
const DEFAULT_ROLE_COLOR = { text: "text-neutral-400", bg: "bg-neutral-800", border: "border-neutral-700" };

// ─────────────────────────────────────────────────────────────────────────────
// Type aliases
// ─────────────────────────────────────────────────────────────────────────────
type FilterType = "ALL" | AccountType;

interface EditForm {
  name: string;
  email: string;
  phone: string;
}

interface BlockedModal {
  open: boolean;
  message: string;
}

interface FacilityMetrics {
  totalStaff: number;
  activeClinicalWorkers: number;
  localConsultations: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function UserManagementClient({
  initialRecords,
  hospitalName,
  metrics,
}: {
  initialRecords: DirectoryRecord[];
  hospitalName: string;
  metrics: FacilityMetrics;
}) {
  const [records, setRecords] = useState<DirectoryRecord[]>(initialRecords);
  const [rawSearch, setRawSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [editTarget, setEditTarget] = useState<DirectoryRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", email: "", phone: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [blockedModal, setBlockedModal] = useState<BlockedModal>({ open: false, message: "" });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Onboarding states
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({ fullName: "", licenseNumber: "", role: "" });
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; name: string; license: string; code: string } | null>(null);

  const search = useDeferredValue(rawSearch.trim().toLowerCase());

  // ── Derived filtered list ────────────────────────────────────────────────
  const filtered = records.filter((r) => {
    const matchesType = typeFilter === "ALL" || r.type === typeFilter;
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search) ||
      (r.email ?? "").toLowerCase().includes(search) ||
      (r.phone ?? "").toLowerCase().includes(search) ||
      ROLE_LABELS[r.role]?.toLowerCase().includes(search);
    return matchesType && matchesSearch;
  });

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  // ── Refresh list from server ─────────────────────────────────────────────
  const refreshRecords = useCallback(() => {
    startTransition(async () => {
      const fresh = await getAdministrativeDirectory();
      setRecords(fresh);
    });
  }, []);

  // ── Open Edit modal ──────────────────────────────────────────────────────
  const openEdit = useCallback((record: DirectoryRecord) => {
    setEditTarget(record);
    setEditForm({ name: record.name, email: record.email ?? "", phone: record.phone ?? "" });
    setEditError(null);
  }, []);

  // ── Submit Edit ──────────────────────────────────────────────────────────
  const submitEdit = useCallback(() => {
    if (!editTarget) return;
    setEditError(null);
    startTransition(async () => {
      const result = await updateUserProfileFields(editTarget.id, editForm);
      if (result.success) {
        setEditTarget(null);
        showToast("success", "Profile updated successfully.");
        refreshRecords();
      } else {
        setEditError(result.error ?? "Update failed.");
      }
    });
  }, [editTarget, editForm, showToast, refreshRecords]);

  // ── Toggle account state ─────────────────────────────────────────────────
  const handleToggle = useCallback(
    (record: DirectoryRecord) => {
      const next = !record.isActive;
      const label = next ? "reactivate" : "deactivate";
      if (!window.confirm(`Are you sure you want to ${label} ${record.name}?`)) return;
      startTransition(async () => {
        const result = await toggleAccountState(record.id, next);
        if (result.success) {
          showToast("success", `Account ${next ? "reactivated" : "deactivated"} successfully.`);
          refreshRecords();
        } else {
          showToast("error", result.error ?? "Toggle failed.");
        }
      });
    },
    [showToast, refreshRecords]
  );

  // ── Purge record ─────────────────────────────────────────────────────────
  const handlePurge = useCallback(
    (record: DirectoryRecord) => {
      if (!window.confirm(`⚠️ Are you sure you want to permanently delete ${record.name}? This action CANNOT be undone.`))
        return;
      startTransition(async () => {
        const result = await safePurgeAccount(record.id);
        if (result.success) {
          showToast("success", `${record.name} has been permanently removed.`);
          refreshRecords();
        } else if (result.blocked) {
          setBlockedModal({ open: true, message: result.error ?? "Clinical dependencies detected." });
        } else {
          showToast("error", result.error ?? "Purge failed.");
        }
      });
    },
    [showToast, refreshRecords]
  );

  // ── Submit Onboard ───────────────────────────────────────────────────────
  const submitOnboard = useCallback(() => {
    setOnboardError(null);
    if (!onboardForm.fullName.trim() || !onboardForm.licenseNumber.trim() || !onboardForm.role) {
      setOnboardError("All fields are required.");
      return;
    }
    startTransition(async () => {
      const result = await onboardHealthcareProfessional({
        fullName: onboardForm.fullName,
        licenseNumber: onboardForm.licenseNumber,
        role: onboardForm.role as any,
      });
      if (result.success && result.user) {
        setIsOnboardOpen(false);
        setOnboardForm({ fullName: "", licenseNumber: "", role: "" });
        setSuccessModal({
          open: true,
          name: result.user.fullName,
          license: onboardForm.licenseNumber,
          code: (result.user as any).activationCode || "",
        });
        showToast("success", "Staff onboarded successfully.");
        refreshRecords();
      } else {
        setOnboardError(result.error ?? "Failed to onboard staff.");
      }
    });
  }, [onboardForm, showToast, refreshRecords]);

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalStaff    = records.filter((r) => r.type === "STAFF").length;
  const totalPatients = records.filter((r) => r.type === "PATIENT").length;
  const activeCount   = records.filter((r) => r.isActive).length;
  const inactiveCount = records.filter((r) => !r.isActive).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* ── Facility Summary Matrix Card ── */}
      <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-neutral-900/60 to-neutral-900/80 overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-indigo-500/15 bg-indigo-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-200 leading-none">{hospitalName}</p>
              <p className="text-[10px] text-indigo-400/60 mt-0.5">Live Operational Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 divide-x divide-indigo-500/10 px-0">
          {[
            {
              label: "Registered Staff",
              value: metrics.totalStaff,
              icon: Shield,
              color: "text-indigo-300",
              sub: "facility members",
            },
            {
              label: "Active Clinicians",
              value: metrics.activeClinicalWorkers,
              icon: Stethoscope,
              color: "text-emerald-300",
              sub: "on duty",
            },
            {
              label: "Consultations",
              value: metrics.localConsultations,
              icon: ClipboardList,
              color: "text-sky-300",
              sub: "recorded",
            },
          ].map((m) => (
            <div key={m.label} className="flex flex-col items-center justify-center gap-1 py-5 px-4 text-center">
              <m.icon className={`w-4 h-4 ${m.color} mb-1 opacity-80`} />
              <p className={`text-2xl font-black tabular-nums ${m.color}`}>
                {m.value.toLocaleString()}
              </p>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider leading-none">
                {m.label}
              </p>
              <p className="text-[9px] text-neutral-600">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl text-sm font-semibold transition-all duration-300 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/90 border-red-500/40 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* ── Global pending overlay ── */}
      {isPending && (
        <div className="fixed inset-0 z-[100] bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-700 rounded-2xl px-6 py-4 shadow-2xl">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <span className="text-sm font-semibold text-neutral-200">Processing…</span>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Staff",    value: totalStaff,    icon: Shield,    color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20" },
          { label: "Total Patients", value: totalPatients, icon: Users,     color: "text-teal-400",    bg: "bg-teal-500/10",    border: "border-teal-500/20" },
          { label: "Active",         value: activeCount,   icon: Activity,  color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Suspended",      value: inactiveCount, icon: ShieldOff, color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.bg} ${s.border} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search + filters bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          <input
            id="user-search"
            type="text"
            placeholder="Search by name, email, phone, or role…"
            value={rawSearch}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRawSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-900/80 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          {(["ALL", "STAFF", "PATIENT"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3.5 py-2 text-[11px] font-bold rounded-xl border transition ${
                typeFilter === f
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600"
              }`}
            >
              {f === "ALL" ? "All" : f === "STAFF" ? "Staff" : "Patients"}
            </button>
          ))}

          <button
            onClick={refreshRecords}
            disabled={isPending}
            title="Refresh directory"
            className="ml-1 p-2 bg-neutral-800/60 border border-neutral-700 rounded-xl text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsOnboardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold bg-indigo-600 border border-indigo-500 hover:bg-indigo-700 text-white rounded-xl transition ml-2"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Onboard Staff
          </button>
        </div>
      </div>

      {/* ── Data table ── */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1.5fr] gap-4 px-5 py-3 border-b border-neutral-800 bg-neutral-900/50">
          {["Account", "Contact", "Role", "Status", "Actions"].map((h) => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              {h}
            </p>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <Users className="w-6 h-6 text-neutral-600" />
            </div>
            <div>
              <p className="text-neutral-300 font-bold">No records found</p>
              <p className="text-neutral-600 text-sm mt-1">Try adjusting your search or filter.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/60">
            {filtered.map((record) => {
              const rc = ROLE_COLORS[record.role] ?? DEFAULT_ROLE_COLOR;
              const avatar = record.name.trim().charAt(0).toUpperCase();
              const isStaff = record.type === "STAFF";

              return (
                <div
                  key={record.id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1.5fr_1fr_1.5fr] gap-3 md:gap-4 items-center px-5 py-4 hover:bg-neutral-800/20 transition group"
                >
                  {/* Account */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        isStaff
                          ? "bg-indigo-900/60 border border-indigo-700/40 text-indigo-300"
                          : "bg-teal-900/60 border border-teal-700/40 text-teal-300"
                      }`}
                    >
                      {avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{record.name}</p>
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          isStaff
                            ? "text-indigo-400 bg-indigo-500/10"
                            : "text-teal-400 bg-teal-500/10"
                        }`}
                      >
                        {isStaff ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                        {isStaff ? "Staff" : "Patient"}
                      </span>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs text-neutral-300 truncate font-mono">
                      {record.email ?? <span className="text-neutral-600 italic">No email</span>}
                    </p>
                    {record.phone && (
                      <p className="text-[10px] text-neutral-500 font-mono truncate">{record.phone}</p>
                    )}
                  </div>

                  {/* Role badge */}
                  <div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg border ${rc.bg} ${rc.border} ${rc.text} truncate max-w-full`}
                    >
                      {ROLE_LABELS[record.role] ?? record.role}
                    </span>
                  </div>

                  {/* Status pill */}
                  <div>
                    {record.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                        Suspended
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Edit */}
                    <button
                      onClick={() => openEdit(record)}
                      title="Edit profile"
                      className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-600 transition"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>

                    {/* Toggle active state */}
                    <button
                      onClick={() => handleToggle(record)}
                      title={record.isActive ? "Deactivate account" : "Reactivate account"}
                      className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition ${
                        record.isActive
                          ? "bg-amber-900/30 border-amber-700/40 text-amber-400 hover:bg-amber-900/50"
                          : "bg-emerald-900/30 border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/50"
                      }`}
                    >
                      {record.isActive ? (
                        <><ToggleRight className="w-3 h-3" /> Deactivate</>
                      ) : (
                        <><ToggleLeft className="w-3 h-3" /> Reactivate</>
                      )}
                    </button>

                    {/* Purge */}
                    <button
                      onClick={() => handlePurge(record)}
                      title="Permanently delete record"
                      className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-950/70 hover:border-red-700/60 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                      Purge
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer row count */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/30 flex items-center justify-between text-[10px] text-neutral-600">
            <span>{filtered.length} record(s) shown</span>
            <span>{records.length} total in directory</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Edit Modal
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog.Root open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[150] bg-neutral-950/80 backdrop-blur-md" />
          <Dialog.Content
            className="fixed z-[160] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-0 overflow-hidden focus:outline-none"
            aria-describedby="edit-dialog-description"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                  <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <Dialog.Title className="text-sm font-bold text-white">
                  Edit Profile
                </Dialog.Title>
              </div>
              <Dialog.Close className="w-7 h-7 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 transition">
                <X className="w-3.5 h-3.5" />
              </Dialog.Close>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4" id="edit-dialog-description">
              {editTarget && (
                <p className="text-[11px] text-neutral-500 font-mono truncate">
                  ID: {editTarget.id} · {editTarget.type === "STAFF" ? "Staff Account" : "Patient Account"}
                </p>
              )}

              {/* Name field */}
              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
                  placeholder="e.g., Abebe Girma"
                />
              </div>

              {/* Email field */}
              <div className="space-y-1.5">
                <label htmlFor="edit-email" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Email Address *
                </label>
                <input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
                  placeholder="example@facility.et"
                />
              </div>

              {/* Phone field — patients only */}
              {editTarget?.type === "PATIENT" && (
                <div className="space-y-1.5">
                  <label htmlFor="edit-phone" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Phone Number <span className="text-neutral-600 normal-case">(E.164)</span>
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
                    placeholder="+251911223344 or 0911223344"
                  />
                  <p className="text-[10px] text-neutral-600">
                    Accepts Ethiopian formats: 09XXXXXXXX, 07XXXXXXXX, or international +251XXXXXXXXX
                  </p>
                </div>
              )}

              {/* Inline error */}
              {editError && (
                <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                  {editError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-neutral-800 bg-neutral-900/50">
              <Dialog.Close className="px-4 py-2 text-xs font-bold bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-xl hover:border-neutral-600 transition">
                Cancel
              </Dialog.Close>
              <button
                id="edit-save-btn"
                onClick={submitEdit}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition disabled:opacity-60"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══════════════════════════════════════════════════════════════════
          Clinical Dependency Blocked Modal
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog.Root
        open={blockedModal.open}
        onOpenChange={(open) => setBlockedModal((b) => ({ ...b, open }))}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[150] bg-neutral-950/80 backdrop-blur-md" />
          <Dialog.Content
            className="fixed z-[160] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-neutral-900 border border-amber-700/40 rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
            aria-describedby="blocked-dialog-description"
          >
            {/* Amber header stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-500" />

            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <Dialog.Title className="text-sm font-black text-amber-200 mb-1">
                    Deletion Blocked — Active Clinical Dependencies
                  </Dialog.Title>
                  <Dialog.Description id="blocked-dialog-description" className="text-xs text-neutral-400 leading-relaxed">
                    {blockedModal.message}
                  </Dialog.Description>
                </div>
              </div>

              {/* Suggestion box */}
              <div className="mt-5 bg-amber-950/30 border border-amber-700/30 rounded-xl p-4 space-y-2">
                <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Recommended Action
                </p>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Use the <span className="font-bold text-amber-300">Deactivate Profile</span> button instead. This will immediately block the user from logging in while preserving all linked medical records and audit trails as required by healthcare data retention policies.
                </p>
              </div>

              <div className="flex justify-end mt-5">
                <Dialog.Close className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-xl transition">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Understood — I&apos;ll Deactivate Instead
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══════════════════════════════════════════════════════════════════
          Onboard Staff Modal
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog.Root open={isOnboardOpen} onOpenChange={(open) => { if (!open) { setIsOnboardOpen(false); setOnboardError(null); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[150] bg-neutral-950/80 backdrop-blur-md" />
          <Dialog.Content
            className="fixed z-[160] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-0 overflow-hidden focus:outline-none"
            aria-describedby="onboard-dialog-description"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                  <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <Dialog.Title className="text-sm font-bold text-white">
                  Onboard Staff Member
                </Dialog.Title>
              </div>
              <Dialog.Close className="w-7 h-7 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:border-neutral-600 transition">
                <X className="w-3.5 h-3.5" />
              </Dialog.Close>
            </div>

            <div className="px-6 py-5 space-y-4" id="onboard-dialog-description">
              <p className="text-[11px] text-neutral-500">
                Register a new clinical professional at this facility. An activation code will be automatically generated.
              </p>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="onboard-name" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  id="onboard-name"
                  type="text"
                  value={onboardForm.fullName}
                  onChange={(e) => setOnboardForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
                  placeholder="e.g., Dr. Abebe Kebede"
                  required
                />
              </div>

              {/* License Number */}
              <div className="space-y-1.5">
                <label htmlFor="onboard-license" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Professional License Number *
                </label>
                <input
                  id="onboard-license"
                  type="text"
                  value={onboardForm.licenseNumber}
                  onChange={(e) => setOnboardForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
                  placeholder="e.g., MD-4852-ETH"
                  required
                />
              </div>

              {/* Healthcare Role */}
              <div className="space-y-1.5">
                <label htmlFor="onboard-role" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Healthcare Role *
                </label>
                <select
                  id="onboard-role"
                  value={onboardForm.role}
                  onChange={(e) => setOnboardForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-neutral-800 border border-neutral-700 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition"
                  style={{ backgroundColor: "#1f2937" }}
                  required
                >
                  <option value="" disabled>Select a role...</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="LAB_TECH">Lab Technician</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              {/* Inline Error */}
              {onboardError && (
                <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                  {onboardError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-neutral-800 bg-neutral-900/50">
              <Dialog.Close className="px-4 py-2 text-xs font-bold bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-xl hover:border-neutral-600 transition">
                Cancel
              </Dialog.Close>
              <button
                onClick={submitOnboard}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition disabled:opacity-60"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Onboard Staff
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ══════════════════════════════════════════════════════════════════
          Success Activation Code Modal
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog.Root open={!!successModal?.open} onOpenChange={(open) => { if (!open) setSuccessModal(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[150] bg-neutral-950/80 backdrop-blur-md" />
          <Dialog.Content
            className="fixed z-[160] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-neutral-900 border border-emerald-500/30 rounded-2xl shadow-2xl p-0 overflow-hidden focus:outline-none"
            aria-describedby="success-dialog-description"
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />

            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="text-sm font-black text-emerald-200 mb-1">
                    Staff Onboarded Successfully
                  </Dialog.Title>
                  <div id="success-dialog-description" className="space-y-2">
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      An account has been created for <span className="font-bold text-white">{successModal?.name}</span> (License: <span className="font-semibold text-neutral-200">{successModal?.license}</span>).
                    </p>
                    
                    <div className="bg-neutral-950 border border-neutral-800 rounded-xl px-5 py-4 text-center my-4">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Temporary Activation Code</p>
                      <p className="text-3xl font-black text-emerald-400 font-mono tracking-widest">{successModal?.code}</p>
                    </div>

                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-300 leading-relaxed">
                      <p className="font-bold uppercase tracking-wider text-[9px] mb-1">Important Action Required</p>
                      Please physically provide this 6-character code to the new staff member. They must use this code as their initial password during their first sign-in attempt, where they will be prompted to set their permanent personal password.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-5">
                <Dialog.Close className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition">
                  Done
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
