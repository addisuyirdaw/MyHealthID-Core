"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { lookupCitizenByIdentifier, directCitizenSignIn } from "@/lib/actions/patient.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IdCard, Search, KeyRound, ShieldCheck, ChevronLeft, Activity, AlertCircle, Eye, EyeOff } from "lucide-react";

export function VerificationCard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Lookup
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2: Password Challenge
  const [patientData, setPatientData] = useState<{
    patientId: string;
    healthId: string | null;
    fullName: string;
    hasPassword: boolean;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleLookup = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await lookupCitizenByIdentifier(q.trim());
      if (result.success) {
        setPatientData({
          patientId: result.patientId ?? "",
          healthId: result.healthId || null,
          fullName: result.fullName ?? "",
          hasPassword: !!result.hasPassword,
        });
        setStep(2);
        setPassword("");
        setError(null);
        setTimeout(() => passwordInputRef.current?.focus(), 100);
      } else {
        setError(result.error || "No citizen record found. Please verify the identifier.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred during lookup.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password.trim() || !patientData) return;
    setVerifying(true);
    setError(null);
    try {
      // Use directCitizenSignIn which verifies password and sets session cookies
      const result = await directCitizenSignIn(q.trim(), password.trim());
      if (result.success && result.patientId) {
        router.push(`/patients/${result.patientId}/clinical-records`);
      } else {
        setError(result.error || "Incorrect password. Please try again.");
        setVerifying(false);
      }
    } catch (err: any) {
      setError("Authentication failed. Please try again.");
      setVerifying(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError(null);
    setPassword("");
    setPatientData(null);
  };

  return (
    <Card className="border-emerald-200/80 bg-white/95 shadow-xl text-left transition-all duration-300 backdrop-blur-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-emerald-50/50 bg-emerald-50/10">
        <CardTitle className="text-base flex items-center gap-2 text-emerald-950 font-bold">
          <IdCard className="w-5 h-5 text-emerald-600" />
          {step === 1 ? "Confirm Identity to Access Chart" : "Enter Account Password"}
        </CardTitle>
        <CardDescription className="text-xs text-neutral-500">
          {step === 1
            ? "Enter your Phone Number, National ID, or Health ID to locate your medical record."
            : `Welcome back, ${patientData?.fullName}. Provide your secure password to authenticate.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5">

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                id="citizen-identifier-input"
                placeholder="Phone, Health ID, or FIN..."
                value={q}
                onChange={(e) => { setQ(e.target.value); setError(null); }}
                className="h-11 border-neutral-200 rounded-xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 pr-10"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLookup())}
              />
            </div>
            <Button
              id="citizen-lookup-submit-btn"
              type="button"
              className="h-11 shrink-0 bg-emerald-700 hover:bg-emerald-600 text-white font-medium rounded-xl shadow-md shadow-emerald-700/10 transition-all duration-200"
              disabled={loading || !q.trim()}
              onClick={handleLookup}
            >
              {loading ? <Activity className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              {loading ? "Searching..." : "Find Profile"}
            </Button>
          </div>
        )}

        {step === 2 && patientData && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5 bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">Profile Identified</span>
              </div>
              <div className="pl-6 text-xs text-emerald-900 space-y-0.5">
                <p className="font-semibold text-sm text-neutral-800">{patientData.fullName}</p>
                {patientData.healthId && (
                  <p className="font-mono text-neutral-500">ID: {patientData.healthId}</p>
                )}
              </div>
            </div>

            {!patientData.hasPassword ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 space-y-1">
                    <p className="font-bold text-amber-900">Password Setup Required</p>
                    <p className="leading-relaxed">
                      No password is set on this account. Please go to the <strong>Sign Up</strong> page to register, or visit any clinic front desk to activate your digital access credentials.
                    </p>
                  </div>
                </div>
                <Button
                  id="citizen-auth-signup-redirect-btn"
                  variant="outline"
                  onClick={() => router.push("/signup")}
                  className="w-full h-11 border-neutral-300 rounded-xl hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition-all"
                >
                  Go to Sign Up
                </Button>
                <button
                  id="citizen-lookup-back-btn"
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors mx-auto mt-2"
                >
                  <ChevronLeft className="w-3 h-3" /> Search Another ID
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="citizen-password-input" className="block text-[10px] font-bold uppercase tracking-widest text-emerald-800">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="citizen-password-input"
                      ref={passwordInputRef}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter account password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      className="h-11 border-neutral-200 rounded-xl pr-10 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleVerifyPassword())}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    id="citizen-password-back-btn"
                    variant="outline"
                    type="button"
                    onClick={handleBack}
                    className="h-11 border-neutral-200 hover:bg-neutral-50 rounded-xl px-4 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    id="citizen-password-submit-btn"
                    type="button"
                    className="h-11 flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/10"
                    disabled={verifying || !password.trim()}
                    onClick={handleVerifyPassword}
                  >
                    {verifying ? <Activity className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                    {verifying ? "Authenticating..." : "Access Clinical Chart"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
