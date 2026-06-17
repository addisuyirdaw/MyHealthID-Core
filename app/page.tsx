export const dynamic = 'force-dynamic';
export const revalidate = 0;

import prisma from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { HeartPulse, ShieldCheck, Activity, Users, Stethoscope, User, ArrowRight } from "lucide-react";
import { ADMIN_ROLES, CLINICAL_ROLES } from "@/lib/locales/enums";
import { LocalizedText } from "@/components/LocalizedText";
import { LogoIcon } from "@/components/LogoIcon";
import { CitizenPassportLookup } from "@/components/CitizenPassportLookup";

export default async function Home() {
  // Count all digitized citizens: registered Patients + User accounts with CITIZEN role.
  // Both queries run in parallel for speed. Falls back to 0 if DB is unavailable.
  let patientCount = 0;
  try {
    const [patientRecords, citizenUsers] = await Promise.all([
      prisma.patient.count(),
      prisma.user.count({ where: { role: "CITIZEN" } }),
    ]);
    patientCount = patientRecords + citizenUsers;
  } catch (error: any) {
    console.error("METRIC_FETCH_ERROR:", error.message);
    console.error("[Home] DB unreachable, showing fallback count:", error);
  }
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const canAccessDoctorPortal =
    !!userRole &&
    (CLINICAL_ROLES.includes(userRole as any) || ADMIN_ROLES.includes(userRole as any));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-600/8 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-blue-900/5 blur-[100px]" />

      <main className="max-w-5xl mx-auto px-4 md:px-8 w-full relative z-10 py-16">
        <div className="text-center max-w-3xl mx-auto space-y-8">

          {/* Logo + brand */}
          <div className="flex justify-center">
            <div className="bg-neutral-900/80 border border-neutral-800 backdrop-blur-xl px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 ring-1 ring-white/5">
              <LogoIcon className="w-10 h-10" />
              <h1 className="text-3xl font-black tracking-tighter text-white leading-none">
                MyHealth<span className="text-blue-400">ID</span>
              </h1>
            </div>
          </div>

          {/* Hero headline */}
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
              <LocalizedText tKey="landing.title" />
            </h2>
            <p className="text-lg md:text-xl text-neutral-400 font-medium max-w-2xl mx-auto leading-relaxed">
              <LocalizedText tKey="landing.subtitle" />
            </p>
          </div>

          {/* Live patient counter */}
          <div className="bg-neutral-900/60 border border-neutral-800 backdrop-blur-xl rounded-2xl p-6 max-w-xs mx-auto shadow-xl ring-1 ring-white/5">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
              <Activity className="w-3.5 h-3.5" /> Live National Impact
            </div>
            <div className="flex flex-col items-center">
              <span className="text-6xl font-black text-white tracking-tighter tabular-nums">
                {patientCount.toLocaleString()}
              </span>
              <span className="text-neutral-400 font-medium mt-2 flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                Citizens Digitized on MyHealthID
              </span>
            </div>
          </div>

          {/* Citizen passport lookup */}
          <div className="max-w-xl mx-auto w-full">
            <CitizenPassportLookup />
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch w-full max-w-md mx-auto">
            <Link href="/register" className="flex-1">
              <button className="w-full h-14 flex items-center justify-center gap-2 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]">
                <Users className="w-5 h-5" />
                <LocalizedText tKey="landing.registerCitizen" />
              </button>
            </Link>
            <Link href="/signin" className="flex-1">
              <button className="w-full h-14 flex items-center justify-center gap-2 text-base font-semibold border border-neutral-700 hover:border-neutral-500 text-neutral-200 hover:text-white hover:bg-neutral-800/60 rounded-xl transition-all active:scale-[0.98]">
                <User className="w-5 h-5 text-blue-400" />
                <LocalizedText tKey="nav.citizenSignIn" />
              </button>
            </Link>
            {canAccessDoctorPortal ? (
              <Link href="/doctor/search" className="flex-1">
                <button className="w-full h-14 flex items-center justify-center gap-2 text-base font-semibold border border-neutral-700 hover:border-neutral-500 text-neutral-200 hover:text-white hover:bg-neutral-800/60 rounded-xl transition-all active:scale-[0.98]">
                  <Stethoscope className="w-5 h-5 text-purple-400" /> Doctor Portal
                </button>
              </Link>
            ) : (
              <Link href="/login" className="flex-1">
                <button className="w-full h-14 flex items-center justify-center gap-2 text-base font-semibold border border-neutral-700 hover:border-neutral-500 text-neutral-200 hover:text-white hover:bg-neutral-800/60 rounded-xl transition-all active:scale-[0.98]">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <LocalizedText tKey="landing.healthcareLogin" />
                </button>
              </Link>
            )}
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 pt-2 flex-wrap">
            {[
              { label: "Fayda-Integrated", color: "text-blue-400" },
              { label: "HIPAA-Aligned", color: "text-emerald-400" },
              { label: "Multi-Lingual", color: "text-purple-400" },
            ].map(({ label, color }) => (
              <span key={label} className={`text-[11px] font-bold ${color} flex items-center gap-1`}>
                <ShieldCheck className="w-3 h-3" /> {label}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
