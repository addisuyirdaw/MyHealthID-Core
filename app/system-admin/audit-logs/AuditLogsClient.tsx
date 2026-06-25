"use client";

import { useState } from "react";
import {
  ClipboardList, Search, X, ShieldAlert, Calendar,
  Terminal, ShieldCheck, Eye, HelpCircle, Network
} from "lucide-react";

type AuditLog = {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  CREATE_FACILITY: "Create Facility",
  DELETE_FACILITY: "Delete Facility",
  ACTIVATE_FACILITY: "Activate Facility",
  DEACTIVATE_FACILITY: "Deactivate Facility",
  RESET_PASSWORD: "Reset Password",
  ACTIVATE_USER: "Activate User",
  DEACTIVATE_USER: "Deactivate User",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_FACILITY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DELETE_FACILITY: "bg-red-500/10 text-red-400 border-red-500/20",
  ACTIVATE_FACILITY: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  DEACTIVATE_FACILITY: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  RESET_PASSWORD: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  ACTIVATE_USER: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  DEACTIVATE_USER: "bg-red-500/10 text-red-400 border-red-500/20",
};

function MetadataModal({
  log,
  onClose
}: {
  log: AuditLog;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            Audit Event Metadata
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-neutral-500 font-semibold mb-1">Actor</p>
              <p className="text-white font-medium">{log.actorName}</p>
              <p className="text-neutral-400 font-mono text-[10px]">{log.actorRole}</p>
            </div>
            <div>
              <p className="text-neutral-500 font-semibold mb-1">IP Address</p>
              <p className="text-white font-mono flex items-center gap-1">
                <Network className="w-3 h-3 text-neutral-400" /> {log.ipAddress ?? "unknown"}
              </p>
            </div>
            <div>
              <p className="text-neutral-500 font-semibold mb-1">Target Type & ID</p>
              <p className="text-white font-medium">{log.targetType}</p>
              <p className="text-neutral-400 font-mono text-[10px] break-all">{log.targetId}</p>
            </div>
            <div>
              <p className="text-neutral-500 font-semibold mb-1">Timestamp</p>
              <p className="text-white font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-neutral-400" /> {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-neutral-500 font-semibold mb-2">Raw Metadata (JSON)</p>
            <pre className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[250px] leading-relaxed">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuditLogsClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [logs] = useState<AuditLog[]>(initialLogs);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [search, setSearch] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  // Unique actions for filters
  const actionOptions = Array.from(new Set(logs.map(l => l.action)));

  const filtered = logs.filter(l => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      l.actorName.toLowerCase().includes(q) ||
      (l.targetName ?? "").toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.targetId.toLowerCase().includes(q);

    const matchesTargetType = targetTypeFilter === "ALL" || l.targetType === targetTypeFilter;
    const matchesAction = actionFilter === "ALL" || l.action === actionFilter;

    return matchesSearch && matchesTargetType && matchesAction;
  });

  return (
    <>
      {selectedLog && (
        <MetadataModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs by actor, target name, action..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>
        <div className="w-[160px] shrink-0">
          <select
            value={targetTypeFilter}
            onChange={e => setTargetTypeFilter(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition"
          >
            <option value="ALL">All Target Types</option>
            <option value="FACILITY">Facility</option>
            <option value="USER">User</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>
        <div className="w-[180px] shrink-0">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition"
          >
            <option value="ALL">All Actions</option>
            {actionOptions.map(action => (
              <option key={action} value={action}>
                {ACTION_LABELS[action] ?? action.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-neutral-900/50 border border-neutral-800/60 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800/60">
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Timestamp</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Actor</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Action</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Target Name / ID</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest hidden md:table-cell">IP Address</th>
              <th className="text-right px-5 py-3 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/30">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-neutral-500 text-sm py-12">
                  No audit logs found matching filters.
                </td>
              </tr>
            )}
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-neutral-800/20 transition group">
                <td className="px-5 py-3.5 text-xs text-neutral-400 font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-3.5">
                  <div>
                    <p className="font-semibold text-white text-xs">{log.actorName}</p>
                    <p className="text-[9px] text-rose-400/80 font-mono tracking-wider">{log.actorRole}</p>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ACTION_COLORS[log.action] ?? "bg-neutral-800 text-neutral-400 border-neutral-700"}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-neutral-200">
                  <div>
                    <span className="font-semibold text-white">{log.targetName ?? "—"}</span>
                    <span className="block text-[9px] text-neutral-500 font-mono tracking-tighter truncate max-w-[200px]">
                      {log.targetType}: {log.targetId}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-neutral-500 font-mono hidden md:table-cell">
                  {log.ipAddress ?? "unknown"}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="p-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white transition inline-flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View JSON</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
