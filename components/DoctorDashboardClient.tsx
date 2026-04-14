"use client";

import React, { useState, useMemo } from "react";
import { Ward } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  HeartPulse, FlaskConical, Pill, ActivitySquare, Clock, User, 
  AlertTriangle, Droplet, ArrowLeft, Send, CheckCircle2, Search,
  PhoneCall, Stethoscope, ClipboardCheck
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderTestModal } from "@/components/OrderTestModal";
import { AddVitalsModal } from "@/components/AddVitalsModal";
import { PrescribeModal } from "@/components/PrescribeModal";
import { ClinicalExamModal } from "@/components/ClinicalExamModal";
import { ReferModal } from "@/components/ReferModal";
import { callNextPatient, finishPatientVisit } from "@/lib/actions/queue.actions";
import { getPatientsByWard, searchPatients } from "@/lib/actions/patient.actions";
import { useRouter } from "next/navigation";

type Patient = any; // You can import the full prisma type if available

export default function DoctorDashboardClient({
  initialPatients,
  currentWard,
  searchQuery,
  role
}: {
  initialPatients: Patient[];
  currentWard: Ward;
  searchQuery: string;
  role: string | undefined;
}) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // When props change (e.g. ward switch or search), reset list and selection
  React.useEffect(() => {
    setPatients(initialPatients);
  }, [initialPatients]);

  // Polling: Fetch patients every 5 seconds
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const fetchPatients = async () => {
      try {
        const fetchedPatients = searchQuery 
          ? await searchPatients(searchQuery)
          : await getPatientsByWard(currentWard as Ward);
        setPatients(fetchedPatients);
      } catch (error) {
        console.error("Failed to fetch patients", error);
      }
    };

    interval = setInterval(fetchPatients, 5000);
    return () => clearInterval(interval);
  }, [currentWard, searchQuery]);

  // Auto-Load Logic: If no patient is selected and the queue has patients, select the first one (Position #1)
  React.useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  const selectedPatient = useMemo(() => 
    patients.find(p => p.id === selectedPatientId) || null
  , [patients, selectedPatientId]);

  const handleWardChange = (ward: string) => {
    router.push(`/doctor/dashboard?ward=${ward}`);
    setSelectedPatientId(null);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = new FormData(e.currentTarget).get("search") as string;
    if (query) {
      router.push(`/doctor/dashboard?search=${encodeURIComponent(query)}`);
    } else {
      router.push(`/doctor/dashboard?ward=${currentWard}`);
    }
    setSelectedPatientId(null);
  };

  const onCallNext = async () => {
    if (!selectedPatient) return;
    setIsCalling(true);
    const res = await callNextPatient(selectedPatient.id);
    if (res.success) {
      alert(res.message);
      setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, examStatus: "IN_PROGRESS" } : p));
    } else {
      alert(res.message);
    }
    setIsCalling(false);
  };

  const onFinishVisit = async () => {
    if (!selectedPatient) return;
    setIsFinishing(true);
    const res = await finishPatientVisit(selectedPatient.id);
    if (res.success) {
      alert("Visit marked as finished. Patient discharged from queue.");
      // Auto-Next Logic: Remove finished patient and automatically select the next one
      const remainingPatients = patients.filter(p => p.id !== selectedPatient.id);
      setPatients(remainingPatients);
      
      if (remainingPatients.length > 0) {
        setSelectedPatientId(remainingPatients[0].id);
      } else {
        setSelectedPatientId(null);
      }
    } else {
      alert(res.message);
    }
    setIsFinishing(false);
  };

  // Build events for the selected patient
  const events = useMemo(() => {
    if (!selectedPatient) return [];
    const evs: any[] = [];
    
    evs.push({
      id: `adm-${selectedPatient.id}`,
      type: "ADMISSION",
      date: selectedPatient.dateOfAdmission || selectedPatient.createdAt,
      title: "Patient Registered",
      description: `Chief Complaint: ${selectedPatient.chiefComplaint || "N/A"}\nReason: ${selectedPatient.reasonForVisit || "N/A"}`,
      icon: <User className="w-5 h-5 text-slate-500" />,
      bgColor: "bg-slate-100"
    });

    if (selectedPatient.vitals) {
      selectedPatient.vitals.forEach((v: any) => evs.push({
        id: v.id, 
        type: "VITAL", 
        date: v.createdAt, 
        title: "Vitals Recorded", 
        description: `BP: ${v.bp} | Pulse: ${v.pulse} bpm | Temp: ${v.temp}°C | SpO2: ${v.spO2}%`,
        icon: <HeartPulse className="w-5 h-5 text-rose-500" />,
        bgColor: "bg-rose-100"
      }));
    }

    if (selectedPatient.investigations) {
      selectedPatient.investigations.forEach((i: any) => evs.push({
        id: i.id, 
        type: "LAB", 
        date: i.updatedAt, 
        title: `Lab Test: ${i.testName}`, 
        description: i.status === "COMPLETED" ? `Result: ${i.result}` : "Awaiting processing.", 
        badge: i.status,
        badgeColor: i.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
        icon: <FlaskConical className="w-5 h-5 text-indigo-500" />,
        bgColor: "bg-indigo-100"
      }));
    }

    if (selectedPatient.prescriptions) {
      selectedPatient.prescriptions.forEach((p: any) => evs.push({
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
    }

    if (selectedPatient.clinicalExam) {
      evs.push({
        id: selectedPatient.clinicalExam.id, 
        type: "EXAM", 
        date: selectedPatient.clinicalExam.updatedAt, 
        title: "Clinical Exam Recorded", 
        description: selectedPatient.clinicalExam.clinicalNotes || "Exam summary recorded.",
        icon: <ActivitySquare className="w-5 h-5 text-purple-500" />,
        bgColor: "bg-purple-100"
      });
    }

    // Sort by most recent first
    evs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return evs;
  }, [selectedPatient]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-sm md:text-base">
      
      {/* LEFT: Live Queue Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 hidden md:flex h-full">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-6 h-6 text-indigo-600" /> Live Queue
          </h2>
          
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                name="search"
                type="text"
                placeholder="Search Patient..."
                defaultValue={searchQuery}
                className="pl-9 bg-slate-50 border-slate-200 w-full"
              />
            </div>
          </form>

          <Select value={currentWard} onValueChange={handleWardChange}>
            <SelectTrigger className="w-full bg-slate-50 border-slate-200 font-medium text-slate-700">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              {[
                { id: "OPD_OUTPATIENT", name: "OPD / Outpatient" },
                { id: "EMERGENCY", name: "Emergency" },
                { id: "MEDICAL_WARD", name: "Medical Ward" },
                { id: "SURGICAL_WARD", name: "Surgical Ward" },
                { id: "PEDIATRIC_WARD", name: "Pediatric Ward" },
                { id: "MATERNITY_WARD", name: "Maternity Ward" },
              ].map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {patients.length === 0 ? (
            <div className="text-center text-slate-400 p-6 mt-10">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No patients in queue</p>
            </div>
          ) : (
            patients.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPatientId === p.id 
                    ? "bg-blue-600 border-blue-700 shadow-md text-white"
                    : "bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50"
                } ${selectedPatientId !== p.id ? (p.triageStatus === 'RED' ? 'border-l-4 border-l-red-500' : p.triageStatus === 'YELLOW' ? 'border-l-4 border-l-yellow-400' : 'border-l-4 border-l-green-500') : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-bold line-clamp-1 ${selectedPatientId === p.id ? "text-white" : "text-slate-800"}`}>{p.fullName}</span>
                  {p.examStatus === 'IN_PROGRESS' && (
                    <span className={`flex h-2 w-2 rounded-full animate-pulse mt-1 ${selectedPatientId === p.id ? "bg-white" : "bg-indigo-500"}`} />
                  )}
                </div>
                <div className={`text-xs mb-2 truncate font-mono ${selectedPatientId === p.id ? "text-blue-100" : "text-slate-500"}`}>
                  {p.healthId} • {p.age}y {p.sex.charAt(0)}
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${
                    selectedPatientId === p.id ? 'text-white border-white/30 bg-white/20' :
                    p.triageStatus === 'RED' ? 'text-red-700 bg-red-50 border-red-200' :
                    p.triageStatus === 'YELLOW' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                    'text-green-700 bg-green-50 border-green-200'
                  }`}>
                    {p.triageStatus}
                  </Badge>
                  {p.examStatus === 'RESULT_READY' && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-white bg-orange-500 border-orange-600 animate-pulse">
                      Results
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* CENTER: Dynamic Panel */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6 justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Command Center</h1>
          </div>
          <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
            <span className="hidden sm:inline">Logged in as <span className="text-indigo-600">{role || "Doctor"}</span></span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 pb-24"> 
          {!selectedPatient ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 max-w-md mx-auto">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <User className="w-12 h-12 text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-600 mb-2">No Patient Selected</h2>
              <p className="text-center text-slate-500">
                Select a patient from the Live Queue sidebar to view their full medical timeline and take action.
              </p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Patient Banner */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedPatient.fullName}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 font-mono">
                      {selectedPatient.healthId}
                    </Badge>
                    <span>{selectedPatient.age} years • {selectedPatient.sex}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5"><Droplet className="w-4 h-4 text-rose-500" /> Blood: Unknown</span>
                  </div>
                  {selectedPatient.allergyInformation && (
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                      <AlertTriangle className="w-4 h-4" /> Allergies: {selectedPatient.allergyInformation}
                    </div>
                  )}
                </div>
                
                {/* Doctor Action Toolkit - Moved to top for quick access */}
                <div className="flex gap-2 flex-wrap md:flex-nowrap">
                   <ClinicalExamModal patientId={selectedPatient.id} patientName={selectedPatient.fullName} />
                   <AddVitalsModal patientId={selectedPatient.id} patientName={selectedPatient.fullName} />
                   <ReferModal patientId={selectedPatient.id} patientName={selectedPatient.fullName} />
                </div>
              </div>

              {/* Unified Clinical Timeline Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Sections A & B */}
                <div className="space-y-6 lg:col-span-1">
                  
                  {/* Section A: History & Demographics */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                      <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" />
                        Section A: History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-sm">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-slate-700 border-b pb-1">Past Medical History</h4>
                        <p className="text-slate-600">{selectedPatient.preExistingConditions || "None reported."}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-slate-700 border-b pb-1">Surgical History</h4>
                        <p className="text-slate-600">{selectedPatient.surgicalHistory || "None reported."}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-slate-700 border-b pb-1">Family History</h4>
                        <p className="text-slate-600">{selectedPatient.familyHistory || "None reported."}</p>
                      </div>
                      <div className="space-y-1 mt-4 pt-2 border-t border-slate-100">
                        <h4 className="font-semibold text-slate-700 mb-1">Contact & Emergency</h4>
                        <div className="flex justify-between border-b border-slate-50 pb-1">
                          <span className="text-slate-500">Phone</span>
                          <span className="font-medium text-slate-800">{selectedPatient.phoneNumber || "None"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1">
                          <span className="text-slate-500">Location</span>
                          <span className="font-medium text-slate-800">{selectedPatient.addressWoreda || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between pb-1">
                          <span className="text-slate-500">ICE</span>
                          <span className="font-medium text-slate-800 text-right">
                            {selectedPatient.emergencyContactName}<br/>
                            <span className="text-xs text-slate-400">{selectedPatient.emergencyContactPhone}</span>
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section B: Vitals */}
                  <Card className="shadow-sm border-rose-100 bg-rose-50/30">
                    <CardHeader className="bg-rose-50 border-b border-rose-100 pb-3">
                      <CardTitle className="text-sm font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-rose-500" />
                        Section B: Vitals
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {selectedPatient.vitals && selectedPatient.vitals.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-white p-2 rounded border border-rose-100 text-center">
                            <span className="block text-xs text-slate-500 uppercase">BP</span>
                            <span className="font-bold text-slate-800">{selectedPatient.vitals[0].bp}</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-rose-100 text-center">
                            <span className="block text-xs text-slate-500 uppercase">Pulse</span>
                            <span className="font-bold text-slate-800">{selectedPatient.vitals[0].pulse} bpm</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-rose-100 text-center">
                            <span className="block text-xs text-slate-500 uppercase">Temp</span>
                            <span className="font-bold text-slate-800">{selectedPatient.vitals[0].temp}°C</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-rose-100 text-center">
                            <span className="block text-xs text-slate-500 uppercase">SpO2</span>
                            <span className="font-bold text-slate-800">{selectedPatient.vitals[0].spO2}%</span>
                          </div>
                          <div className="bg-white p-2 text-center col-span-2 mt-2">
                            <span className="text-xs text-slate-400 font-medium">Recorded: {new Date(selectedPatient.vitals[0].createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic text-center py-4">No vitals recorded.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Sections C & D */}
                <div className="space-y-6 lg:col-span-2">
                  
                  {/* Section C: Physical Examination & Progress Notes */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-white border-b border-slate-100 pb-3">
                      <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-purple-500" />
                        Section C: Progress Notes & Exam
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 bg-slate-50/50">
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const notes = formData.get("clinicalNotes") as string;
                        try {
                          const { saveClinicalExam } = await import("@/lib/actions/patient.actions");
                          await saveClinicalExam(selectedPatient.id, { clinicalNotes: notes });
                          alert("Progress notes saved!");
                        } catch (err) {
                          alert("Failed to save notes.");
                        }
                      }} className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Doctor's Assessment & Progress</Label>
                        <textarea 
                          name="clinicalNotes" 
                          className="w-full min-h-[160px] p-3 text-sm rounded-lg border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all shadow-inner"
                          placeholder="Record your clinical findings, diagnosis, and progress notes here..."
                          defaultValue={selectedPatient.clinicalExam?.clinicalNotes || ""}
                        ></textarea>
                        <div className="flex justify-between items-center">
                           <span className="text-xs text-slate-500 italic">For full systems review, use the Clinical Exam Modal at the top.</span>
                           <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-medium">Save Notes</Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Section D: Live Results */}
                  <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-white border-b border-slate-100 pb-3">
                      <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-indigo-500" />
                        Section D: Live Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 p-0 overflow-hidden divide-y divide-slate-100">
                       {(!selectedPatient.investigations || selectedPatient.investigations.length === 0) && (!selectedPatient.prescriptions || selectedPatient.prescriptions.length === 0) ? (
                          <div className="p-6 text-center text-slate-500 text-sm italic">No investigations or prescriptions ordered yet.</div>
                       ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                             {/* Lab Results block */}
                             <div className="p-4 bg-white">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center"><FlaskConical className="w-3 h-3 mr-1" /> Investigations</h4>
                                <div className="space-y-3">
                                  {selectedPatient.investigations?.map((inv: any) => (
                                    <div key={inv.id} className="border border-slate-100 rounded-lg p-3 shadow-sm bg-slate-50/50">
                                       <div className="flex justify-between items-start mb-1">
                                          <span className="font-semibold text-slate-800 text-sm">{inv.testName}</span>
                                          <Badge className={`text-[10px] uppercase ${inv.status === 'COMPLETED' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}`} variant="outline">{inv.status}</Badge>
                                       </div>
                                       <p className="text-xs text-slate-600 mt-2 bg-white p-2 rounded border border-slate-100 line-clamp-2">
                                         {inv.status === 'COMPLETED' ? inv.result : "Awaiting lab processing..."}
                                       </p>
                                    </div>
                                  ))}
                                </div>
                             </div>

                             {/* Prescriptions block */}
                             <div className="p-4 bg-white">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center"><Pill className="w-3 h-3 mr-1" /> Prescriptions</h4>
                                <div className="space-y-3">
                                  {selectedPatient.prescriptions?.map((rx: any) => (
                                    <div key={rx.id} className="border border-slate-100 rounded-lg p-3 shadow-sm bg-slate-50/50">
                                       <div className="flex justify-between items-start mb-1">
                                          <span className="font-semibold text-slate-800 text-sm">{rx.medication || rx.drugName}</span>
                                          <Badge className={`text-[10px] uppercase ${rx.status === 'DISPENSED' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}`} variant="outline">{rx.status}</Badge>
                                       </div>
                                       <p className="text-xs text-slate-500 mt-1">Sig: {rx.dosage} • {rx.frequency}</p>
                                    </div>
                                  ))}
                                </div>
                             </div>
                          </div>
                       )}
                    </CardContent>
                  </Card>
                </div>
              </div>
              
            </div>
          )}
        </div>

        {/* BOTTOM: Quick-Action Footer */}
        {selectedPatient && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex items-center justify-center px-6 gap-4 z-20 transition-transform transform translate-y-0">
             
             <Button 
                onClick={onCallNext}
                disabled={isCalling || selectedPatient.examStatus === 'IN_PROGRESS'} 
                className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl font-bold flex items-center gap-2"
              >
               <PhoneCall className="w-5 h-5" />
               {isCalling ? "Calling..." : selectedPatient.examStatus === 'IN_PROGRESS' ? "Patient Called" : "Call Next"}
             </Button>

             <PrescribeModal patientId={selectedPatient.id} patientName={selectedPatient.fullName} patientAllergies={selectedPatient.allergyInformation} />
             
             <OrderTestModal patientId={selectedPatient.id} patientName={selectedPatient.fullName} />

             <Button 
                onClick={onFinishVisit}
                disabled={isFinishing}
                variant="outline"
                className="h-12 px-6 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm rounded-xl font-bold flex items-center gap-2"
              >
               <CheckCircle2 className="w-5 h-5 text-emerald-500" />
               {isFinishing ? "Finishing..." : "Finish Visit"}
             </Button>
          </div>
        )}
      </main>
    </div>
  );
}
