import { getReferralSummary } from "@/lib/services/referralSummary.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, User, Building, UserCheck } from "lucide-react";
import { getFacilityServiceTypeTranslation, getHealthcareRoleTranslation } from "@/lib/locales/enums";
import ReferralSummaryTabs from "@/components/ReferralSummaryTabs";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ReferralSummaryPage({ params }: PageProps) {
  const { id } = params;

  let summary: any = null;
  let errorMsg: string | null = null;

  try {
    summary = await getReferralSummary(id);
  } catch (error: any) {
    errorMsg = error.message || "Failed to load referral summary.";
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-neutral-900 border border-red-500/20 shadow-2xl rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <ShieldCheck className="w-8 h-8 rotate-180" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-sm text-neutral-400 leading-relaxed">{errorMsg}</p>
          <div className="pt-4">
            <Link
              href="/doctor/dashboard"
              className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold px-5 py-2.5 rounded-xl border border-neutral-700 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    notFound();
  }

  const {
    patient,
    originOrganization,
    destinationOrganization,
    issuedByUser,
    documentHash,
    clinicalSnapshot,
    createdAt,
  } = summary;

  const originFacilityTier = getFacilityServiceTypeTranslation(originOrganization.serviceType as any, "en");
  const destinationFacilityName = destinationOrganization?.name || "Open Route / Any Facility";
  
  const clinicianName = issuedByUser
    ? `${issuedByUser.firstName} ${issuedByUser.lastName}`
    : "Unknown Clinician";
  
  const clinicianRole = issuedByUser
    ? getHealthcareRoleTranslation(issuedByUser.role as any, "en")
    : "Clinician";

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Row */}
      <div className="border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <Link
          href="/doctor/dashboard"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Doctor Dashboard</span>
        </Link>
        <div className="text-xs text-neutral-500 font-mono">
          Ref ID: <span className="text-neutral-400 font-bold">{id}</span>
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8 z-10">
        
        {/* Main Header / Patient Context */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Patient Card */}
          <div className="md:col-span-2 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Patient Identification</p>
                <h1 className="text-2xl font-black text-white mt-1 truncate leading-snug">{patient.fullName}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-neutral-400">
                  <span className="font-mono text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 font-bold">
                    {patient.healthId}
                  </span>
                  <span>·</span>
                  <span>{patient.sex}</span>
                  <span>·</span>
                  <span>{patient.age} years old</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-neutral-800/60 text-xs">
              <div>
                <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Origin Facility (Sending)</p>
                <p className="text-neutral-200 font-semibold mt-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  {originOrganization.name}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">{originFacilityTier}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Destination Facility (Target)</p>
                <p className="text-neutral-200 font-semibold mt-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-400" />
                  {destinationFacilityName}
                </p>
                {destinationOrganization && (
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {getFacilityServiceTypeTranslation(destinationOrganization.serviceType as any, "en")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Clinician & Integrity Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg">
            <div>
              <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Referring Clinician</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-neutral-300">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-200">{clinicianName}</p>
                  <p className="text-[10px] text-neutral-500 font-medium mt-0.5">{clinicianRole}</p>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 font-mono mt-3">Issued: {formattedDate}</p>
            </div>

            {/* Lock/Shield Badge representing documentHash */}
            <div className="mt-6 pt-4 border-t border-neutral-800/60">
              <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-2xl border border-emerald-500/20 shadow-inner">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Integrity Verified</p>
                  <p className="text-[9px] font-mono text-emerald-400/80 truncate mt-0.5 font-bold" title={documentHash}>
                    SHA256: {documentHash}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Tabbed Snapshot View */}
        <ReferralSummaryTabs clinicalSnapshot={clinicalSnapshot} />

      </div>
    </div>
  );
}
