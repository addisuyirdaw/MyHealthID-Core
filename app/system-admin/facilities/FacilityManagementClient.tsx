"use client";

import { useState, useTransition } from "react";
import {
  createFacility,
  deleteFacility,
  toggleFacilityActive,
} from "@/lib/actions/system-admin.actions";
import {
  Building2, Plus, Trash2, ToggleLeft, ToggleRight,
  X, Loader2, AlertTriangle, CheckCircle, MapPin,
  Shield,
} from "lucide-react";

type Facility = {
  id: string;
  name: string;
  code: string;
  registrationId: string;
  ownershipType: string;
  serviceType: string;
  region: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  _count: { patients: number; users: number };
};

const SERVICE_TYPES = [
  "HEALTH_POST", "HEALTH_CENTER", "PRIMARY_HOSPITAL",
  "GENERAL_HOSPITAL", "SPECIALIZED_HOSPITAL", "REFERRAL_HOSPITAL",
  "PRIMARY_CLINIC", "SPECIALTY_CLINIC",
];

const OWNERSHIP_TYPES = ["PUBLIC", "PRIVATE"];

const SERVICE_LABELS: Record<string, string> = {
  HEALTH_POST: "Health Post",
  HEALTH_CENTER: "Health Center",
  PRIMARY_HOSPITAL: "Primary Hospital",
  GENERAL_HOSPITAL: "General Hospital",
  SPECIALIZED_HOSPITAL: "Specialized Hospital",
  REFERRAL_HOSPITAL: "Referral Hospital",
  PRIMARY_CLINIC: "Primary Clinic",
  SPECIALTY_CLINIC: "Specialty Clinic",
};

type Toast = { type: "success" | "error"; message: string };

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-sm
      ${toast.type === "success"
        ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300"
        : "bg-red-950/90 border-red-500/40 text-red-300"}`}>
      {toast.type === "success"
        ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
        : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function CreateFacilityModal({ onClose, onCreated }: { onClose: () => void; onCreated: (f: Facility) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", nameAm: "", code: "", registrationId: "",
    ownershipType: "PUBLIC", serviceType: "GENERAL_HOSPITAL",
    region: "", zone: "", woreda: "", email: "", phone: "", website: "",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createFacility(form);
      if (!res.success) { setError(res.error ?? "Unknown error"); return; }
      onCreated({ ...form, id: res.facilityId!, isVerified: false, createdAt: new Date().toISOString(), _count: { patients: 0, users: 0 } } as any);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700/60 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900 rounded-t-2xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" /> Add Facility
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Required fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-neutral-400 mb-1.5 block">Facility Name (English) *</label>
              <input required value={form.name} onChange={e => set("name", e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                placeholder="e.g. Addis Ababa General Hospital" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-neutral-400 mb-1.5 block">Facility Name (Amharic)</label>
              <input value={form.nameAm} onChange={e => set("nameAm", e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                placeholder="ለምሳሌ፡ አዲስ አበባ አጠቃላይ ሆስፒታል" />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-400 mb-1.5 block">Facility Code *</label>
              <input required value={form.code} onChange={e => set("code", e.target.value.toUpperCase())}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition font-mono"
                placeholder="e.g. AAGH01" />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-400 mb-1.5 block">Registration ID *</label>
              <input required value={form.registrationId} onChange={e => set("registrationId", e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                placeholder="MOH-2024-0001" />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-400 mb-1.5 block">Ownership Type *</label>
              <select required value={form.ownershipType} onChange={e => set("ownershipType", e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition">
                {OWNERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-400 mb-1.5 block">Service Type *</label>
              <select required value={form.serviceType} onChange={e => set("serviceType", e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition">
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{SERVICE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Location</p>
            <div className="grid grid-cols-3 gap-2">
              {["region", "zone", "woreda"].map(f => (
                <div key={f}>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block capitalize">{f}</label>
                  <input value={(form as any)[f]} onChange={e => set(f, e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                    placeholder={`Enter ${f}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Contact (optional)</p>
            <div className="grid grid-cols-1 gap-2">
              {["email", "phone", "website"].map(f => (
                <div key={f}>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block capitalize">{f}</label>
                  <input value={(form as any)[f]} onChange={e => set(f, e.target.value)}
                    type={f === "email" ? "email" : "text"}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                    placeholder={f === "email" ? "info@hospital.gov.et" : f === "phone" ? "+251..." : "https://"} />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 text-sm font-semibold text-neutral-400 hover:text-white hover:border-neutral-600 transition">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Facility"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  facility, onClose, onDeleted,
}: { facility: Facility; onClose: () => void; onDeleted: (id: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteFacility(facility.id);
      if (!res.success) { setError(res.error ?? "Delete failed"); return; }
      onDeleted(facility.id);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Facility</h3>
              <p className="text-xs text-neutral-400">This action is irreversible</p>
            </div>
          </div>
          <p className="text-sm text-neutral-300 mb-1">
            Are you sure you want to permanently delete{" "}
            <span className="font-bold text-white">{facility.name}</span>?
          </p>
          <div className="flex items-center gap-4 mt-3 p-3 bg-neutral-800/50 rounded-xl text-xs text-neutral-400">
            <span>👥 {facility._count.users} staff</span>
            <span>🏥 {facility._count.patients} patients</span>
          </div>
          {facility._count.patients > 0 ? (
            <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Cannot delete — this facility has {facility._count.patients} patient record(s). Deactivate it instead.
            </div>
          ) : facility._count.users > 0 ? (
            <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {facility._count.users} staff account{facility._count.users !== 1 ? "s" : ""} will be permanently removed along with this facility.
            </div>
          ) : null}
          {error && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6 pt-4">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 text-sm font-semibold text-neutral-400 hover:text-white transition">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={isPending || facility._count.patients > 0}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FacilityManagementClient({ initialFacilities }: { initialFacilities: Facility[] }) {
  const [facilities, setFacilities] = useState<Facility[]>(initialFacilities);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggle = (facility: Facility) => {
    startTransition(async () => {
      const res = await toggleFacilityActive(facility.id, !facility.isActive);
      if (!res.success) { showToast("error", res.error ?? "Failed"); return; }
      setFacilities(prev => prev.map(f => f.id === facility.id ? { ...f, isActive: !f.isActive } : f));
      showToast("success", `Facility ${!facility.isActive ? "activated" : "deactivated"}.`);
    });
  };

  const filtered = facilities.filter(f =>
    !search.trim() ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.code.toLowerCase().includes(search.toLowerCase()) ||
    f.region?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
      {showCreate && (
        <CreateFacilityModal
          onClose={() => setShowCreate(false)}
          onCreated={(f) => { setFacilities(prev => [f, ...prev]); showToast("success", `"${f.name}" created.`); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          facility={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(id) => { setFacilities(prev => prev.filter(f => f.id !== id)); showToast("success", "Facility deleted."); }}
        />
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search facilities..."
          className="flex-1 min-w-[200px] bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition shadow-lg shadow-emerald-900/30"
        >
          <Plus className="w-4 h-4" /> Add Facility
        </button>
      </div>

      {/* Table */}
      <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/60">
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Facility</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest hidden md:table-cell">Type</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest hidden lg:table-cell">Region</th>
              <th className="text-center px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest hidden sm:table-cell">Staff / Patients</th>
              <th className="text-center px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Status</th>
              <th className="text-right px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/30">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-neutral-500 text-sm py-12">No facilities found.</td></tr>
            )}
            {filtered.map((f) => (
              <tr key={f.id} className="hover:bg-neutral-800/20 transition group">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{f.name}</p>
                      <p className="text-[10px] text-neutral-500 font-mono">{f.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <span className="text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    {SERVICE_LABELS[f.serviceType] ?? f.serviceType.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-5 py-3.5 hidden lg:table-cell">
                  {f.region ? (
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {f.region}
                    </span>
                  ) : <span className="text-neutral-600 text-xs">—</span>}
                </td>
                <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                  <span className="text-xs text-neutral-400">
                    {f._count.users} / {f._count.patients}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${f.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-neutral-800 text-neutral-500 border-neutral-700"}`}>
                    {f.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => handleToggle(f)}
                      title={f.isActive ? "Deactivate" : "Activate"}
                      className={`p-1.5 rounded-lg transition ${f.isActive ? "text-neutral-500 hover:text-amber-400 hover:bg-amber-500/10" : "text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10"}`}
                    >
                      {f.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    {f.isVerified && (
                      <span title="Verified">
                        <Shield className="w-3.5 h-3.5 text-emerald-500 mx-1" />
                      </span>
                    )}
                    <button
                      onClick={() => setDeleteTarget(f)}
                      title="Delete facility"
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
