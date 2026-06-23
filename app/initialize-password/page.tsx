"use client";

import { useState } from "react";
import { finalizeAccountPassword } from "@/lib/actions/auth.actions";
import { ShieldCheck, Eye, EyeOff, Lock, CheckCircle2, XCircle, HeartPulse, Loader2 } from "lucide-react";

export default function InitializePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      setStatus("error");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const res = await finalizeAccountPassword(password);
      if (res && !res.success) {
        setErrorMsg(res.error || "Failed to initialize password.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch (err: any) {
      if (err.digest?.startsWith("NEXT_REDIRECT")) {
        setStatus("success");
        throw err;
      }
      setErrorMsg(err.message || "An unexpected error occurred.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background glows */}
        <div className="pointer-events-none absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full bg-blue-600/8 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-600/8 blur-[100px]" />

        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-emerald-500/20 shadow-2xl rounded-3xl p-10 flex flex-col items-center text-center relative z-10">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-full mb-6">
            <CheckCircle2 className="w-14 h-14 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Setup Successful</h2>
          <p className="text-emerald-400 font-bold mb-4">የይለፍ ቃል በትክክል ተቀይሯል</p>
          <p className="text-slate-400 text-sm">Redirecting to your clinical dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden p-4">
      {/* Background ambient glows */}
      <div className="pointer-events-none absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full bg-indigo-600/8 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-600/8 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full bg-indigo-900/5 blur-[80px]" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-950/40">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-lg leading-none">MyHealthID</p>
            <p className="text-slate-500 text-xs font-medium">Ethiopia's National Health Portal</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-xl font-black text-white leading-tight">
              Welcome to MyHealthID Network
            </h1>
            <p className="text-slate-400 text-xs mt-2">
              Secure Your Clinical Account to Proceed
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Enter New Strong Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full h-12 rounded-xl border border-slate-700 bg-slate-950/80 pl-11 pr-12 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full h-12 rounded-xl border border-slate-700 bg-slate-950/80 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Requirements check */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 space-y-1.5">
              <p className="font-bold text-slate-300 uppercase tracking-wider text-[9px]">
                Security Requirements
              </p>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? "bg-emerald-400" : "bg-slate-600"}`} />
                <span>At least 8 characters long</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${password && password === confirmPassword ? "bg-emerald-400" : "bg-slate-600"}`} />
                <span>Passwords match</span>
              </div>
            </div>

            {/* Error Message */}
            {status === "error" && (
              <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-xs">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full h-12 font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-indigo-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Configuring Credentials…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Initialize Account Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
