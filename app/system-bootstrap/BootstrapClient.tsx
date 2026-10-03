"use client";

import React, { useState } from "react";
import { ShieldCheck, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { bootstrapSystemAdmin } from "@/lib/actions/auth.actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BootstrapClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("A valid email is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await bootstrapSystemAdmin({ email, passwordRaw: password });
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || "Bootstrap failed.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#06060a] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-emerald-500/20 via-transparent to-teal-500/10 blur-xl -z-10" />
          <div className="bg-neutral-900/80 border border-neutral-800/60 rounded-2xl p-8 backdrop-blur-md">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Platform Initialized!</h1>
            <p className="text-neutral-400 text-sm mb-6">
              The first System Administrator has been successfully created. The bootstrap route is now securely locked.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/20"
            >
              Sign In to Platform
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06060a] flex flex-col items-center justify-center p-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[60%] h-[45%] bg-emerald-600/5 rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest mb-4">
            <ShieldCheck className="w-3 h-3" />
            System Bootstrap
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Initialize Platform</h1>
          <p className="text-neutral-400 text-sm mt-2">
            Create the first System Administrator. This route will be permanently disabled once an admin exists.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-6 backdrop-blur-md space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sysadmin@myhealthid.gov.et"
              required
              className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30 mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loading ? "Initializing..." : "Create System Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
