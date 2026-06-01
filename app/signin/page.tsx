"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInCitizen } from "@/lib/actions/patient.actions";
import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";
import {
  User, Activity, AlertCircle, HeartPulse, Search, ArrowRight, Shield,
} from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setError(false);
    try {
      const result = await signInCitizen(identifier);
      if (result.success && result.patientId) {
        router.push(`/patients/${result.patientId}/clinical-records`);
      } else {
        setError(true);
        setLoading(false);
      }
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 relative overflow-hidden">
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

        {/* Main card */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
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

          <form onSubmit={handleSignIn} className="space-y-5">
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 bg-red-950/40 border border-red-500/25 rounded-2xl px-4 py-4 text-sm">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-300">{t.signin.notFoundTitle}</p>
                  <p className="text-red-400/80 text-xs mt-0.5">{t.signin.notFoundDesc}</p>
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
              <label htmlFor="identifier" className="block text-[10px] font-bold uppercase tracking-widest text-blue-400">
                {t.signin.idLabel}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  id="identifier"
                  autoFocus
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(false); }}
                  placeholder={t.signin.idPlaceholder}
                  required
                  className="w-full bg-neutral-950 border border-neutral-700 text-white font-mono text-center text-lg h-14 rounded-xl pl-10 pr-4 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="w-full h-14 flex items-center justify-center gap-2 text-base font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]"
            >
              {loading ? (
                <><Activity className="w-5 h-5 animate-spin" /> Searching…</>
              ) : (
                <><User className="w-5 h-5" /> {t.signin.accessButton}</>
              )}
            </button>
          </form>

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
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-neutral-700 mt-6">
          MyHealthID · Secure National Health Information System
        </p>
      </div>
    </div>
  );
}
