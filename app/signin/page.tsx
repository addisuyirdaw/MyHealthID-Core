"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { initiateCitizenSignIn, confirmCitizenSignIn, selfServiceUpdatePatientPhone } from "@/lib/actions/patient.actions";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import Link from "next/link";
import {
  User, Activity, AlertCircle, HeartPulse, Search, ArrowRight,
  Shield, ShieldCheck, ChevronLeft, RefreshCw, KeyRound,
} from "lucide-react";

const RESEND_COUNTDOWN = 60;

export default function SignInPage() {
  const router = useRouter();
  const { t } = useLanguage();

  // Step 1 state
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 state
  const [credential, setCredential] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Synchronization Modal State
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [syncFayda, setSyncFayda] = useState("");
  const [syncFullName, setSyncFullName] = useState("");
  const [syncDob, setSyncDob] = useState("");
  const [syncNewPhone, setSyncNewPhone] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Start resend countdown timer
  const startCountdown = () => {
    setResendCountdown(RESEND_COUNTDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  // Step 1: Initiate sign-in
  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await initiateCitizenSignIn(identifier.trim());
      if (result.success && result.maskedPhone) {
        setCredential(identifier.trim());
        setMaskedPhone(result.maskedPhone);
        setStep(2);
        startCountdown();
        setTimeout(() => otpInputRef.current?.focus(), 100);
      } else {
        setError(result.error || t.signin.notFoundTitle);
      }
    } catch {
      setError(t.signin.notFoundTitle);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      const result = await confirmCitizenSignIn(credential, otp.trim());
      if (result.success && result.patientId) {
        router.push(`/patients/${result.patientId}/clinical-records`);
      } else {
        setError(result.error || t.signin.invalidOtp);
        setVerifying(false);
      }
    } catch {
      setError(t.signin.invalidOtp);
      setVerifying(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCountdown > 0 || resending) return;
    setResending(true);
    setError(null);
    setOtp("");
    try {
      const result = await initiateCitizenSignIn(credential);
      if (result.success && result.maskedPhone) {
        startCountdown();
        setTimeout(() => otpInputRef.current?.focus(), 100);
      } else {
        setError(result.error || t.signin.notFoundTitle);
      }
    } catch {
      setError(t.signin.notFoundTitle);
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setOtp("");
    setError(null);
    setMaskedPhone("");
    if (countdownRef.current) clearInterval(countdownRef.current);
    setResendCountdown(0);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Language toggle at top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-900/5 blur-[80px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-base leading-none">MyHealthID</p>
            <p className="text-neutral-500 text-[11px] font-medium">National Health Network</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
            step === 1 ? "text-blue-400" : "text-neutral-600"
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
              step === 1 ? "bg-blue-500 text-white" : step > 1 ? "bg-emerald-500 text-white" : "bg-neutral-700 text-neutral-400"
            }`}>{step > 1 ? "✓" : "1"}</div>
            Identity
          </div>
          <div className={`flex-1 max-w-[40px] h-px transition-colors ${
            step >= 2 ? "bg-blue-500/50" : "bg-neutral-800"
          }`} />
          <div className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
            step === 2 ? "text-blue-400" : "text-neutral-600"
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
              step === 2 ? "bg-blue-500 text-white" : "bg-neutral-700 text-neutral-400"
            }`}>2</div>
            Verify
          </div>
        </div>

        {/* Main card */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">

          {/* ─── STEP 1 ─── */}
          {step === 1 && (
            <>
              {/* Icon & heading */}
              <div className="flex flex-col items-center mb-7">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center mb-4 shadow-inner">
                  <User className="w-8 h-8 text-blue-400" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight text-center">
                  {t.signin.title}
                </h1>
                <p className="text-neutral-500 text-sm mt-1.5 text-center leading-relaxed">
                  {t.signin.subtitle}
                </p>
              </div>

              <form onSubmit={handleInitiate} className="space-y-5">
                {/* Error banner */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-950/40 border border-red-500/25 rounded-2xl px-4 py-4 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-300">{t.signin.notFoundTitle}</p>
                      <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
                      <Link
                        href="/register"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-xs mt-2 transition-colors"
                      >
                        {t.signin.registerLink} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* ID input */}
                <div className="space-y-2">
                  <label htmlFor="signin-identifier" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                    {t.signin.idLabel}
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      id="signin-identifier"
                      autoFocus
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                      placeholder={t.signin.idPlaceholder}
                      required
                      className="w-full bg-neutral-950 border border-neutral-700 text-white font-mono text-center text-lg h-14 rounded-xl pl-10 pr-4 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  id="signin-initiate-btn"
                  type="submit"
                  disabled={loading || !identifier.trim()}
                  className="w-full h-14 flex items-center justify-center gap-2 text-base font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]"
                >
                  {loading ? (
                    <><Activity className="w-5 h-5 animate-spin" /> Sending Code…</>
                  ) : (
                    <><User className="w-5 h-5" /> {t.signin.accessButton}</>
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <button
                  id="signin-sync-anchor"
                  type="button"
                  onClick={() => setIsSyncOpen(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold transition-colors"
                >
                  {t.signin.syncAnchor}
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-neutral-800" />
                <span className="text-neutral-600 text-xs">or</span>
                <div className="flex-1 h-px bg-neutral-800" />
              </div>

              {/* Register link */}
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 w-full h-12 text-sm font-semibold border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-xl transition-all hover:bg-neutral-800/60"
              >
                <Shield className="w-4 h-4 text-blue-400" />
                New Patient? Register here
              </Link>
            </>
          )}

          {/* ─── STEP 2 ─── */}
          {step === 2 && (
            <>
              {/* Icon & heading */}
              <div className="flex flex-col items-center mb-7">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600/15 border border-emerald-500/25 flex items-center justify-center mb-4 shadow-inner">
                  <KeyRound className="w-8 h-8 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight text-center">
                  {t.signin.otpTitle}
                </h1>
                <p className="text-neutral-500 text-sm mt-1.5 text-center leading-relaxed">
                  {t.signin.otpSubtitle}
                </p>
                {maskedPhone && (
                  <div className="mt-3 flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/25 rounded-xl px-4 py-2.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <p className="text-emerald-300 text-xs font-mono">
                      {t.signin.otpSentTo.replace("{phone}", maskedPhone)}
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                {/* Error banner */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-950/40 border border-red-500/25 rounded-2xl px-4 py-4 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {/* OTP input */}
                <div className="space-y-2">
                  <label htmlFor="signin-otp" className="block text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    {t.signin.otpLabel}
                  </label>
                  <input
                    id="signin-otp"
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }}
                    placeholder={t.signin.otpPlaceholder}
                    required
                    autoComplete="one-time-code"
                    className="w-full bg-neutral-950 border border-neutral-700 text-white font-mono text-center text-2xl tracking-[0.5em] h-16 rounded-xl outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:text-neutral-700 placeholder:tracking-normal"
                  />
                </div>

                {/* Verify button */}
                <button
                  id="signin-verify-btn"
                  type="submit"
                  disabled={verifying || otp.trim().length !== 6}
                  className="w-full h-14 flex items-center justify-center gap-2 text-base font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
                >
                  {verifying ? (
                    <><Activity className="w-5 h-5 animate-spin" /> {t.signin.verifying}</>
                  ) : (
                    <><ShieldCheck className="w-5 h-5" /> {t.signin.verifyButton}</>
                  )}
                </button>
              </form>

              {/* Resend & Back */}
              <div className="flex items-center justify-between mt-5 gap-3">
                <button
                  id="signin-back-btn"
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  {t.signin.backButton}
                </button>

                <button
                  id="signin-resend-btn"
                  type="button"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || resending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                  {resendCountdown > 0
                    ? t.signin.resendCountdown.replace("{seconds}", String(resendCountdown))
                    : t.signin.resendButton}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-neutral-700 mt-6">
          MyHealthID · Secure National Health Information System
        </p>
      </div>

      {/* Identity Synchronization Modal */}
      {isSyncOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <h2 className="text-lg font-black text-white">{t.signin.syncTitle}</h2>
              <button
                onClick={() => {
                  setIsSyncOpen(false);
                  setSyncFayda("");
                  setSyncFullName("");
                  setSyncDob("");
                  setSyncNewPhone("");
                  setSyncError(null);
                  setSyncSuccess(null);
                }}
                className="text-neutral-500 hover:text-neutral-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-4">
              <p className="text-neutral-400 text-xs leading-relaxed">
                {t.signin.syncSubtitle}
              </p>

              {syncError && (
                <div className="p-3 bg-red-950/40 text-red-200 border border-red-500/25 rounded-xl text-xs">
                  {syncError}
                </div>
              )}

              {syncSuccess ? (
                <div className="space-y-4 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    ✓
                  </div>
                  <p className="text-sm font-bold text-emerald-300">{t.signin.syncSuccess}</p>
                  <button
                    onClick={() => {
                      setIsSyncOpen(false);
                      setIdentifier(syncFayda); // Auto-fill Fayda ID to sign in
                      setSyncFayda("");
                      setSyncFullName("");
                      setSyncDob("");
                      setSyncNewPhone("");
                      setSyncSuccess(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSyncLoading(true);
                    setSyncError(null);
                    try {
                      const res = await selfServiceUpdatePatientPhone(
                        syncFayda,
                        syncNewPhone,
                        syncDob,
                        syncFullName
                      );
                      if (res.success) {
                        setSyncSuccess(t.signin.syncSuccess);
                      } else {
                        setSyncError(res.error || t.signin.syncError);
                      }
                    } catch (err: any) {
                      setSyncError(err.message || t.signin.syncError);
                    } finally {
                      setSyncLoading(false);
                    }
                  }}
                  className="space-y-4 text-left"
                >
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      {t.signin.syncFaydaLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={syncFayda}
                      onChange={(e) => setSyncFayda(e.target.value)}
                      placeholder="e.g. 12-digit Fayda ID"
                      className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      {t.signin.syncFullNameLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={syncFullName}
                      onChange={(e) => setSyncFullName(e.target.value)}
                      placeholder="e.g. Abebe Kebede"
                      className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      {t.signin.syncDobLabel}
                    </label>
                    <input
                      type="date"
                      required
                      value={syncDob}
                      onChange={(e) => setSyncDob(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                      {t.signin.syncNewPhoneLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={syncNewPhone}
                      onChange={(e) => setSyncNewPhone(e.target.value)}
                      placeholder="e.g. +251911000000"
                      className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={syncLoading}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {syncLoading ? "Syncing..." : t.signin.syncSubmitButton}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
