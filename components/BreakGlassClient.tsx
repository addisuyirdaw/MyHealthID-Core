"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";

interface BreakGlassClientProps {
  patientId: string;
  patientName: string;
  doctorName?: string;
}

export default function BreakGlassClient({ patientId, patientName, doctorName = "Dr. Dawit Tadesse" }: BreakGlassClientProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "granted">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleOverride = async () => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/break-glass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessedByName: doctorName,
          facility: "Debre Berhan Hospital",
          role: "DOCTOR",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("granted");
        // Reload the page after a short delay to show unlocked data
        setTimeout(() => {
          window.location.search = `?override=1&t=${Date.now()}`;
        }, 1800);
      } else {
        throw new Error(data.error || "Override failed");
      }
    } catch (err: any) {
      setError(err.message);
      setStatus("idle");
    }
  };

  if (status === "granted") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-emerald-200 p-10 flex flex-col items-center text-center gap-5">
          <div className="bg-emerald-100 p-5 rounded-full">
            <ShieldCheck className="w-14 h-14 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Emergency Override Activated</h2>
          <p className="text-emerald-700 font-bold text-lg">አስቸኳይ ልዩ ፈቃድ ተሰጥቷል</p>
          <p className="text-slate-500 text-sm">
            This event has been permanently logged in the patient's audit trail. You are now being redirected to the full clinical record.
          </p>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-red-200 overflow-hidden">
        {/* Red header bar */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 p-8 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-full">
              <ShieldAlert className="w-14 h-14 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Access Restricted by Patient</h1>
          <p className="text-red-100 mt-1 font-semibold text-lg">በታካሚ የተገደበ መዳረሻ</p>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col gap-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-red-900 font-bold text-base">Patient: {patientName}</p>
            <p className="text-red-700 text-sm mt-1">
              This patient has exercised their <span className="font-bold">data sovereignty right</span> and restricted access to their clinical records. 
              This is protected under the Estonian X-Road privacy model implemented in MyHealthID.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-amber-800 text-sm font-bold mb-1">⚠ Emergency Break-Glass Protocol</p>
            <p className="text-amber-700 text-sm">
              Activating the override will <span className="font-bold">permanently log</span> your name, role, facility, and timestamp in the patient's immutable audit trail. The patient will be notified.
            </p>
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            onClick={handleOverride}
            disabled={status === "loading"}
            className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-base transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {status === "loading" ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Activating Override...</>
            ) : (
              <><ShieldAlert className="w-5 h-5" /> Request Emergency Override / አስቸኳይ ልዩ ፈቃድ ይጠይቁ</>
            )}
          </button>

          <p className="text-center text-slate-400 text-xs">
            This action is monitored and audited in compliance with the MyHealthID Data Sovereignty Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
