"use client";

import { loginUser } from "@/lib/actions/auth.actions";
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  Key,
  Mail,
  User,
  HeartPulse,
  ArrowRight,
  Stethoscope,
  Users,
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Tab = "citizen" | "staff";

function LoginForm() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("citizen");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  // Staff form state
  const [hospitalIdCode, setHospitalIdCode] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sessionCleared, setSessionCleared] = useState(false);

  // Clear session on mount
  useEffect(() => {
    fetch("/api/clear-session").finally(() => {
      setSessionCleared(true);
      const orgId = searchParams.get("orgId");
      if (orgId) {
        setHospitalIdCode(orgId);
        setActiveTab("staff");
      }
    });
  }, [searchParams]);

  const handleStaffLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatus("loading");
    const fd = new FormData();
    fd.append("emailOrUsername", emailOrUsername.trim());
    fd.append("password", password);
    fd.append("hospitalIdCode", hospitalIdCode.trim());
    fd.append("role", "HOSPITAL_CEO");
    try {
      const res = await loginUser(fd);
      if (res && res.error) {
        setStatus("idle");
        alert(res.error);
        return;
      }
    } catch (error: any) {
      if (error.digest?.startsWith("NEXT_REDIRECT")) {
        setStatus("success");
        throw error;
      }
      setStatus("idle");
      alert(error.message);
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-slate-900/80 backdrop-blur-xl border border-emerald-500/20 shadow-2xl rounded-3xl p-10 flex flex-col items-center text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-full mb-6">
            <CheckCircle2 className="w-14 h-14 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-1">Login Successful</h2>
          <p className="text-emerald-400 font-bold mb-4">በትክክል ገብተዋል</p>
          <p className="text-slate-400 text-sm">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!sessionCleared) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Preparing secure session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden p-4">
      {/* Background ambient glows */}
      <div className="pointer-events-none absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full bg-blue-600/8 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-600/8 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full bg-indigo-900/5 blur-[80px]" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center gap-6">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-lg leading-none">MyHealthID</p>
            <p className="text-slate-500 text-xs font-medium">Ethiopia's National Health Portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">

          {/* Tab selector */}
          <div className="flex border-b border-slate-800">
            <button
              id="tab-citizen"
              onClick={() => setActiveTab("citizen")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all
                ${activeTab === "citizen"
                  ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                }`}
            >
              <Users className="w-4 h-4" />
              Citizen Access
            </button>
            <button
              id="tab-staff"
              onClick={() => setActiveTab("staff")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all
                ${activeTab === "staff"
                  ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                }`}
            >
              <Stethoscope className="w-4 h-4" />
              Healthcare Staff
            </button>
          </div>

          <div className="p-8">

            {/* ─── CITIZEN TAB ─── */}
            {activeTab === "citizen" && (
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white mb-1">Citizen Portal</h1>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Access your health records using your<br />
                    <span className="text-blue-300 font-semibold">National ID (Fayda ID)</span> or patient token.
                  </p>
                </div>

                <div className="w-full flex flex-col gap-3">
                  <Link
                    href="/signin"
                    id="citizen-signin-btn"
                    className="w-full h-13 flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98] py-3.5"
                  >
                    <User className="w-5 h-5" />
                    Sign In to My Health Records
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Link>
                  <Link
                    href="/register"
                    id="citizen-register-btn"
                    className="w-full h-12 flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold rounded-xl transition-all text-sm"
                  >
                    New Patient? Register Here
                  </Link>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed max-w-xs">
                  Your data is encrypted and protected under Ethiopian health privacy standards.
                </p>
              </div>
            )}

            {/* ─── STAFF TAB ─── */}
            {activeTab === "staff" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-600/15 border border-emerald-500/25 flex items-center justify-center mb-4">
                    <Stethoscope className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h1 className="text-2xl font-black text-white mb-1">Clinical Workspace</h1>
                  <p className="text-slate-400 text-sm">
                    Sign in with your facility credentials
                  </p>
                </div>

                <form onSubmit={handleStaffLogin} className="space-y-4">
                  {/* Hospital ID */}
                  <div className="space-y-1.5">
                    <label htmlFor="hospitalIdCode" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Hospital / Facility ID
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="text"
                        id="hospitalIdCode"
                        value={hospitalIdCode}
                        onChange={(e) => setHospitalIdCode(e.target.value)}
                        placeholder="e.g. MH-AMH-WER-DEBRE-8C21"
                        className="w-full h-12 rounded-xl border border-slate-700 bg-slate-950/80 pl-11 pr-4 font-mono text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="emailOrUsername" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Email or License Number
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="text"
                        id="emailOrUsername"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        placeholder="doctor@hospital.gov.et or md-2026-eth"
                        className="w-full h-12 rounded-xl border border-slate-700 bg-slate-950/80 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Security PIN / Password
                    </label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your PIN"
                        className="w-full h-12 rounded-xl border border-slate-700 bg-slate-950/80 pl-11 pr-4 font-mono text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  <button
                    id="staff-signin-btn"
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full h-12 font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                  >
                    {status === "loading" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Sign In to Clinical Workspace
                      </>
                    )}
                  </button>
                </form>

                {/* Footer links */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-800 text-center">
                  <p className="text-[11px] text-slate-500">
                    No account?{" "}
                    <Link href="/register-staff" className="text-emerald-400 hover:underline font-semibold">
                      Register as Healthcare Staff
                    </Link>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    New facility?{" "}
                    <Link href="/register-facility" className="text-blue-400 hover:underline font-semibold">
                      Register your Hospital
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center gap-5 flex-wrap justify-center">
          {[
            { label: "Fayda-Integrated", color: "text-blue-400" },
            { label: "HIPAA-Aligned", color: "text-emerald-400" },
            { label: "Multi-Lingual", color: "text-purple-400" },
          ].map(({ label, color }) => (
            <span key={label} className={`text-[10px] font-bold ${color} flex items-center gap-1`}>
              <ShieldCheck className="w-3 h-3" /> {label}
            </span>
          ))}
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
