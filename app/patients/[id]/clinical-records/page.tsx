import prisma from "@/lib/prisma";
import React from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_ROLES, CLINICAL_ROLES, normalizeHealthcareRole } from "@/lib/locales/enums";
import { HeartPulse, FlaskConical, Pill, ActivitySquare, Clock, FileText, User, ShieldAlert, Lock } from "lucide-react";
import { LiveQueueStatus } from "@/components/LiveQueueStatus";
import { CheckInButton } from "@/components/CheckInButton";
import BreakGlassClient from "@/components/BreakGlassClient";
import { Role } from "@prisma/client";
import { verifyToken } from "@/lib/session";

type TimelineEvent = {
  id: string;
  type: "VITAL" | "LAB" | "PRESCRIPTION" | "EXAM" | "ADMISSION";
  date: Date;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  dotColor: string;
  accentColor: string;
};

export default async function ClinicalRecordsDashboard({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { override?: string };
}) {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: params.id }, { healthId: params.id }] },
    include: {
      vitals: { orderBy: { createdAt: "desc" } },
      investigations: { orderBy: { createdAt: "desc" } },
      prescriptions: { orderBy: { createdAt: "desc" } },
      clinicalExam: true,
    },
  });

  if (!patient) return notFound();

  const cookieStore = cookies();
  const viewerRole = cookieStore.get("userRole")?.value || "UNKNOWN";
  const isCitizen = viewerRole === "CITIZEN";
  const isClinicalUser = CLINICAL_ROLES.includes(viewerRole as any) || ADMIN_ROLES.includes(viewerRole as any);
  const hasOverride = searchParams.override === "1";

  // Citizen session token security check
  if (isCitizen) {
    const sessionToken = cookieStore.get("citizenSessionToken")?.value;
    const payload = sessionToken ? verifyToken(sessionToken) : null;
    if (!payload || payload.patientId !== patient.id) {
      redirect("/signin");
    }
  }

  if (!isCitizen && isClinicalUser && patient.isRestricted && !hasOverride) {
    return <BreakGlassClient patientId={patient.id} patientName={patient.fullName} />;
  }

  if (isClinicalUser && !hasOverride) {
    try {
      const clinicianName = cookieStore.get("professionalName")?.value || "Dr. Dawit Tadesse";
      const userId = cookieStore.get("userId")?.value || "";
      const organizationId = cookieStore.get("organizationId")?.value || patient.organizationId || "";
      const normalizedRole = normalizeHealthcareRole(viewerRole) as Role;

      let facilityServiceType = undefined;
      if (organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { serviceType: true },
        });
        facilityServiceType = org?.serviceType || undefined;
      }

      await prisma.accessLog.create({
        data: {
          patientId: patient.id,
          userId: userId || undefined,
          organizationId: organizationId || undefined,
          accessedByName: clinicianName,
          role: normalizedRole,
          facilityServiceType: facilityServiceType,
          action: "VIEW",
        },
      });
    } catch {
      // Non-blocking
    }
  }

  const organizations = await prisma.organization.findMany({ select: { id: true, name: true } });
  const orgMap = Object.fromEntries(organizations.map((o) => [o.id, o.name]));

  const formatFacilityName = (orgId: string | null | undefined) => {
    if (!orgId) return null;
    if (orgMap[orgId]) return orgMap[orgId];
    return orgId
      .split("-")
      .filter((part) => part.toUpperCase() !== "MH")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  };

  // Build timeline
  const events: TimelineEvent[] = [];

  events.push({
    id: `adm-${patient.id}`,
    type: "ADMISSION",
    date: patient.dateOfAdmission || patient.createdAt,
    title: "Patient Registered",
    description: `Registered at ${patient.ward.replace(/_/g, " ")}. Chief Complaint: ${patient.chiefComplaint || "N/A"}`,
    icon: <User className="w-4 h-4 text-neutral-300" />,
    dotColor: "bg-neutral-600",
    accentColor: "border-neutral-700",
  });

  patient.vitals.forEach((v: any) =>
    events.push({
      id: v.id,
      type: "VITAL",
      date: v.createdAt,
      title: "Vitals Recorded",
      description: `BP: ${v.bp} | Pulse: ${v.pulse} bpm | Temp: ${v.temp}°C | SpO₂: ${v.spO2}%`,
      badge: formatFacilityName(v.organizationId) ? `Origin: ${formatFacilityName(v.organizationId)}` : undefined,
      icon: <HeartPulse className="w-4 h-4 text-rose-400" />,
      dotColor: "bg-rose-500",
      accentColor: "border-rose-500/30",
    })
  );

  patient.investigations.forEach((i: any) =>
    events.push({
      id: i.id,
      type: "LAB",
      date: i.updatedAt,
      title: `Lab Test: ${i.testName}`,
      description: i.status === "COMPLETED" ? `Result: ${i.result}` : "Awaiting sample or processing.",
      badge: formatFacilityName(i.organizationId) ? `Origin: ${formatFacilityName(i.organizationId)}` : i.status,
      badgeColor: i.status === "COMPLETED" ? "bg-emerald-900/50 text-emerald-300 border-emerald-500/30" : "bg-amber-900/50 text-amber-300 border-amber-500/30",
      icon: <FlaskConical className="w-4 h-4 text-indigo-400" />,
      dotColor: "bg-indigo-500",
      accentColor: "border-indigo-500/30",
    })
  );

  patient.prescriptions.forEach((p: any) =>
    events.push({
      id: p.id,
      type: "PRESCRIPTION",
      date: p.updatedAt,
      title: `Prescription: ${p.drugName}`,
      description: `Dosage: ${p.dosage} | Freq: ${p.frequency}`,
      badge: formatFacilityName(p.organizationId) ? `Origin: ${formatFacilityName(p.organizationId)}` : p.status,
      badgeColor: p.status === "DISPENSED" ? "bg-emerald-900/50 text-emerald-300 border-emerald-500/30" : "bg-amber-900/50 text-amber-300 border-amber-500/30",
      icon: <Pill className="w-4 h-4 text-teal-400" />,
      dotColor: "bg-teal-500",
      accentColor: "border-teal-500/30",
    })
  );

  if (patient.clinicalExam) {
    events.push({
      id: patient.clinicalExam.id,
      type: "EXAM",
      date: patient.clinicalExam.updatedAt,
      title: "Clinical Examination",
      description: patient.clinicalExam.clinicalNotes || "General physical examination completed.",
      badge: formatFacilityName(patient.clinicalExam.organizationId)
        ? `Origin: ${formatFacilityName(patient.clinicalExam.organizationId)}`
        : undefined,
      icon: <ActivitySquare className="w-4 h-4 text-purple-400" />,
      dotColor: "bg-purple-500",
      accentColor: "border-purple-500/30",
    });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Emergency Break-Glass Banner */}
        {hasOverride && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-950/40 px-6 py-4">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="font-black text-red-300">Emergency Break-Glass Override Active</p>
              <p className="text-red-400/70 text-sm">This access has been permanently logged in the patient's audit trail.</p>
            </div>
          </div>
        )}

        {/* Hero welcome banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-900/60 to-indigo-900/50 border border-blue-500/20 p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 pointer-events-none" />
          <div className="absolute -top-8 -right-8 w-48 h-48 opacity-5">
            <User className="w-full h-full" />
          </div>
          <div className="relative z-10">
            <p className="text-blue-300 text-sm font-semibold mb-1">MyHealthID Clinical Record</p>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              Welcome back, {patient.fullName.split(" ")[0]}!
            </h1>
            <p className="text-blue-200/70 text-base">Your live clinical dashboard and secure medical record.</p>
          </div>
        </div>

        {/* Patient identity card */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row justify-between gap-5 md:items-center">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{patient.fullName}</h2>
                {patient.isRestricted && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-900/40 text-red-300 border-red-500/30">
                    <Lock className="w-2.5 h-2.5" /> Restricted
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  ID: {patient.healthId}
                </span>
                {patient.nationalId && (
                  <span className="text-neutral-500 text-xs">NID: {patient.nationalId}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-start md:items-end">
              <div className="text-sm text-neutral-400">
                <span className="font-semibold text-neutral-300">{patient.age}</span> years ·{" "}
                <span className="font-semibold text-neutral-300">{patient.sex}</span>
              </div>
              <div className="text-xs text-neutral-500">
                Ward: <span className="font-semibold text-neutral-300">{patient.ward.replace(/_/g, " ")}</span>
              </div>
              <CheckInButton patientId={patient.id} />
            </div>
          </div>
        </div>

        {/* Privacy control link for citizens */}
        {isCitizen && (
          <a
            href={`/patients/${patient.id}/privacy`}
            className="flex items-center justify-between bg-indigo-950/40 border border-indigo-500/20 rounded-2xl px-6 py-4 hover:bg-indigo-950/60 transition-colors group"
          >
            <div>
              <p className="font-bold text-indigo-300">🔐 Privacy & Data Control</p>
              <p className="text-indigo-400/70 text-sm">Manage who can see your records · ግላዊነት እና የዳታ ቁጥጥር</p>
            </div>
            <span className="text-indigo-400 group-hover:translate-x-1 transition-transform text-xl">→</span>
          </a>
        )}

        {/* Live queue status */}
        <LiveQueueStatus patientId={patient.id} />

        {/* Clinical Timeline */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-5 border-b border-neutral-800">
            <Clock className="w-5 h-5 text-neutral-500" />
            <div>
              <h3 className="text-base font-bold text-white">Patient Clinical Timeline</h3>
              <p className="text-xs text-neutral-500">Complete historical record of visits, tests, and prescriptions.</p>
            </div>
          </div>

          <div className="px-6 py-6">
            {events.length === 0 && (
              <div className="py-12 text-center">
                <FileText className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                <p className="text-neutral-500 italic">No events recorded yet.</p>
              </div>
            )}

            <div className="relative">
              {/* Timeline vertical line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-neutral-800" />

              <div className="space-y-6">
                {events.map((ev) => (
                  <div key={ev.id} className="relative pl-12">
                    {/* Dot */}
                    <div className={`absolute left-[9px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-neutral-950 ${ev.dotColor}`} />

                    {/* Card */}
                    <div className={`rounded-2xl border bg-neutral-900/80 p-4 hover:bg-neutral-900 transition-colors ${ev.accentColor}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                            {ev.icon}
                          </div>
                          <h4 className="font-bold text-neutral-200 text-sm">{ev.title}</h4>
                          {ev.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ev.badgeColor ?? "bg-neutral-800 text-neutral-400 border-neutral-700"}`}>
                              {ev.badge}
                            </span>
                          )}
                        </div>
                        <time className="text-[10px] text-neutral-600 font-mono whitespace-nowrap bg-neutral-800/60 px-2 py-1 rounded-lg shrink-0">
                          {ev.date.toLocaleString()}
                        </time>
                      </div>
                      <p className="text-neutral-400 text-sm leading-relaxed whitespace-pre-wrap pl-9">
                        {ev.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
