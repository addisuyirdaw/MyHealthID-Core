"use client";

import { loginUser } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserCircle, CheckCircle2 } from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";
import { CitizenPassportLookup } from "@/components/CitizenPassportLookup";
import { useState } from "react";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const handleSubmit = async (formData: FormData) => {
    setStatus("loading");
    try {
      await loginUser(formData);
    } catch (error: any) {
      if (error.digest?.startsWith("NEXT_REDIRECT")) {
        setStatus("success");
        throw error; // Let Next.js handle the redirect
      }
      setStatus("idle");
      alert(error.message);
    }
  };

  const handleDemoLogin = () => {
    const fd = new FormData();
    fd.append("email", "dr.dawit@myhealthid.gov.et");
    fd.append("role", "DOCTOR");
    handleSubmit(fd);
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden p-6">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-emerald-200 shadow-2xl rounded-3xl p-8 relative z-10 flex flex-col items-center text-center">
          <div className="bg-emerald-100 p-4 rounded-full mb-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Login Successful</h2>
          <h2 className="text-2xl font-bold text-emerald-700 mb-4">በትክክል ገብተዋል</h2>
          <p className="text-slate-500">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden p-6">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-8 relative z-10">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-50 p-4 rounded-full">
            <ShieldCheck className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-center text-slate-900 mb-2">
          <LocalizedText tKey="login.title" />
        </h1>
        <p className="text-center text-slate-500 font-medium mb-8">
          <LocalizedText tKey="login.subtitlePre" /><span className="text-blue-600 font-bold">ID</span><LocalizedText tKey="login.subtitlePost" />
        </p>

        {/* Demo Pitch Hook */}
        <div className="mb-6 pb-6 border-b border-slate-200">
          <Button 
            type="button" 
            onClick={handleDemoLogin} 
            disabled={status === "loading"}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 flex items-center justify-center gap-2"
          >
            <UserCircle className="w-5 h-5" />
            Pitch Demo: Login as Dr. Dawit
          </Button>
        </div>

        <div className="mb-6">
          <CitizenPassportLookup />
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-bold text-slate-700 uppercase tracking-wider block">
              <LocalizedText tKey="login.emailLabel" />
            </label>
            <input 
              type="text" 
              id="email" 
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dr.name@myhealthid.gov.et" 
              className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-bold text-slate-700 uppercase tracking-wider block">
              <LocalizedText tKey="login.roleLabel" />
            </label>
            <select 
              id="role" 
              name="role" 
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            >
              <option value="" disabled>Select your credentials...</option>
              <option value="ADMIN">Medical Director (Admin)</option>
              <option value="DOCTOR">Attending Doctor</option>
              <option value="PHARMACIST">Head Pharmacist</option>
              <option value="LAB_TECH">Lab Technician</option>
              <option value="NURSE">Triage Nurse</option>
              <option value="RECEPTIONIST">Receptionist</option>
            </select>
          </div>

          <div className="space-y-2 mb-2">
            <label htmlFor="password" className="text-sm font-bold text-slate-700 uppercase tracking-wider block">
              <LocalizedText tKey="login.passwordLabel" />
            </label>
            <input 
              type="password" 
              id="password" 
              name="password"
              placeholder="••••••••" 
              className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <p className="text-xs text-slate-400 mt-1"><LocalizedText tKey="login.simNote" /></p>
          </div>

          <Button type="submit" disabled={status === "loading"} className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 mt-4">
            {status === "loading" ? "Authenticating..." : <LocalizedText tKey="login.secureLogin" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
