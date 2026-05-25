"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getPatientQueueStatus } from "@/lib/actions/patient.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function QueuePageInner() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");
  const nameParam = searchParams.get("name");

  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(Boolean(tokenParam));

  // Animate the token number counting up
  const [displayToken, setDisplayToken] = useState(0);
  const targetToken = parseInt(tokenParam ?? "0", 10);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col items-center p-6 font-sans">

      {/* Welcome Hero — shown immediately after registration redirect */}
      {showWelcome && tokenParam && (
        <div className="w-full max-w-md mt-10 mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="relative rounded-3xl overflow-hidden border border-blue-500/30 bg-gradient-to-br from-blue-900/80 to-slate-900/80 backdrop-blur-xl shadow-2xl p-8 text-center">
            {/* Decorative ring */}
            <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 pointer-events-none" />

            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full mb-5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Verified &amp; Registered
            </div>

            {nameParam && (
              <p className="text-slate-300 text-sm mb-1">Welcome,</p>
            )}
            {nameParam && (
              <h2 className="text-2xl font-bold text-white mb-6 truncate">{decodeURIComponent(nameParam)}</h2>
            )}

            <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-2">Your Queue Number</p>
            <div className="relative mx-auto w-36 h-36 flex items-center justify-center mb-4">
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-0 rounded-full bg-blue-600/10 ring-2 ring-blue-500/40" />
              <span className="relative text-6xl font-black text-white tabular-nums">
                #{displayToken || targetToken}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-6">
              <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Est. wait: ~{targetToken * 15} mins
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Please wait in the waiting area. A staff member will call your name when it is your turn.
            </p>

            <button
              onClick={() => setShowWelcome(false)}
              className="text-xs text-blue-400 underline hover:text-blue-300"
            >
              Check a different ID →
            </button>
          </div>
        </div>
      )}

      {/* Standard queue lookup form */}
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur rounded-2xl p-8 shadow-2xl border border-zinc-800">
        <h1 className="text-3xl font-bold text-center mb-2">
          {showWelcome ? "Your Queue Status" : "Smart Queue"}
        </h1>
        <p className="text-zinc-400 text-center mb-8 text-sm">Check your live position and wait time</p>

        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">
              National ID, Health ID or Phone
            </label>
            <Input
              autoFocus={!showWelcome}
              className="w-full bg-black border-zinc-700 text-white text-lg h-14 rounded-xl focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. HID-1234 or 09..."
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <Button
            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-xl"
            type="submit"
            disabled={loading || !identifier}
          >
            {loading ? "Checking..." : "Check Status"}
          </Button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 text-center">
            {error}
          </div>
        )}

        {status && !showWelcome && (
          <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800 text-center shadow-inner">
              <p className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-2">Your Position</p>
              <p className="text-7xl font-black text-white">#{status.queuePosition}</p>
            </div>
            <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800 text-center shadow-inner">
              <p className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-2">Est. Wait Time</p>
              <p className="text-5xl font-bold text-yellow-400">{status.estimatedWait} <span className="text-xl">mins</span></p>
            </div>
            <div className="text-center pt-2 space-y-3">
              <p className="text-zinc-300 text-lg">Phase: <span className="font-semibold text-white">{status.status}</span></p>
              {status.lastScreeningTriage && (
                <div
                  className={`mx-auto max-w-xs rounded-xl border px-4 py-3 text-sm font-semibold ${
                    status.lastScreeningTriage === "RED"
                      ? "bg-rose-950/60 border-rose-500/50 text-rose-100"
                      : status.lastScreeningTriage === "YELLOW"
                        ? "bg-amber-950/50 border-amber-500/40 text-amber-100"
                        : "bg-emerald-950/40 border-emerald-500/40 text-emerald-100"
                  }`}
                >
                  <p className="text-xs uppercase tracking-wider text-zinc-400 mb-1">Screening triage</p>
                  <p className="text-lg">{status.lastScreeningTriage}</p>
                  {status.lastScreeningType && (
                    <p className="text-xs font-normal text-zinc-400 mt-1">{status.lastScreeningType}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientQueuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading queue…
      </div>
    }>
      <QueuePageInner />
    </Suspense>
  );
}
