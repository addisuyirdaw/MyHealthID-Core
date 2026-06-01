import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck, QrCode, Home, HeartPulse } from "lucide-react";
import { PatientQR } from "@/components/PatientQR";
import Link from "next/link";

export default async function SuccessPage({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: params.id }, { healthId: params.id }] },
  });

  if (!patient) return notFound();

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-emerald-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-blue-600/8 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <HeartPulse className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-sm">MyHealthID</span>
        </div>

        {/* Main card */}
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl ring-1 ring-white/5">

          {/* Success header */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/30 border-b border-emerald-500/15 px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-4 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1">Registration Complete</h1>
            <p className="text-emerald-400/70 text-sm">Patient securely added to the national registry</p>

            <div className="inline-flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-500/25 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full mt-4">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Profile
            </div>
          </div>

          {/* Patient identity */}
          <div className="px-8 py-6 text-center space-y-6">
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Digital Health Passport</p>
              <h2 className="text-xl font-bold text-white">{patient.fullName}</h2>
              {patient.nationalId && (
                <p className="text-sm text-neutral-500 mt-1">
                  Fayda ID: <span className="font-mono text-neutral-300">{patient.nationalId}</span>
                </p>
              )}
            </div>

            {/* QR code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-2xl shadow-lg shadow-neutral-900/50 inline-block">
                <PatientQR value={patient.healthId} size={160} />
              </div>
            </div>

            {/* Health ID */}
            <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl py-4 px-5">
              <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-bold mb-2">
                System Health ID
              </p>
              <p className="text-3xl font-mono font-black text-emerald-400 tracking-widest">
                {patient.healthId}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-1">
              <Link href={`/patients/${patient.id}/dashboard`} className="block">
                <button className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 active:scale-[0.98]">
                  View Live Queue &amp; Dashboard
                </button>
              </Link>
              <Link href="/register" className="block">
                <button className="w-full h-12 flex items-center justify-center gap-2 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white font-semibold rounded-xl transition-all hover:bg-neutral-800/60">
                  <Home className="w-4 h-4" /> New Registration
                </button>
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-700 mt-6">
          MyHealthID · National Health Information System
        </p>
      </div>
    </div>
  );
}
