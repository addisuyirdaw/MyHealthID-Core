import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, FlaskConical, Pill, ActivitySquare, Clock, User, ClipboardList, PenTool, AlertTriangle, Droplet, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import existing Modals to use as the Action Toolkit
import { OrderTestModal } from "@/components/OrderTestModal";
import { AddVitalsModal } from "@/components/AddVitalsModal";
import { PrescribeModal } from "@/components/PrescribeModal";
import { ClinicalExamModal } from "@/components/ClinicalExamModal";
import { ReferModal } from "@/components/ReferModal";
import { revalidatePath } from "next/cache";

type TimelineEvent = {
  id: string;
  type: string;
  date: Date;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  icon: JSX.Element;
  bgColor: string;
};

export default async function DoctorPatientView({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findFirst({
    where: { id: params.id },
    include: {
      vitals: { orderBy: { createdAt: 'desc' } },
      investigations: { orderBy: { createdAt: 'desc' } },
      prescriptions: { orderBy: { createdAt: 'desc' } },
      clinicalExam: true
    }
  });

  if (!patient) return notFound();

  // Server action to append medical note easily
  async function addMedicalNote(formData: FormData) {
    "use server";
    const note = formData.get("note") as string;
    const category = formData.get("category") as string || "General";
    if (!note || note.trim() === "") return;

    // We merge the new note into the detailedSituation to maintain a running log, 
    // or upsert into clinicalExam. Since this is an appended note, detailedSituation is perfect.
    const existingNotes = patient?.detailedSituation || "";
    const stamp = new Date().toLocaleString();
    const newSituation = `${existingNotes}\n\n[${category} Note - ${stamp}]\n${note.trim()}`.trim();

    await prisma.patient.update({
      where: { id: patient?.id },
      data: { detailedSituation: newSituation }
    });

    revalidatePath(`/doctor/patient/${patient?.id}`);
  }

  // Generate Timeline
  const events: TimelineEvent[] = [];

  events.push({
    id: `adm-${patient.id}`,
    type: "ADMISSION",
    date: patient.dateOfAdmission || patient.createdAt,
    title: "Patient Registered",
    description: `Assigned Ward: ${patient.ward.replace(/_/g, ' ')}\nChief Complaint: ${patient.chiefComplaint || "N/A"}`,
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
    title: `Lab Test Ordered: ${i.testName}`, 
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
    title: `Prescribed: ${p.medication || p.drugName}`, 
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
      title: "Clinical Exam Recorded", 
      description: patient.clinicalExam.clinicalNotes || "Exam completed. Check modal for details.",
      icon: <ActivitySquare className="w-5 h-5 text-purple-500" />,
      bgColor: "bg-purple-100"
    });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col gap-6">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center w-full">
        <Link href="/doctor/search">
          <Button variant="outline" className="text-slate-600 bg-white shadow-sm border-slate-200 hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Search
          </Button>
        </Link>
      </div>

      {/* Emergency Header */}
      <div className="w-full bg-red-50 border border-red-500 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-red-500 p-3 rounded-full text-white shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-red-800 font-bold text-lg uppercase tracking-wider">Critical Medical Alerts</h3>
            <div className="flex flex-wrap gap-4 mt-1 font-semibold text-red-700">
              <span className="flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded-md"><Droplet className="w-4 h-4"/> Blood Group: Not Recorded</span>
              <span className="flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded-md">Allergies: {patient.allergyInformation || "None Known"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full">
        {/* LEFT COLUMN - Profile, Form, Actions */}
        <div className="w-full md:w-5/12 lg:w-1/3 flex flex-col gap-6">
        
        {/* Medical Profile Summary */}
        <Card className="border-t-4 border-t-blue-600 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex flex-col items-start gap-1">
              {patient.fullName}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-mono text-blue-700 bg-blue-50">
                  {patient.healthId}
                </Badge>
                {patient.nationalId && <span className="text-xs text-slate-400 font-mono">NID: {patient.nationalId}</span>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm py-2 border-b border-slate-100">
              <span className="text-slate-500">Demographics</span>
              <span className="font-medium text-slate-800">{patient.age} yrs • {patient.sex}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-slate-100">
              <span className="text-slate-500">Current Ward</span>
              <span className="font-medium text-slate-800">{patient.ward.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-slate-100">
              <span className="text-slate-500">Triage Status</span>
              <Badge variant="outline" className={`${
                patient.triageStatus === 'RED' ? 'bg-red-50 text-red-700 border-red-200' :
                patient.triageStatus === 'YELLOW' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-green-50 text-green-700 border-green-200'
              }`}>{patient.triageStatus}</Badge>
            </div>
            {patient.allergyInformation && (
              <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
                <strong>Allergies:</strong> {patient.allergyInformation}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctor Action Toolkit */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PenTool className="w-4 h-4 text-slate-500" />
              Medical Interventions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-3">
            <ClinicalExamModal patientId={patient.id} patientName={patient.fullName} />
            <AddVitalsModal patientId={patient.id} patientName={patient.fullName} />
            <OrderTestModal patientId={patient.id} patientName={patient.fullName} />
            <PrescribeModal patientId={patient.id} patientName={patient.fullName} patientAllergies={patient.allergyInformation} />
            <ReferModal patientId={patient.id} patientName={patient.fullName} />
          </CardContent>
        </Card>

        {/* New Medical Note Form */}
        <Card className="shadow-sm border-blue-100 bg-blue-50/30">
          <form action={addMedicalNote}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-blue-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                Quick Medical Note
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <Select name="category" defaultValue="General">
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General Note</SelectItem>
                    <SelectItem value="Prescription">Prescription Update</SelectItem>
                    <SelectItem value="Lab Result">Lab Result Review</SelectItem>
                    <SelectItem value="Vaccination">Vaccination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea 
                name="note" 
                placeholder="Type your medical observations or updates here..." 
                className="min-h-[100px] bg-white resize-none" 
                required 
              />
              <Button type="submit" className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                Append to Record
              </Button>
            </CardContent>
          </form>
        </Card>

      </div>
      
      {/* RIGHT COLUMN - Timeline */}
      <div className="w-full md:w-7/12 lg:w-2/3">
        <Card className="h-full shadow-md">
          <CardHeader className="border-b border-slate-100 bg-white">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock className="w-5 h-5 text-slate-500" />
              Master Clinical Timeline
            </CardTitle>
            <CardDescription>Comprehensive chronological record showing all doctor inputs.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 bg-slate-50/50">
            
            {/* Show detailed situation if notes exist */}
            {patient.detailedSituation && (
              <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl shadow-sm">
                <h4 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-2">Ongoing Clinical Notes</h4>
                <p className="text-sm text-yellow-900 whitespace-pre-wrap leading-relaxed font-medium">
                  {patient.detailedSituation}
                </p>
              </div>
            )}

            <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8 mt-4 pb-8">
              {events.length === 0 && (
                <p className="text-slate-400 italic py-4">No events recorded yet.</p>
              )}
              {events.map((ev) => (
                <div key={ev.id} className="relative">
                  <div className={`absolute -left-[35px] top-1 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white ${ev.bgColor} shadow-sm`}>
                    {ev.icon}
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {ev.title}
                        {ev.badge && (
                          <Badge variant="secondary" className={`text-[10px] uppercase font-bold ${ev.badgeColor}`}>
                            {ev.badge}
                          </Badge>
                        )}
                      </h4>
                      <time className="text-xs text-slate-500 font-medium whitespace-nowrap bg-slate-100 px-2 py-1 rounded-md">
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
    </div>
  );
}
