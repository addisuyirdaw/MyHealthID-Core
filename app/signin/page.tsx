"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { directCitizenSignIn } from "@/lib/actions/patient.actions";
import { useLanguage } from "@/components/LanguageProvider";

import { LogoIcon } from "@/components/LogoIcon";
import Link from "next/link";
import {
  User,
  Activity,
  AlertCircle,
  HeartPulse,
  Search,
  ArrowRight,
  Shield,
  ShieldCheck,
  Key,
  CheckCircle2,
  Info,
} from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPassword, setNoPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    setNoPassword(false);
    try {
      const result = await directCitizenSignIn(identifier.trim(), password);
      if (result.success && result.patientId) {
        setSuccess(true);
        router.push(`/patients/${result.patientId}/clinical-records`);
      } else {
        setNoPassword(!!(result as any).noPassword);
        setError((result as any).error || "Authentication failed.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Verified & Entering…</h2>
          <p className="text-neutral-400 text-sm">Redirecting to your health records.</p>
          <Activity className="w-5 h-5 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-900/5 blur-[80px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="max-w-[180px] h-auto flex items-center justify-center mb-4">
            <LogoIcon className="w-full h-auto object-contain" />
          </div>
          <div>
            <p className="text-white font-black text-lg leading-none">MyHealthID</p>
            <p className="text-neutral-500 text-[11px] font-medium mt-1">National Health Network</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">

          {/* Header */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center mb-4 shadow-inner">
              <User className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-white text-2xl font-semibold tracking-tight text-center">
              Citizen Sign-In Portal
            </h1>
            <p className="text-slate-400 text-sm mt-2 text-center leading-relaxed max-w-xs">
              Enter your health ID and password to access your medical records.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className={`flex items-start gap-3 rounded-2xl px-4 py-4 text-sm mb-5 ${
              noPassword
                ? "bg-amber-950/40 border border-amber-500/25"
                : "bg-red-950/40 border border-red-500/25"
            }`}>
              {noPassword
                ? <Info className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
              }
              <div>
                <p className={`font-bold ${noPassword ? "text-amber-300" : "text-red-300"}`}>
                  {noPassword ? "Password Not Set" : "Sign-In Failed"}
                </p>
                <p className={`text-xs mt-0.5 leading-relaxed ${noPassword ? "text-amber-400/80" : "text-red-400/80"}`}>
                  {error}
                </p>
                {noPassword && (
                  <p className="text-amber-500/70 text-xs mt-1">
                    Visit your facility's reception desk to get your initial patient password.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">

            {/* Identifier */}
            <div className="space-y-2">
              <label htmlFor="signin-identifier" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Enter Health ID (MHI- / PRE-MHI-) or Phone
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  id="signin-identifier"
                  autoFocus
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(null); setNoPassword(false); }}
                  placeholder="Enter Health ID or Phone"
                  required
                  autoComplete="username"
                  className="w-full bg-slate-900/50 border border-slate-800 text-white rounded-lg h-12 pl-10 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="signin-password" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); setNoPassword(false); }}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-900/50 border border-slate-800 text-white rounded-lg h-12 pl-10 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="signin-verify-btn"
              type="submit"
              disabled={loading || !identifier.trim() || !password.trim()}
              className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 mt-4"
            >
              {loading ? (
                <><Activity className="w-5 h-5 animate-spin" /> Verifying…</>
              ) : (
                <><ShieldCheck className="w-5 h-5" /> Verify &amp; Enter Dashboard</>
              )}
            </button>
          </form>

          {/* New Patient Registration Link */}
          <div className="text-center mt-6">
            <Link
              href="/signup"
              className="text-emerald-400 hover:underline text-sm font-medium transition-all"
            >
              New Patient? Register here
            </Link>
          </div>

          {/* Trust note */}
          <p className="text-center text-[11px] text-slate-500 mt-5">
            <ShieldCheck className="w-3 h-3 inline mr-1 text-emerald-600" />
            Your data is encrypted under Ethiopian health privacy standards.
          </p>
        </div>

        <p className="text-center text-[11px] text-neutral-700 mt-6">
          MyHealthID · Secure National Health Information System
        </p>
      </div>
    </div>
  );
}
