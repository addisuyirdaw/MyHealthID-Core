"use client";

import { useState, useTransition } from "react";
import { Shield, ShieldOff, Clock, User, Building2, Tag, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface AccessLog {
  id: string;
  accessedByName: string;
  facility: string;
  role: string;
  action: string;
  createdAt: string;
}

interface PrivacyDashboardClientProps {
  patientId: string;
  patientName: string;
  isRestricted: boolean;
  initialLogs: AccessLog[];
}

const ACTION_COLORS: Record<string, string> = {
  VIEW: "bg-blue-100 text-blue-700",
  BREAK_GLASS: "bg-red-100 text-red-700",
  RESTRICT: "bg-amber-100 text-amber-800",
  UNRESTRICT: "bg-emerald-100 text-emerald-700",
};

export default function PrivacyDashboardClient({
  patientId,
  patientName,
  isRestricted: initialRestricted,
  initialLogs,
}: PrivacyDashboardClientProps) {
  const [isRestricted, setIsRestricted] = useState(initialRestricted);
  const [logs, setLogs] = useState<AccessLog[]>(initialLogs);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggle = async () => {
    const next = !isRestricted;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}/restrict`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRestricted: next }),
        });
        const data = await res.json();
        if (data.success) {
          setIsRestricted(next);
          // Refresh logs
          const logRes = await fetch(`/api/patients/${patientId}/access-logs`);
          const logData = await logRes.json();
          if (logData.success) setLogs(logData.logs);
          showToast(next ? "Access restricted. Doctors must request override." : "Access opened. Doctors can view your records.");
        }
      } catch (err: any) {
        showToast("Failed to update privacy setting. Try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6">

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-7 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <span className="text-blue-200 text-sm font-bold uppercase tracking-widest">Data Sovereignty</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-1">Privacy & Data Control</h1>
            <p className="text-blue-100">ግላዊነት እና የዳታ ቁጥጥር</p>
            <p className="text-blue-200 text-sm mt-2">
              Welcome, <span className="font-bold text-white">{patientName}</span>. You own your health data.
            </p>
          </div>
        </div>

        {/* Restriction Toggle Card */}
        <div className={`rounded-3xl shadow-lg border-2 p-7 transition-all duration-300 ${
          isRestricted
            ? "bg-red-50 border-red-200"
            : "bg-emerald-50 border-emerald-200"
        }`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isRestricted ? "bg-red-100" : "bg-emerald-100"}`}>
                {isRestricted
                  ? <ShieldOff className="w-8 h-8 text-red-600" />
                  : <Shield className="w-8 h-8 text-emerald-600" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-black text-slate-900">
                    {isRestricted ? "Access Restricted" : "Access Open"}
                  </h2>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    isRestricted ? "bg-red-200 text-red-800" : "bg-emerald-200 text-emerald-800"
                  }`}>
                    {isRestricted ? "Restricted" : "Open"}
                  </span>
                </div>
                <p className="text-slate-500 text-sm font-medium">
                  {isRestricted
                    ? "Doctors must request an Emergency Override to view your records."
                    : "Healthcare professionals can view your clinical records."}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {isRestricted ? "መረጃን መገደብ ነቅቷል" : "መዳረሻ ፍቀድ ነቅቷል"}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={handleToggle}
              disabled={isPending}
              className={`relative w-16 h-9 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 shadow-inner ${
                isRestricted
                  ? "bg-red-500 focus:ring-red-200"
                  : "bg-emerald-500 focus:ring-emerald-200"
              } disabled:opacity-60`}
              aria-label="Toggle restriction"
            >
              <div className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${
                isRestricted ? "left-8" : "left-1"
              }`}>
                {isPending
                  ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  : isRestricted
                    ? <ShieldOff className="w-3.5 h-3.5 text-red-500" />
                    : <Shield className="w-3.5 h-3.5 text-emerald-500" />
                }
              </div>
            </button>
          </div>

          {isRestricted && (
            <div className="mt-5 bg-red-100 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">
                <span className="font-bold">Restriction Active:</span> Any doctor who needs access must activate the 
                Emergency Break-Glass protocol. This will be permanently recorded in your audit log below.
              </p>
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-6 h-6 text-slate-500" />
              Access Audit Log
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              የመዳረሻ ምርመራ መዝገብ — Every access to your record is logged here permanently.
            </p>
          </div>

          {logs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              <Shield className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              No access events recorded yet. / እስካሁን ምንም የመዳረሻ ክስተቶች አልተመዘገቡም።
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Professional</span>
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Facility</span>
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Action</span>
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Timestamp</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{log.accessedByName}</p>
                        <p className="text-xs text-slate-400">{log.role}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{log.facility}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-600"}`}>
                          {log.action === "BREAK_GLASS" ? "🚨 BREAK_GLASS" : log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
