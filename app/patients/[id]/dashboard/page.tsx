import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, FlaskConical, Pill, ActivitySquare, Clock, FileText, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveQueueStatus } from "@/components/LiveQueueStatus";
import { CheckInButton } from "@/components/CheckInButton";
type TimelineEvent = {
  id: string;
  type: "VITAL" | "LAB" | "PRESCRIPTION" | "EXAM" | "ADMISSION";
  date: Date;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  icon: JSX.Element;
  bgColor: string;
};

export default async function PatientDashboard({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [
        { id: params.id },
        { healthId: params.id }
      ]
    },
    include: {
      vitals: { orderBy: { createdAt: 'desc' } },
      investigations: { orderBy: { createdAt: 'desc' } },
      prescriptions: { orderBy: { createdAt: 'desc' } },
      clinicalExam: true
    }
  });

  if (!patient) return notFound();

  const events: TimelineEvent[] = [];

  // Admission event
  events.push({
    id: `adm-${patient.id}`,
    type: "ADMISSION",
    date: patient.dateOfAdmission || patient.createdAt,
    title: "Patient Registered",
    description: `Registered at ${patient.ward.replace(/_/g, ' ')}. Chief Complaint: ${patient.chiefComplaint || "N/A"}`,
    icon: <User className="w-5 h-5 text-slate-500" />,
    bgColor: "bg-slate-100"
  });

  patient.vitals.forEach((v: any) => events.push({
    id: v.id, 
    type: "VITAL", 
    date: v.createdAt, 
    title: "Vitals Recorded", 
    description: `BP: ${v.bp} | Pulse: ${v.pulse} bpm | Temp: ${v.temp}°C | SpO2: ${v.spO2}%`,
    icon: <HeartPulse className="w-5 h-5 text-rose-500" />,
    bgColor: "bg-rose-100"
  }));

  patient.investigations.forEach((i: any) => events.push({
    id: i.id, 
    type: "LAB", 
    date: i.updatedAt, 
    title: `Lab Test: ${i.testName}`, 
    description: i.status === "COMPLETED" ? `Result: ${i.result}` : "Awaiting sample or processing.", 
    badge: i.status,
    badgeColor: i.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
    icon: <FlaskConical className="w-5 h-5 text-indigo-500" />,
    bgColor: "bg-indigo-100"
  }));

  patient.prescriptions.forEach((p: any) => events.push({
    id: p.id, 
    type: "PRESCRIPTION", 
    date: p.updatedAt, 
    title: `Prescription: ${p.medication || p.drugName}`, 
    description: `Dosage: ${p.dosage} | Freq: ${p.frequency}`, 
    badge: p.status,
    badgeColor: p.status === "DISPENSED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
    icon: <Pill className="w-5 h-5 text-teal-500" />,
    bgColor: "bg-teal-100"
  }));

  if (patient.clinicalExam) {
    events.push({
      id: patient.clinicalExam.id, 
      type: "EXAM", 
      date: patient.clinicalExam.updatedAt, 
      title: "Clinical Examination", 
      description: patient.clinicalExam.clinicalNotes || "General physical examination completed.",
      icon: <ActivitySquare className="w-5 h-5 text-purple-500" />,
      bgColor: "bg-purple-100"
    });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Profile */}
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-3xl font-bold flex items-center gap-3">
                {patient.fullName}
              </CardTitle>
              <CardDescription className="text-base mt-1 flex items-center gap-2">
                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">ID: {patient.healthId}</span>
                {patient.nationalId && <span className="text-slate-500 text-sm">| NID: {patient.nationalId}</span>}
              </CardDescription>
            </div>
            <div className="text-left md:text-right flex flex-col gap-3 items-start md:items-end">
              <div>
                <div className="text-sm font-medium text-slate-600">
                  {patient.age} years old • {patient.sex}
                </div>
                <div className="text-sm text-slate-500">
                  Current Ward: <span className="font-medium text-slate-700">{patient.ward.replace(/_/g, " ")}</span>
                </div>
              </div>
              <CheckInButton patientId={patient.id} />
            </div>
          </CardHeader>
        </Card>

        {/* Live Queue Status Section */}
        <LiveQueueStatus patientId={patient.id} />

        {/* Timeline */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="w-5 h-5 text-slate-500" />
              Patient Clinical Timeline
            </CardTitle>
            <CardDescription>A complete historical record of visits, tests, and prescriptions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8 mt-4">
              {events.length === 0 && (
                <p className="text-slate-400 italic py-4">No events recorded yet.</p>
              )}
              {events.map((ev) => (
                <div key={ev.id} className="relative">
                  <div className={`absolute -left-[35px] top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white ${ev.bgColor}`}>
                    {ev.icon}
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {ev.title}
                        {ev.badge && (
                          <Badge variant="secondary" className={`text-[10px] uppercase font-bold ${ev.badgeColor}`}>
                            {ev.badge}
                          </Badge>
                        )}
                      </h4>
                      <time className="text-xs text-slate-400 font-medium whitespace-nowrap bg-slate-50 px-2 py-1 rounded-md">
                        {ev.date.toLocaleString()}
                      </time>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {ev.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
