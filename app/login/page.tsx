"use client";

import { loginUser } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserCircle, CheckCircle2, Building, Key, Mail, HelpCircle } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [hospitalIdCode, setHospitalIdCode] = useState("");
  const [orgIdPrefilled, setOrgIdPrefilled] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sessionCleared, setSessionCleared] = useState(false);

  // Always clear existing session when the login page loads
  useEffect(() => {
    fetch("/api/clear-session").finally(() => {
      setSessionCleared(true);
      const orgId = searchParams.get("orgId");
      if (orgId) {
        setHospitalIdCode(orgId);
        setOrgIdPrefilled(true);
      }
    });
  }, [searchParams]);

  const handleSubmit = async (formData: FormData) => {
    setStatus("loading");
    try {
      await loginUser(formData);
    } catch (error: any) {
      if (error.digest?.startsWith("NEXT_REDIRECT")) {
        setStatus("success");
        throw error;
      }
      setStatus("idle");
      alert(error.message);
    }
  };

  const handleDemoLogin = () => {
    const fd = new FormData();
    fd.append("emailOrUsername", "dr.dawit@myhealthid.gov.et");
    fd.append("password", "demo-password-hash");
    fd.append("hospitalIdCode", "");
    handleSubmit(fd);
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden p-6">
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-emerald-500/20 shadow-2xl rounded-3xl p-8 relative z-10 flex flex-col items-center text-center">
          <div className="bg-emerald-500/10 p-4 rounded-full mb-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Login Successful</h2>
          <h2 className="text-2xl font-bold text-emerald-400 mb-4">በትክክል ገብተዋል</h2>
          <p className="text-slate-400 font-medium">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show a brief loading spinner while clearing old session
  if (!sessionCleared) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Preparing secure login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden p-6">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-3xl p-8 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500/10 p-4 rounded-full border border-blue-500/20">
            <ShieldCheck className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-center text-white mb-1">
          MyHealthID Portal
        </h1>
        <p className="text-center text-slate-400 font-medium mb-8 text-sm">
          Sign in to your facility account
        </p>

        {/* Org ID context banner */}
        {orgIdPrefilled && (
          <div className="mb-5 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <span className="text-emerald-400 text-lg">🏥</span>
            <div>
              <p className="text-xs font-bold text-emerald-400">Facility ID auto-loaded</p>
              <p className="text-[11px] text-slate-400">Enter your email and PIN to continue</p>
            </div>
          </div>
        )}

        {/* Demo Button */}
        <div className="mb-5 pb-5 border-b border-slate-800">
          <Button
            type="button"
            onClick={handleDemoLogin}
            disabled={status === "loading"}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-11 flex items-center justify-center gap-2 font-bold shadow-sm text-sm"
          >
            <UserCircle className="w-5 h-5 text-blue-400" />
            Demo: Login as Dr. Dawit (No credentials needed)
          </Button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          {/* Hospital ID Code */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="hospitalIdCode" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Facility / Organization ID
              </label>
              {orgIdPrefilled && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  ✓ Pre-filled
                </span>
              )}
            </div>
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                id="hospitalIdCode"
                name="hospitalIdCode"
                value={hospitalIdCode}
                onChange={(e) => { setHospitalIdCode(e.target.value); setOrgIdPrefilled(false); }}
                placeholder="e.g. MH-AMH-WER-DEBRE-8C21"
                className={`w-full h-12 rounded-xl border bg-slate-950/80 pl-11 pr-4 font-mono text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition ${
                  orgIdPrefilled ? "border-emerald-500/40 text-emerald-300" : "border-slate-800"
                }`}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="emailOrUsername" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Email or License Username
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                id="emailOrUsername"
                name="emailOrUsername"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="e.g. admin@myhealthid.gov.et or md-2026-eth"
                className="w-full h-12 rounded-xl border border-slate-800 bg-slate-950/80 pl-11 pr-4 font-medium text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition text-sm"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Security PIN / Password
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your PIN"
                className="w-full h-12 rounded-xl border border-slate-800 bg-slate-950/80 pl-11 pr-4 font-mono text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                required
              />
            </div>
          </div>

          {/* Role hidden field default */}
          <input type="hidden" name="role" value="ADMIN" />

          <Button
            type="submit"
            disabled={status === "loading"}
            className="w-full h-12 text-md font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 mt-2 transition"
          >
            {status === "loading" ? "Verifying..." : "Sign In to MyHealthID →"}
          </Button>
        </form>

        {/* Footer links */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
            <p className="text-[11px] text-slate-500">
              New facility?{" "}
              <Link href="/register-facility" className="text-blue-400 hover:underline font-semibold">
                Register your hospital here
              </Link>
            </p>
          </div>
          <div className="flex items-center justify-center gap-1 border-t border-slate-800/40 pt-2">
            <UserCircle className="w-3.5 h-3.5 text-slate-600" />
            <p className="text-[11px] text-slate-500">
              Hospital staff?{" "}
              <Link href="/register-staff" className="text-blue-400 hover:underline font-semibold">
                Self-register under your facility
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
