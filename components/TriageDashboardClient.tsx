"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, ArrowRight, Brain, Clock, Plus, Search, 
  Stethoscope, User, AlertTriangle, CheckCircle2, ShieldAlert
} from "lucide-react";
import { processTriage } from "@/lib/actions/patient.actions";

export default function TriageDashboardClient({ initialPatients }: { initialPatients: any[] }) {
  const router = useRouter();
  const [patients, setPatients] = useState(initialPatients);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [selectedPriority, setSelectedPriority] = useState<"RED" | "YELLOW" | "GREEN" | "">("");
  const [selectedWard, setSelectedWard] = useState<string>("OPD_OUTPATIENT");
  const [serviceType, setServiceType] = useState("OPD");

  const filteredPatients = patients.filter(p => 
    p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.healthId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // AI Mock Engine
  const getAiSuggestion = (patient: any) => {
    if (!patient) return null;
    const complaint = patient.chiefComplaint?.toLowerCase() || "";
    if (complaint.includes("pain") || complaint.includes("chest") || complaint.includes("bleeding") || patient.emergencyFlag) {
       return { priority: "RED" as const, ward: "EMERGENCY", reason: "Critical symptoms reported in chief complaint." };
    }
    if (complaint.includes("fever") || complaint.includes("vomit")) {
       return { priority: "YELLOW" as const, ward: "OPD_OUTPATIENT", reason: "Urgent but stable symptoms identified." };
    }
    return { priority: "GREEN" as const, ward: "OPD_OUTPATIENT", reason: "Routine symptoms, standard pathway." };
  };

  const aiSuggestion = getAiSuggestion(selectedPatient);

  const handlePatientSelect = (id: string) => {
    setSelectedPatientId(id);
    const suggestion = getAiSuggestion(patients.find(p => p.id === id));
    if (suggestion) {
      setSelectedPriority(suggestion.priority);
      setSelectedWard(suggestion.ward);
      setServiceType(suggestion.ward === "EMERGENCY" ? "EMERGENCY" : "OPD");
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatientId || !selectedPriority || !selectedWard) return;
    try {
      setIsProcessing(true);
      await processTriage(selectedPatientId, selectedWard as any, selectedPriority, serviceType);
      
      // Remove from list
      setPatients(prev => prev.filter(p => p.id !== selectedPatientId));
      setSelectedPatientId(null);
      
      // Refresh router silently to update caches
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to submit triage.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans text-neutral-200">
      
      {/* LEFT PANE: Live Queue */}
      <div className="w-1/3 min-w-[350px] border-r border-neutral-800 bg-neutral-900/50 flex flex-col relative z-10">
        <div className="p-6 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-2 tracking-tight">
            <Activity className="w-6 h-6 text-cyan-400" />
            Triage Queue
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            {patients.length} incoming patient{patients.length !== 1 && 's'} pending classification
          </p>
          
          <div className="mt-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search ID or Name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 text-sm text-white rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-neutral-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500">
              <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
              <p>No patients in queue</p>
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const isSelected = patient.id === selectedPatientId;
              const isEmergency = patient.emergencyFlag;
              return (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                    isSelected 
                      ? 'bg-neutral-800/80 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.05)]' 
                      : 'bg-neutral-900/40 border-neutral-800/60 hover:bg-neutral-800/40 hover:border-neutral-700'
                  }`}
                >
                  {isEmergency && (
                     <div className="absolute top-0 right-0 p-2 opacity-60">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                     </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`font-medium ${isSelected ? 'text-white' : 'text-neutral-200'} flex items-center gap-2`}>
                        {patient.fullName}
                      </h3>
                      <p className="text-xs text-neutral-500 font-mono mt-1">ID: {patient.healthId}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(patient.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1 max-w-[150px] truncate">
                       <AlertTriangle className="w-3.5 h-3.5 text-orange-400/70" />
                       {patient.chiefComplaint || "No complaint recorded"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Assessment & Triage */}
      <div className="flex-1 bg-neutral-950 flex flex-col relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />

        {selectedPatient ? (
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Header Profile */}
              <div className="flex items-start justify-between border-b border-neutral-800 pb-6">
                <div>
                  <h1 className="text-3xl font-semibold text-white flex items-center gap-3">
                    {selectedPatient.fullName}
                    {selectedPatient.emergencyFlag && (
                      <span className="bg-rose-500/10 text-rose-400 text-xs px-2.5 py-1 rounded-full font-medium border border-rose-500/20 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> ER Flagged
                      </span>
                    )}
                  </h1>
                  <div className="flex gap-4 mt-2 text-sm text-neutral-400">
                    <span className="font-mono">ID: {selectedPatient.healthId}</span>
                    <span>•</span>
                    <span>{selectedPatient.age} yrs, {selectedPatient.sex}</span>
                  </div>
                </div>
              </div>

              {/* Patient Insight Grid */}
              <div className="grid grid-cols-2 gap-6">
                 {/* Complaint Card */}
                 <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur-sm">
                   <h3 className="text-sm font-medium text-neutral-400 flex items-center gap-2 mb-3">
                     <AlertTriangle className="w-4 h-4 text-orange-400" />
                     Chief Complaint
                   </h3>
                   <p className="text-lg text-neutral-200">
                     {selectedPatient.chiefComplaint || "Not specified."}
                   </p>
                   {selectedPatient.detailedSituation && (
                     <p className="text-sm text-neutral-500 mt-2">
                       {selectedPatient.detailedSituation}
                     </p>
                   )}
                 </div>

                 {/* Vitals Summary Card */}
                 <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur-sm">
                   <h3 className="text-sm font-medium text-neutral-400 flex items-center gap-2 mb-4">
                     <Activity className="w-4 h-4 text-cyan-400" />
                     Initial Vitals
                   </h3>
                   <div className="grid grid-cols-2 gap-4">
                     {selectedPatient.vitals && selectedPatient.vitals.length > 0 ? (
                       <>
                         <div>
                            <span className="text-xs text-neutral-500 block mb-1">Blood Pressure</span>
                            <span className="text-neutral-200 font-mono">{selectedPatient.vitals[0].bp}</span>
                         </div>
                         <div>
                            <span className="text-xs text-neutral-500 block mb-1">Heart Rate</span>
                            <span className="text-neutral-200 font-mono">{selectedPatient.vitals[0].pulse} bpm</span>
                         </div>
                         <div>
                            <span className="text-xs text-neutral-500 block mb-1">Temperature</span>
                            <span className="text-neutral-200 font-mono">{selectedPatient.vitals[0].temp} °C</span>
                         </div>
                         <div>
                            <span className="text-xs text-neutral-500 block mb-1">SpO2</span>
                            <span className="text-neutral-200 font-mono">{selectedPatient.vitals[0].spO2 || "--"} %</span>
                         </div>
                       </>
                     ) : (
                       <div className="col-span-2 text-neutral-500 text-sm italic">
                         No vitals recorded on registration.
                       </div>
                     )}
                   </div>
                 </div>
              </div>

              {/* AI Insight Bar */}
              {aiSuggestion && (
                <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-4">
                  <div className="bg-indigo-500/20 p-2 rounded-lg mt-0.5">
                    <Brain className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-indigo-300">AI Triage Suggestion</h4>
                    <p className="text-sm text-indigo-200/80 mt-1">
                      {aiSuggestion.reason} Recommends <strong className="text-indigo-200">{aiSuggestion.priority}</strong> priority to <strong>{aiSuggestion.ward.replace(/_/g, ' ')}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Form */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]" />
                
                <h3 className="text-xl font-medium text-white mb-6 relative z-10">Assign Pathway</h3>

                <div className="space-y-8 relative z-10">
                  {/* Priority Selector */}
                  <div>
                    <label className="text-sm text-neutral-400 font-medium block mb-3">Triage Priority</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['RED', 'YELLOW', 'GREEN'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setSelectedPriority(p as any)}
                          className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                            selectedPriority === p
                              ? p === 'RED' ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                              : p === 'YELLOW' ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                              : 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                          }`}
                        >
                          <span className="font-bold tracking-wider">{p}</span>
                          <span className="text-xs opacity-70">
                            {p === 'RED' && 'Resuscitation / Emergency'}
                            {p === 'YELLOW' && 'Urgent Care'}
                            {p === 'GREEN' && 'Standard / Routine'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ward & Service Type */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="text-sm text-neutral-400 font-medium block mb-3">Destination Ward</label>
                       <select 
                         value={selectedWard}
                         onChange={(e) => setSelectedWard(e.target.value)}
                         className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 appearance-none"
                       >
                          <option value="OPD_OUTPATIENT">OPD / Outpatient</option>
                          <option value="EMERGENCY">Emergency</option>
                          <option value="MEDICAL_WARD">Medical Ward</option>
                          <option value="SURGICAL_WARD">Surgical Ward</option>
                          <option value="MATERNITY_WARD">Maternity Ward</option>
                          <option value="PEDIATRIC_WARD">Pediatric Ward</option>
                          <option value="LABORATORY">Direct to Lab</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-sm text-neutral-400 font-medium block mb-3">Service Type</label>
                       <select 
                         value={serviceType}
                         onChange={(e) => setServiceType(e.target.value)}
                         className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 appearance-none"
                       >
                          <option value="OPD">Standard OPD</option>
                          <option value="EMERGENCY">Emergency Service</option>
                          <option value="CONSULTATION">Specialist Consultation</option>
                       </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-neutral-800 flex justify-end">
                    <button
                      onClick={handleSubmit}
                      disabled={isProcessing || !selectedPriority || !selectedWard}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors"
                    >
                      {isProcessing ? 'Processing...' : 'Confirm Assignment'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
             <div className="w-24 h-24 rounded-full bg-neutral-900/50 flex items-center justify-center mb-6">
                <Stethoscope className="w-10 h-10 text-neutral-700" />
             </div>
             <h2 className="text-xl font-medium text-neutral-300">Select a patient</h2>
             <p className="mt-2 max-w-sm text-center">
               Choose a patient from the queue to review their condition and assign them to a medical ward.
             </p>
          </div>
        )}
      </div>

    </div>
  );
}
