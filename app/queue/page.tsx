"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getPatientQueueStatus } from "@/lib/actions/patient.actions";
import {
  Search, Clock, CheckCircle2, AlertTriangle,
  HeartPulse, Activity, Loader2, ChevronRight,
} from "lucide-react";

function QueuePageInner() {
  const searchParams = useSearchParams();
  const tokenParam  = searchParams.get("token");
  const nameParam   = searchParams.get("name");

  const [identifier,   setIdentifier]   = useState("");
  const [loading,      setLoading]      = useState(false);
  const [status,       setStatus]       = useState<any>(null);
  const [error,        setError]        = useState("");
  const [showWelcome,  setShowWelcome]  = useState(Boolean(tokenParam));
  const [currentTime,  setCurrentTime]  = useState(new Date());

  // Animate the token number counting up
  const [displayToken, setDisplayToken] = useState(0);
  const targetToken = parseInt(tokenParam ?? "0", 10);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!showWelcome || !targetToken) return;
    let current = 0;
    const step = Math.max(1, Math.floor(targetToken / 20));
    const interval = setInterval(() => {
      current = Math.min(current + step, targetToken);
      setDisplayToken(current);
      if (current >= targetToken) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [showWelcome, targetToken]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus(null);
    try {
      const res = await getPatientQueueStatus(identifier.trim());
      if (!res) {
        setError("Patient not found. Please check your ID or Phone Number.");
      } else {
        setStatus(res);
        setShowWelcome(false);
      }
    } catch {
      setError("Failed to fetch queue status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const triageColor = (t: string) =>
    t === "RED"    ? { bg: "bg-red-950/50",    border: "border-red-500/40",    text: "text-red-300",    label: "Emergency" } :
    t === "YELLOW" ? { bg: "bg-amber-950/50",  border: "border-amber-500/40",  text: "text-amber-300",  label: "Urgent" } :
                     { bg: "bg-emerald-950/50", border: "border-emerald-500/40",text: "text-emerald-300",label: "Routine" };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex flex-col">

      {/* ── HEADER BAR ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-neutral-900/80 border-b border-neutral-800 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
            <HeartPulse className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">MyHealthID</span>
          <span className="text-neutral-600">·</span>
          <span className="text-xs text-neutral-500">Smart Queue</span>
        </div>
        <div className="text-sm font-mono text-neutral-500 tabular-nums">
          {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </header>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">

        {/* ══ WELCOME CARD — shown right after registration ══ */}
        {showWelcome && tokenParam && (
          <div className="w-full max-w-sm">
            <div className="relative rounded-3xl overflow-hidden border border-blue-500/30 bg-gradient-to-br from-blue-950/80 to-neutral-900/90 backdrop-blur-xl shadow-2xl shadow-blue-900/30 p-8 text-center">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5 pointer-events-none" />

              {/* Verified badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified & Registered
              </div>

              {nameParam && (
                <>
                  <p className="text-neutral-400 text-sm mb-1">Welcome,</p>
                  <h2 className="text-2xl font-bold text-white mb-7 truncate">
                    {decodeURIComponent(nameParam)}
                  </h2>
                </>
              )}

              <p className="text-neutral-500 text-[10px] uppercase tracking-widest font-semibold mb-3">
                Your Queue Number
              </p>

              {/* Animated token ring */}
              <div className="relative mx-auto w-40 h-40 flex items-center justify-center mb-5">
                <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: "2.5s" }} />
                <div className="absolute inset-0 rounded-full bg-blue-500/5 ring-2 ring-blue-500/30" />
                <div className="absolute inset-2 rounded-full bg-blue-600/10 ring-1 ring-blue-500/20" />
                <span className="relative text-7xl font-black text-white tabular-nums">
                  #{displayToken || targetToken}
                </span>
              </div>

              {/* Wait time */}
              <div className="flex items-center justify-center gap-2 text-neutral-400 text-sm mb-5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Est. wait: ~<span className="text-amber-300 font-semibold">{targetToken * 15} mins</span></span>
              </div>

              <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
                Please wait in the waiting area. A staff member will call your name when it is your turn.
              </p>

              <button
                onClick={() => setShowWelcome(false)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto transition-colors"
              >
                Check a different ID <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ══ LOOKUP FORM ══ */}
        <div className="w-full max-w-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-7 shadow-2xl">
            {!showWelcome && (
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 mb-3">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className="text-xl font-black text-white">Check Queue Status</h1>
                <p className="text-xs text-neutral-500 mt-1">Enter your ID to see your live position</p>
              </div>
            )}

            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">
                  National ID · Health ID · Phone
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    autoFocus={!showWelcome}
                    className="w-full bg-neutral-950 border border-neutral-700 text-white text-sm rounded-xl pl-10 pr-4 py-3.5 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-neutral-600"
                    placeholder="e.g. MHI-XXXX or 09..."
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl px-4 py-3 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !identifier}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-blue-900/30"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
                ) : (
                  <><Search className="w-4 h-4" /> Check My Status</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ══ STATUS RESULT ══ */}
        {status && !showWelcome && (
          <div className="w-full max-w-sm space-y-3">
            {/* Position */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">Your Position</p>
              <p className="text-8xl font-black text-white tabular-nums">#{status.queuePosition}</p>
            </div>

            {/* Wait + Phase */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">Est. Wait</p>
                <p className="text-3xl font-bold text-amber-400 tabular-nums">
                  {status.estimatedWait}<span className="text-base font-normal text-neutral-500 ml-1">min</span>
                </p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">Phase</p>
                <p className="text-sm font-bold text-white leading-tight">{status.status}</p>
              </div>
            </div>

            {/* Triage badge */}
            {status.lastScreeningTriage && (() => {
              const tc = triageColor(status.lastScreeningTriage);
              return (
                <div className={`rounded-2xl border px-5 py-4 text-center ${tc.bg} ${tc.border}`}>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">Screening Priority</p>
                  <p className={`text-lg font-black ${tc.text}`}>{tc.label}</p>
                  {status.lastScreeningType && (
                    <p className="text-[10px] text-neutral-500 mt-1">{status.lastScreeningType}</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-3 text-center text-[10px] text-neutral-700 border-t border-neutral-900">
        MyHealthID National Health Information System · Powered by AI Triage
      </footer>
    </div>
  );
}

export default function PatientQueuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading queue…</span>
        </div>
      </div>
    }>
      <QueuePageInner />
    </Suspense>
  );
}
