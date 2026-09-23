"use client";

import { RegistrationShell } from "@/components/registration/RegistrationShell";
import { UniversalNavigation } from "@/components/navigation/UniversalNavigation";
import Link from "next/link";
import { HeartPulse } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen">
      <UniversalNavigation isFloating />
      <div className="fixed top-4 right-4 z-[9999]">
        <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity bg-white/80 backdrop-blur-sm p-2 rounded-xl shadow-sm border border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-slate-900 font-bold text-lg leading-none">MyHealthID</p>
          </div>
        </Link>
      </div>
      <RegistrationShell />
    </div>
  );
}