"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initiateCitizenSignIn, confirmCitizenSignIn } from "@/lib/actions/patient.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IdCard, Search, KeyRound, ShieldCheck, RefreshCw, ChevronLeft, Activity, AlertCircle } from "lucide-react";

const RESEND_COUNTDOWN = 60;

export function CitizenPassportLookup() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2
  const [credential, setCredential] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const startCountdown = () => {
    setResendCountdown(RESEND_COUNTDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const handleInitiate = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await initiateCitizenSignIn(q.trim());
      if (result.success && result.maskedPhone) {
        setCredential(q.trim());
        setMaskedPhone(result.maskedPhone);
        setStep(2);
        startCountdown();
        setTimeout(() => otpInputRef.current?.focus(), 100);
      } else {
        setError(result.error || "No citizen found with this credential.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.trim().length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      const result = await confirmCitizenSignIn(credential, otp.trim());
      if (result.success && result.patientId) {
        router.push(`/patients/${result.patientId}/clinical-records`);
      } else {
        setError(result.error || "Invalid or expired verification code.");
        setVerifying(false);
      }
    } catch {
      setError("Verification failed. Please try again.");
      setVerifying(false);
    }
  };

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
        setError(result.error || "Failed to resend code.");
      }
    } catch {
      setError("Failed to resend code.");
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
    <Card className="border-emerald-200/80 bg-white/90 shadow-lg text-left">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <IdCard className="w-5 h-5 text-emerald-600" />
          {step === 1 ? "Verified citizen lookup" : "Enter verification code"}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? <>Enter a <strong>12-digit FIN</strong> or <strong>phone number</strong> to initiate secure OTP verification.</>  
            : <>A 6-digit code was sent to <strong className="text-emerald-700">{maskedPhone}</strong>. Enter it below to access the chart.</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="passport-lookup-q"
              placeholder="Phone or FIN…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setError(null); }}
              className="h-11"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleInitiate())}
            />
            <Button
              id="passport-lookup-initiate-btn"
              type="button"
              className="h-11 shrink-0 bg-emerald-700 hover:bg-emerald-600"
              disabled={loading || !q.trim()}
              onClick={handleInitiate}
            >
              {loading ? <Activity className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              {loading ? "Sending…" : "Lookup"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-800 font-mono">Code sent to {maskedPhone}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="passport-lookup-otp"
                ref={otpInputRef}
                placeholder="6-digit code…"
                value={otp}
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }}
                className="h-11 font-mono tracking-widest text-center text-lg"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleVerify())}
                autoComplete="one-time-code"
              />
              <Button
                id="passport-lookup-verify-btn"
                type="button"
                className="h-11 shrink-0 bg-emerald-700 hover:bg-emerald-600"
                disabled={verifying || otp.length !== 6}
                onClick={handleVerify}
              >
                {verifying ? <Activity className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                {verifying ? "Verifying…" : "Verify"}
              </Button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                id="passport-lookup-back-btn"
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
              <button
                id="passport-lookup-resend-btn"
                type="button"
                onClick={handleResend}
                disabled={resendCountdown > 0 || resending}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                {resendCountdown > 0 ? `Resend (${resendCountdown}s)` : "Resend Code"}
              </button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

