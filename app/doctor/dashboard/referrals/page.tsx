import { getFacilityReferralSummaries } from "@/lib/services/referralSummary.service";
import Link from "next/link";
import { ArrowLeft, Send, Inbox, ShieldCheck, User, Building2, Clock, ExternalLink } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CLINICAL_ROLES, ADMIN_ROLES } from "@/lib/locales/enums";

export const dynamic = "force-dynamic";

export default async function ReferralsListPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userOrgId = cookieStore.get("organizationId")?.value;

  if (!userRole) redirect("/login");
  if (!CLINICAL_ROLES.includes(userRole as any) && !ADMIN_ROLES.includes(userRole as any)) {
    redirect("/unauthorized?reason=Clinician+role+required");
  }

  let summaries: any[] = [];
  let errorMsg: string | null = null;

  try {
    summaries = await getFacilityReferralSummaries();
  } catch (e: any) {
    errorMsg = e.message || "Failed to load referral summaries.";
  }

  const sent = summaries.filter((s) => s.originOrganizationId === userOrgId);
  const received = summaries.filter((s) => s.destinationOrganizationId === userOrgId && s.originOrganizationId !== userOrgId);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-orange-500/5 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[130px]" />
      </div>

      {/* Top bar */}
      <header className="border-b border-neutral-800 bg-neutral-900/70 backdrop-blur-md px-6 py-3.5 flex items-center justify-between z-10 shrink-0">
        <Link
          href="/doctor/dashboard"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group font-semibold text-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Doctor Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
          Referral Summaries
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 space-y-8 z-10">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-black text-white">Cross-Facility Referrals</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Verified clinical referral summaries issued or received by your facility.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl px-5 py-4 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Referrals", value: summaries.length, color: "text-white", icon: ShieldCheck },
            { label: "Sent by Us", value: sent.length, color: "text-orange-400", icon: Send },
            { label: "Received", value: received.length, color: "text-blue-400", icon: Inbox },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">{label}</p>
                <p className={`text-xl font-black ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {summaries.length === 0 && !errorMsg && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-neutral-600" />
            </div>
            <p className="text-neutral-400 text-sm font-semibold">No referral summaries yet.</p>
            <p className="text-neutral-600 text-xs max-w-sm">
              Issue a referral from a patient chart and a cryptographic summary will appear here.
            </p>
          </div>
        )}

        {/* Sent */}
        {sent.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
              <Send className="w-3.5 h-3.5" /> Sent by Your Facility ({sent.length})
            </h2>
            <div className="space-y-3">
              {sent.map((s) => (
                <ReferralRow key={s.id} summary={s} direction="sent" />
              ))}
            </div>
          </section>
        )}

        {/* Received */}
        {received.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5" /> Received by Your Facility ({received.length})
            </h2>
            <div className="space-y-3">
              {received.map((s) => (
                <ReferralRow key={s.id} summary={s} direction="received" />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900/50 px-6 py-2.5 flex items-center justify-between text-[10px] text-neutral-600 shrink-0 z-10">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          All documents are SHA-256 integrity sealed
        </span>
        <span>MyHealthID Referral System</span>
      </footer>
    </div>
  );
}

function ReferralRow({ summary, direction }: { summary: any; direction: "sent" | "received" }) {
  const { id, patient, originOrganization, destinationOrganization, issuedByUser, createdAt, documentHash } = summary;

  const clinicianName = issuedByUser
    ? `${issuedByUser.firstName} ${issuedByUser.lastName}`
    : "Unknown";

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const destName = destinationOrganization?.name || "Open Route";
  const isSent = direction === "sent";

  return (
    <div className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 transition-all">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Patient + facility */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
            isSent
              ? "bg-orange-500/10 border-orange-500/25"
              : "bg-blue-500/10 border-blue-500/25"
          }`}>
            <User className={`w-4 h-4 ${isSent ? "text-orange-400" : "text-blue-400"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-white text-sm truncate">{patient.fullName}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-neutral-500">
              <span className="font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
                {patient.healthId}
              </span>
              <span>·</span>
              <span>{patient.sex}</span>
              <span>·</span>
              <span>{patient.age}y</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]">
              <span className="flex items-center gap-1 text-neutral-500">
                <Building2 className="w-3 h-3 text-neutral-600" />
                <span className="text-neutral-400">{originOrganization.name}</span>
                <span className="text-neutral-600">→</span>
                <span className="text-neutral-300 font-semibold">{destName}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-600">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedDate}
              </span>
              <span>·</span>
              <span>By {clinicianName}</span>
            </div>
          </div>
        </div>

        {/* Right: hash + link */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link
            href={`/doctor/dashboard/referrals/${id}`}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-lg transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            View
          </Link>
          <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-mono">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span className="truncate max-w-[90px]" title={documentHash}>
              {documentHash.slice(0, 10)}…
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
