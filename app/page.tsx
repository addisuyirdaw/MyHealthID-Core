import prisma from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { HeartPulse, ShieldCheck, Activity, Users, Stethoscope } from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";

export default async function Home() {
  const patientCount = await prisma.patient.count();
  const cookieStore = cookies();
  const userRole = cookieStore.get('userRole')?.value;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <main className="max-w-5xl mx-auto px-4 md:px-8 w-full relative z-10 py-12">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-3xl shadow-xl flex items-center gap-3 ring-4 ring-slate-100">
              <HeartPulse className="w-10 h-10 text-blue-600" />
              <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 leading-none">
                MyHealth<span className="text-blue-600">ID</span>
              </h1>
            </div>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            <LocalizedText tKey="landing.title" />
          </h2>
          
          <p className="text-lg md:text-xl text-slate-600 font-medium pb-2 max-w-2xl mx-auto">
            <LocalizedText tKey="landing.subtitle" />
          </p>

          <div className="bg-white/80 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-6 md:p-8 max-w-lg mx-auto transform transition duration-500 hover:scale-105">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center justify-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> Live National Impact
            </h3>
            <div className="flex flex-col items-center justify-center">
              <span className="text-6xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                {patientCount.toLocaleString()}
              </span>
              <span className="text-slate-600 font-medium mt-2 flex items-center justify-center gap-1.5 w-full">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" /> <span className="truncate">Citizens Digitized on MyHealthID</span>
              </span>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto">
            <Link href="/register" className="w-full">
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-lg h-14">
                <Users className="w-5 h-5 mr-2" /> <LocalizedText tKey="landing.registerCitizen" />
              </Button>
            </Link>
            {(userRole === 'DOCTOR' || userRole === 'ADMIN') ? (
                <Link href="/doctor/search" className="w-full">
                  <Button size="lg" variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 text-lg h-14 bg-white">
                    <Stethoscope className="w-5 h-5 mr-2" /> Doctor Portal
                  </Button>
                </Link>
            ) : (
                <Link href="/login" className="w-full">
                  <Button size="lg" variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 text-lg h-14 bg-white">
                    <ShieldCheck className="w-5 h-5 mr-2" /> <LocalizedText tKey="landing.healthcareLogin" />
                  </Button>
                </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
