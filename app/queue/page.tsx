"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getPatientQueueStatus } from "@/lib/actions/patient.actions";
import {
  Search, Clock, CheckCircle2, AlertTriangle,
  HeartPulse, Activity, Loader2, ChevronRight,
  Bell, RefreshCw, Wifi, WifiOff,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// BACKOFF ENGINE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
/** Fallback consultation slot length when server hasn't responded yet */
const DEFAULT_CONSULTATION_MIN = 8;

/**
 * Adaptive Poll Interval (ms) — Linear Backoff
 *
 * Formula (corrected from spec): Math.min(120_000, Math.max(10_000, patientsAhead × 10_000))
 *
 * Behaviour:
 *   patientsAhead = 0  →  10 000 ms  (10 s  — you're next, poll aggressively)
 *   patientsAhead = 1  →  10 000 ms
 *   patientsAhead = 6  →  60 000 ms  (1 min)
 *   patientsAhead = 12 →  120 000 ms (2 min — hits ceiling, saves DB reads)
 *   patientsAhead = 20 →  120 000 ms (2 min — capped)
 *
 * NOTE: The spec formula Math.min(120000, Math.max(150000, …)) is
 * mathematically impossible (max floor 150k > min ceiling 120k always returns
 * 120k). Corrected to Math.max(10_000, …) to satisfy the acceptance criterion
 * "patientsAhead > 10 → relaxed 2-minute cycle".
 */
function calcNextPollInterval(patientsAhead: number): number {
  return Math.min(120_000, Math.max(10_000, patientsAhead * 10_000));
}

// ─────────────────────────────────────────────────────────────────────────────
// INNER COMPONENT  (needs useSearchParams → must be wrapped in <Suspense>)
// ─────────────────────────────────────────────────────────────────────────────
function QueuePageInner() {
  const searchParams = useSearchParams();
  const tokenParam   = searchParams.get("token");
  const nameParam    = searchParams.get("name");

  /* ── identity / lookup ── */
  const [identifier,  setIdentifier]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [status,      setStatus]      = useState<any>(null);
  const [error,       setError]       = useState("");
  const [showWelcome, setShowWelcome] = useState(Boolean(tokenParam));

  /* ── clock (header) ── */
  const [currentTime, setCurrentTime] = useState(new Date());

  /* ── welcome-card token animation ── */
  const [displayToken, setDisplayToken] = useState(0);
  const targetToken = parseInt(tokenParam ?? "0", 10);

  /* ─────────────────────────────────────────────────────────────────────────
   * REACTIVE QUEUE STATE
   * All countdown arithmetic derives from these two server-sourced atoms.
   * ──────────────────────────────────────────────────────────────────────── */
  const [patientsAhead,        setPatientsAhead]        = useState<number>(0);
  const [currentQueuePosition, setCurrentQueuePosition] = useState<number>(1);
  const [avgConsultationTime,  setAvgConsultationTime]  = useState<number>(DEFAULT_CONSULTATION_MIN);

  /* ── delay-protection local ticker (decrements every 60 s, floors at avgConsultationTime) ── */
  const [localTickerTime, setLocalTickerTime] = useState<number>(0);

  /* ── final bilingual display string ── */
  const [uiDisplayTime, setUiDisplayTime] = useState<string>("");

  /* ── flash animation flag for "It's your turn" banner ── */
  const [flashActive, setFlashActive] = useState(false);

  /* ── network / sync state ── */
  const [lastPolled,    setLastPolled]    = useState<Date | null>(null);
  const [syncing,       setSyncing]       = useState(false);
  const [networkFrozen, setNetworkFrozen] = useState(false); // graceful degradation flag

  /* ── refs for backoff loop and ticker cleanup ── */
  const lookupIdRef    = useRef<string | null>(null);
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // 1.  LIVE CLOCK (header)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1_000);
    return () => clearInterval(t);
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 2.  WELCOME CARD — animated token count-up
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showWelcome || !targetToken) return;
    let cur = 0;
    const step = Math.max(1, Math.floor(targetToken / 20));
    const iv   = setInterval(() => {
      cur = Math.min(cur + step, targetToken);
      setDisplayToken(cur);
      if (cur >= targetToken) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, [showWelcome, targetToken]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3.  CORE SYNC — server fetch → reactive state atoms
  // ──────────────────────────────────────────────────────────────────────────
  const syncStatus = useCallback(async (id: string): Promise<number> => {
    setSyncing(true);
    let nextDelay = 30_000; // fallback if something goes wrong
    try {
      const res = await getPatientQueueStatus(id);
      if (res) {
        const ahead = res.patientsAhead ?? Math.max(0, res.queuePosition - 1);
        const avgMin: number = res.avgConsultationTime ?? DEFAULT_CONSULTATION_MIN;

        setPatientsAhead(ahead);
        setCurrentQueuePosition(res.queuePosition);
        setAvgConsultationTime(avgMin);
        setStatus(res);
        setNetworkFrozen(false);

        // Reset local ticker to the new baseline ceiling
        setLocalTickerTime(ahead * avgMin);
        setLastPolled(new Date());

        nextDelay = calcNextPollInterval(ahead);
      } else {
        // res is null → either patient gone or DB error
        setNetworkFrozen(true);
        nextDelay = 30_000;
      }
    } catch {
      // Network / timeout degradation — freeze UI, keep last state alive
      setNetworkFrozen(true);
      nextDelay = 30_000;
    } finally {
      setSyncing(false);
    }
    return nextDelay;
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 4.  ADAPTIVE BACKOFF LOOP  (recursive setTimeout — NO setInterval)
  //
  //     Each cycle:
  //       a) Fetch server data
  //       b) Receive the dynamic next-delay from syncStatus()
  //       c) Schedule itself again with the new interval
  //       d) Store the timer ref so unmount can cancel it
  // ──────────────────────────────────────────────────────────────────────────
  const startBackoffLoop = useCallback((id: string) => {
    // Clear any existing loop before starting a new one
    if (backoffTimerRef.current !== null) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }

    const loop = async () => {
      if (!lookupIdRef.current) return; // component unmounted or user cleared lookup

      const nextDelay = await syncStatus(id);

      // Schedule next tick only if still active
      if (lookupIdRef.current) {
        backoffTimerRef.current = setTimeout(loop, nextDelay);
      }
    };

    // Kick off first poll immediately
    backoffTimerRef.current = setTimeout(loop, calcNextPollInterval(patientsAhead));
  // patientsAhead intentionally excluded — initial interval uses current value; subsequent
  // intervals are self-correcting inside loop() via the return value of syncStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncStatus]);

  // ──────────────────────────────────────────────────────────────────────────
  // 5.  LOCAL TICKER — decrements every 60 s, floors at avgConsultationTime
  //     Resets upward whenever the server sync delivers fresh patientsAhead.
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Cancel previous ticker
    if (tickerTimerRef.current !== null) {
      clearInterval(tickerTimerRef.current);
      tickerTimerRef.current = null;
    }
    if (localTickerTime <= 0) return;

    tickerTimerRef.current = setInterval(() => {
      setLocalTickerTime(prev => {
        // Never cross below the ward-adaptive one-slot floor until the server
        // confirms the next structural queue mutation transaction.
        const next = prev - 1;
        return next < avgConsultationTime ? avgConsultationTime : next;
      });
    }, 60_000);

    return () => {
      if (tickerTimerRef.current !== null) clearInterval(tickerTimerRef.current);
    };
  // avgConsultationTime is included so the floor guard updates when a new
  // server payload arrives with a different ward constant.
  }, [localTickerTime, avgConsultationTime]);

  // ──────────────────────────────────────────────────────────────────────────
  // 6.  DELAY-PROTECTION DISPLAY EFFECT
  //     Reacts to [localTickerTime, patientsAhead, avgConsultationTime, networkFrozen]:
  //     • frozen               → freeze label + bilingual reconnecting warning
  //     • patientsAhead === 0  → bilingual "It's your turn" flash banner
  //     • else                 → safe-hold countdown with ward-adaptive floor
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (networkFrozen) {
      // Gracefully freeze — preserve last shown time, append reconnecting notice
      setUiDisplayTime(prev =>
        prev && !prev.includes("Reconnecting")
          ? `${prev} · Reconnecting safely... / በድጋሚ በመገናኘት ላይ...`
          : "Reconnecting safely... / በድጋሚ በመገናኘት ላይ..."
      );
      setFlashActive(false);
      return;
    }

    if (patientsAhead === 0 && status) {
      setUiDisplayTime("It's your turn / የእርስዎ ተራ ነው");
      setFlashActive(true);
      return;
    }

    setFlashActive(false);

    // Baseline ceiling = server-confirmed patients × ward-adaptive slot length
    const baselineCeiling = patientsAhead * avgConsultationTime;

    // Delay-protection floor: local ticker must never drift below one consultation
    // slot (avgConsultationTime) until the doctor's next queue mutation is confirmed.
    const safeHoldTime = Math.max(localTickerTime, avgConsultationTime);

    // Cap at ceiling (ticker starts at ceiling and decrements downward only)
    const capped = Math.min(safeHoldTime, baselineCeiling);

    setUiDisplayTime(`~${capped} min`);
  }, [localTickerTime, patientsAhead, avgConsultationTime, status, networkFrozen]);

  // ──────────────────────────────────────────────────────────────────────────
  // 7.  UNMOUNT CLEANUP — prevent memory / connection leaks
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      lookupIdRef.current = null;
      if (backoffTimerRef.current !== null) clearTimeout(backoffTimerRef.current);
      if (tickerTimerRef.current  !== null) clearInterval(tickerTimerRef.current);
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 8.  FORM SUBMIT — first lookup + kick off backoff loop
  // ──────────────────────────────────────────────────────────────────────────
  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus(null);
    setNetworkFrozen(false);

    // Cancel any existing loop for a previous patient
    lookupIdRef.current = null;
    if (backoffTimerRef.current !== null) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }

    const id = identifier.trim();
    try {
      const res = await getPatientQueueStatus(id);
      if (!res) {
        setError("Patient not found. Please check your ID or Phone Number. / ታካሚ አልተገኘም።");
      } else {
        const ahead  = res.patientsAhead ?? Math.max(0, res.queuePosition - 1);
        const avgMin = res.avgConsultationTime ?? DEFAULT_CONSULTATION_MIN;

        setPatientsAhead(ahead);
        setCurrentQueuePosition(res.queuePosition);
        setAvgConsultationTime(avgMin);
        setLocalTickerTime(ahead * avgMin);
        setStatus(res);
        setShowWelcome(false);
        setLastPolled(new Date());

        // Arm the adaptive backoff loop
        lookupIdRef.current = id;
        startBackoffLoop(id);
      }
    } catch {
      setError("Failed to fetch queue status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 9.  HELPERS
  // ──────────────────────────────────────────────────────────────────────────
  const triageColor = (t: string) =>
    t === "RED"    ? { bg: "bg-red-950/50",    border: "border-red-500/40",    text: "text-red-300",    label: "Emergency / ድንገተኛ" } :
    t === "YELLOW" ? { bg: "bg-amber-950/50",  border: "border-amber-500/40",  text: "text-amber-300",  label: "Urgent / አስቸኳይ" } :
                     { bg: "bg-emerald-950/50", border: "border-emerald-500/40",text: "text-emerald-300",label: "Routine / ተራ" };

  const pollLabel = lastPolled
    ? lastPolled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const nextPollSec = Math.round(calcNextPollInterval(patientsAhead) / 1_000);

  // ──────────────────────────────────────────────────────────────────────────
  // 10. RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex flex-col">

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-neutral-900/80 border-b border-neutral-800 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
            <HeartPulse className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">MyHealthID</span>
          <span className="text-neutral-600">·</span>
          <span className="text-xs text-neutral-500">Smart Queue</span>
        </div>

        <div className="flex items-center gap-3">
          {syncing && (
            <span className="flex items-center gap-1 text-[10px] text-blue-400">
              <RefreshCw className="w-3 h-3 animate-spin" /> syncing…
            </span>
          )}
          {networkFrozen && !syncing && (
            <span className="flex items-center gap-1 text-[10px] text-rose-400">
              <WifiOff className="w-3 h-3" /> offline
            </span>
          )}
          {pollLabel && !syncing && !networkFrozen && (
            <span className="flex items-center gap-1 text-[10px] text-neutral-600">
              <Wifi className="w-3 h-3 text-emerald-700" />
              {pollLabel} · next {nextPollSec}s
            </span>
          )}
          <div className="text-sm font-mono text-neutral-500 tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">

        {/* ══ WELCOME CARD ══ */}
        {showWelcome && tokenParam && (
          <div className="w-full max-w-sm">
            <div className="relative rounded-3xl overflow-hidden border border-blue-500/30 bg-gradient-to-br from-blue-950/80 to-neutral-900/90 backdrop-blur-xl shadow-2xl shadow-blue-900/30 p-8 text-center">
              <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5 pointer-events-none" />

              <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified &amp; Registered · ተረጋግጦ ተመዝግቧል
              </div>

              {nameParam && (
                <>
                  <p className="text-neutral-400 text-sm mb-1">Welcome / እንኳን ደህና መጡ,</p>
                  <h2 className="text-2xl font-bold text-white mb-7 truncate">
                    {decodeURIComponent(nameParam)}
                  </h2>
                </>
              )}

              <p className="text-neutral-500 text-[10px] uppercase tracking-widest font-semibold mb-3">
                Your Queue Number · የጉዞ ቁጥርዎ
              </p>

              <div className="relative mx-auto w-40 h-40 flex items-center justify-center mb-5">
                <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: "2.5s" }} />
                <div className="absolute inset-0 rounded-full bg-blue-500/5 ring-2 ring-blue-500/30" />
                <div className="absolute inset-2 rounded-full bg-blue-600/10 ring-1 ring-blue-500/20" />
                <span className="relative text-7xl font-black text-white tabular-nums">
                  #{displayToken || targetToken}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-neutral-400 text-sm mb-5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Est. wait: ~<span className="text-amber-300 font-semibold">{targetToken * DEFAULT_CONSULTATION_MIN} mins</span></span>
              </div>

              <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
                Please wait in the waiting area. · በጥበቃ አካባቢ ይጠብቁ።
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
                <p className="text-xs text-neutral-500 mt-1">Enter your ID · ID ያስገቡ</p>
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
                    placeholder="e.g. MHI-XXXX or 09…"
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
                  <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
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

            {/* ── NETWORK FROZEN BANNER ── */}
            {networkFrozen && (
              <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 rounded-xl px-4 py-3 text-xs text-rose-300">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>Reconnecting safely... / በድጋሚ በመገናኘት ላይ... · Last data preserved.</span>
              </div>
            )}

            {/* ── BILINGUAL "IT'S YOUR TURN" FLASH BANNER ── */}
            {patientsAhead === 0 ? (
              <div
                className={`relative rounded-2xl overflow-hidden border border-emerald-400/40 p-6 text-center transition-all duration-700 ${
                  flashActive ? "bg-emerald-900/60 shadow-2xl shadow-emerald-900/40" : "bg-emerald-950/40"
                }`}
                style={{ animation: flashActive ? "queueFlash 1.4s ease-in-out infinite" : "none" }}
              >
                <div className="absolute inset-0 rounded-2xl ring-1 ring-emerald-400/20 pointer-events-none" />
                <div
                  className="absolute inset-0 rounded-2xl bg-emerald-500/5"
                  style={{ animation: flashActive ? "queuePing 1.4s ease-in-out infinite" : "none" }}
                />

                <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <Bell className="w-3.5 h-3.5" />
                  Action Required · እርምጃ ያስፈልጋል
                </div>

                <p className="text-2xl font-black text-emerald-300 leading-snug mb-1">
                  Please proceed to the<br />examination room!
                </p>
                <p className="text-lg font-bold text-emerald-400/80">
                  እባክዎን ወደ ምርመራ ክፍል ይግቡ!
                </p>

                <div className="mt-5 flex items-center justify-center gap-2 text-emerald-300/60 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Queue #{currentQueuePosition} · ቁጥር #{currentQueuePosition}
                </div>
              </div>
            ) : (
              /* ── STANDARD TELEMETRY CARDS ── */
              <>
                {/* Position */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">
                    Your Position · የእርስዎ ተራ
                  </p>
                  <p className="text-8xl font-black text-white tabular-nums">#{currentQueuePosition}</p>
                </div>

                {/* Wait + Phase */}
                <div className="grid grid-cols-2 gap-3">
                  {/* DELAY-PROTECTED COUNTDOWN */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center relative overflow-hidden">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-10 bg-amber-500/10 blur-xl rounded-full" />
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2 relative z-10">
                      Est. Wait · ጊዜ
                    </p>
                    <p className={`text-2xl font-black tabular-nums relative z-10 leading-tight ${networkFrozen ? "text-rose-400" : "text-amber-400"}`}>
                      {uiDisplayTime.includes("Reconnecting")
                        ? <span className="text-sm leading-tight">{uiDisplayTime}</span>
                        : uiDisplayTime}
                    </p>
                    <p className="text-[9px] text-neutral-600 mt-1 relative z-10">
                      {patientsAhead} ahead · slot {avgConsultationTime}min
                    </p>
                  </div>

                  {/* Phase */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">Phase</p>
                    <p className="text-xs font-bold text-white leading-tight">{status.status}</p>
                  </div>
                </div>
              </>
            )}

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

            {/* Sync telemetry footer */}
            {pollLabel && (
              <p className="text-center text-[10px] text-neutral-700 pt-1">
                Adaptive poll · next in {nextPollSec}s · last synced {pollLabel}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── FLASH KEYFRAMES ── */}
      <style>{`
        @keyframes queueFlash {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
          50%       { box-shadow: 0 0 40px 8px rgba(52, 211, 153, 0.18); }
        }
        @keyframes queuePing {
          0%, 100% { opacity: 0; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* ── FOOTER ── */}
      <footer className="px-6 py-3 text-center text-[10px] text-neutral-700 border-t border-neutral-900">
        MyHealthID National Health Information System · Powered by AI Triage
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE EXPORT  (Suspense boundary required for useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────
export default function PatientQueuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading queue… · ይጠብቁ…</span>
        </div>
      </div>
    }>
      <QueuePageInner />
    </Suspense>
  );
}
