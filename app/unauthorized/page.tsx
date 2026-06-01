"use client";

import { Shield, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ROLE_HOME: Record<string, string> = {
  HOSPITAL_CEO: "/admin/dashboard",
  IT_HIS_ADMIN: "/admin/dashboard",
  GENERAL_PRACTITIONER: "/doctor/dashboard",
  MEDICAL_SPECIALIST: "/doctor/dashboard",
  SUB_SPECIALIST: "/doctor/dashboard",
  HEALTH_OFFICER: "/doctor/dashboard",
  CLINICAL_NURSE: "/triage",
  SPECIALIZED_NURSE: "/triage",
  MIDWIFE: "/triage",
  RECEPTIONIST: "/register",
  CARD_ROOM_CLERK: "/register",
  LABORATORY_TECHNICIAN: "/lab",
  LABORATORY_TECHNOLOGIST: "/lab",
  PHARMACIST: "/pharmacy",
  // backward compatible legacy values
  ADMIN: "/admin/dashboard",
  DOCTOR: "/doctor/dashboard",
  NURSE: "/triage",
  LAB_TECH: "/lab",
};

const ROLE_LABELS: Record<string, string> = {
  HOSPITAL_CEO: "Hospital CEO",
  IT_HIS_ADMIN: "IT / HIS Administrator",
  GENERAL_PRACTITIONER: "General Practitioner",
  MEDICAL_SPECIALIST: "Medical Specialist",
  SUB_SPECIALIST: "Sub-Specialist",
  HEALTH_OFFICER: "Health Officer",
  CLINICAL_NURSE: "Clinical Nurse",
  SPECIALIZED_NURSE: "Specialized Nurse",
  MIDWIFE: "Midwife",
  RECEPTIONIST: "Receptionist",
  CARD_ROOM_CLERK: "Card Room Clerk",
  LABORATORY_TECHNICIAN: "Laboratory Technician",
  LABORATORY_TECHNOLOGIST: "Laboratory Technologist",
  PHARMACIST: "Pharmacist",
  // backward compatible legacy labels
  ADMIN: "Administrator",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  LAB_TECH: "Lab Technician",
};

function getRoleFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((r) => r.startsWith("userRole="));
  return match ? match.split("=")[1] : "";
}

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason")?.replace(/\+/g, " ") || "You do not have the required permissions to view this section.";

  const role = typeof window !== "undefined" ? getRoleFromCookie() : "";
  const roleLabel = ROLE_LABELS[role] || role;
  const homeRoute = ROLE_HOME[role] || "/login";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-800/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center ring-8 ring-rose-500/5">
                <Shield className="w-12 h-12 text-rose-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center border-2 border-slate-900">
                <span className="text-white font-black text-xs">!</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">
            Access Denied
          </h1>

          {/* Role chip */}
          {roleLabel && (
            <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Logged in as: {roleLabel}
            </div>
          )}

          {/* Reason */}
          <p className="text-slate-400 text-sm leading-relaxed mb-8 px-2">
            {reason}
          </p>

          {/* Divider */}
          <div className="border-t border-slate-800 mb-6" />

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => router.push(homeRoute)}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition"
            >
              <Home className="w-4 h-4 mr-2" />
              {role ? `Go to My Dashboard (${roleLabel})` : "Go to Login"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          {/* Footer */}
          <p className="text-[11px] text-slate-600 mt-6">
            If you believe this is an error, contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}
