"use client";

import { useState, useTransition } from "react";
import {
  resetUserPasswordSysAdmin,
  toggleUserActiveSysAdmin,
} from "@/lib/actions/system-admin.actions";
import {
  Users, Key, ToggleLeft, ToggleRight,
  X, Loader2, AlertTriangle, CheckCircle, Copy, Shield,
  Search, ShieldAlert, Check
} from "lucide-react";
import { HEALTHCARE_ROLES } from "@/lib/locales/enums";

type User = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  fullName: string | null;
  isActive: boolean;
  isTempPassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  organizationId: string | null;
  organization: { name: string } | null;
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

function ResetPasswordModal({
  user,
  onClose,
  onResetSuccess
}: {
  user: User;
  onClose: () => void;
  onResetSuccess: (code: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setError(null);
    startTransition(async () => {
      const res = await resetUserPasswordSysAdmin(user.id);
      if (!res.success) {
        setError(res.error ?? "Failed to reset password.");
        return;
      }
      onResetSuccess(res.code!);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700/60 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Key className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reset User Password</h3>
              <p className="text-xs text-neutral-400">Force temporary password reset</p>
            </div>
          </div>
          <p className="text-sm text-neutral-300 mb-2">
            Are you sure you want to reset the password for{" "}
            <span className="font-bold text-white">
              {(user.fullName ?? `${user.firstName} ${user.lastName}`.trim()) || user.email}
            </span>?
          </p>
          <p className="text-xs text-neutral-500 leading-relaxed mb-4">
            This will generate a temporary numeric/alphabetical code. The user will be required to change their password upon their next sign-in.
          </p>
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
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
          <button onClick={handleReset} disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition disabled:opacity-60 flex items-center justify-center gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : "Generate Temp Code"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShowTempCodeModal({
  user,
  tempCode,
  onClose
}: {
  user: User;
  tempCode: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = (user.fullName ?? `${user.firstName} ${user.lastName}`.trim()) || user.email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-emerald-500/30 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Temporary Password Generated</h3>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto mb-4">
            A temporary code has been set for <span className="text-neutral-200 font-semibold">{displayName}</span>.
          </p>

          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <span className="text-2xl font-mono font-black text-emerald-400 tracking-wider select-all mx-auto pl-6">
              {tempCode}
            </span>
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition shrink-0"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-left text-amber-400 mb-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Security Warning:</strong> This code will only be displayed once. Copy it now and share it securely with the user. They will be forced to choose a new password when they sign in with this code.
            </p>
          </div>
        </div>
        <div className="px-6 pb-6 pt-2">
          <button onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold transition">
            Close & Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserManagementClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeTargetUser, setCodeTargetUser] = useState<User | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [, startTransition] = useTransition();

  const showToast = (type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleActive = (user: User) => {
    startTransition(async () => {
      const res = await toggleUserActiveSysAdmin(user.id, !user.isActive);
      if (!res.success) {
        showToast("error", res.error ?? "Failed to toggle status");
        return;
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      showToast("success", `User account ${!user.isActive ? "activated" : "deactivated"}.`);
    });
  };

  const handleResetSuccess = (code: string) => {
    setCodeTargetUser(resetTarget);
    setGeneratedCode(code);
    setResetTarget(null);
    showToast("success", "Temporary reset code generated successfully.");
  };

  // Filter logic
  const filtered = users.filter(u => {
    const query = search.toLowerCase().trim();
    const displayName = (u.fullName ?? `${u.firstName} ${u.lastName}`).toLowerCase();
    const email = u.email.toLowerCase();
    const facilityName = u.organization?.name.toLowerCase() ?? "";

    const matchesSearch = !query ||
      displayName.includes(query) ||
      email.includes(query) ||
      facilityName.includes(query);

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: string) => {
    return (HEALTHCARE_ROLES as any)[role]?.en ?? role.replace(/_/g, " ");
  };

  return (
    <>
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onResetSuccess={handleResetSuccess}
        />
      )}

      {generatedCode && codeTargetUser && (
        <ShowTempCodeModal
          user={codeTargetUser}
          tempCode={generatedCode}
          onClose={() => {
            setGeneratedCode(null);
            setCodeTargetUser(null);
          }}
        />
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users by name, email, or facility..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
        <div className="w-[180px] shrink-0">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition"
          >
            <option value="ALL">All Roles</option>
            {Object.keys(HEALTHCARE_ROLES).map(roleKey => (
              <option key={roleKey} value={roleKey}>
                {getRoleLabel(roleKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/60">
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">User Details</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest hidden md:table-cell">Role</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest hidden lg:table-cell">Facility</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest hidden sm:table-cell">Last Login</th>
              <th className="text-center px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Status</th>
              <th className="text-right px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/30">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-neutral-500 text-sm py-12">
                  No users found matching filters.
                </td>
              </tr>
            )}
            {filtered.map((u) => {
              const displayName = (u.fullName ?? `${u.firstName} ${u.lastName}`.trim()) || "No Name";
              const isSysAdmin = u.role === "SYSTEM_ADMINISTRATOR";

              return (
                <tr key={u.id} className="hover:bg-neutral-800/20 transition group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                        {isSysAdmin ? (
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Users className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                          {displayName}
                          {u.isTempPassword && (
                            <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded" title="Forced reset code active">
                              RESET_REQ
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                      isSysAdmin
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-neutral-800 text-neutral-300 border-neutral-700"
                    }`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {u.organization ? (
                      <span className="text-xs text-neutral-400 font-semibold">
                        {u.organization.name}
                      </span>
                    ) : isSysAdmin ? (
                      <span className="text-xs text-rose-400/80 font-bold tracking-wider uppercase flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Global Platform
                      </span>
                    ) : (
                      <span className="text-neutral-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-xs text-neutral-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never logged in"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${u.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-neutral-800 text-neutral-500 border-neutral-700"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      {/* Do not allow toggling yourself or other sysadmins easily (or maybe check roles if needed) */}
                      <button
                        onClick={() => handleToggleActive(u)}
                        title={u.isActive ? "Deactivate Account" : "Activate Account"}
                        className={`p-1.5 rounded-lg transition ${u.isActive ? "text-neutral-500 hover:text-amber-400 hover:bg-amber-500/10" : "text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10"}`}
                      >
                        {u.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setResetTarget(u)}
                        title="Force password reset"
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-purple-400 hover:bg-purple-500/10 transition"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
