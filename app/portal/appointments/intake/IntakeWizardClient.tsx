"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, Clock, Building, Stethoscope, 
  CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Sparkles, Loader2 
} from "lucide-react";

interface Hospital {
  id: string;
  name: string;
  region?: string;
  zone?: string;
}

interface IntakeWizardClientProps {
  citizenPatientId: string;
  initialHospitals: Hospital[];
}

const TIME_SLOTS = [
  "08:00 - 09:00 AM",
  "09:00 - 10:00 AM",
  "10:00 - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "02:00 - 03:00 PM",
  "03:00 - 04:00 PM",
  "04:00 - 05:00 PM"
];

export function IntakeWizardClient({
  citizenPatientId,
  initialHospitals
}: IntakeWizardClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [chiefComplaints, setChiefComplaints] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [ticketInfo, setTicketInfo] = useState<{
    wardName: string;
    date: string;
    timeSlot: string;
    queuePosition: number;
  } | null>(null);

  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleNext = () => {
    if (step === 1 && (!selectedHospitalId || !selectedDate)) {
      setErrorMsg("Please select a hospital and an appointment date.");
      return;
    }
    if (step === 2 && !selectedTimeSlot) {
      setErrorMsg("Please select an appointment time block.");
      return;
    }
    setErrorMsg("");
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setErrorMsg("");
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    if (chiefComplaints.trim().length < 10) {
      setErrorMsg("Please provide a description of at least 10 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/appointments/classify-ward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          patientId: citizenPatientId,
          facilityId: selectedHospitalId,
          appointmentDate: selectedDate,
          timeSlot: selectedTimeSlot,
          chiefComplaints: chiefComplaints
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit clinical intake request.");
      }

      setTicketInfo({
        wardName: data.wardName,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        queuePosition: data.queuePosition
      });
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    router.push(`/patients/${citizenPatientId}/dashboard`);
  };

  // Step 4 is the Confirmation Screen
  if (step === 4 && ticketInfo) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
        {/* Background Decorative Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-900/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex-1 p-6 md:p-8 flex items-center justify-center relative z-10">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
            
            {/* Success Icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            {/* Success Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Intake Confirmed!
              </h1>
              <p className="text-slate-400 text-xs leading-relaxed">
                Your clinical request has been recorded and queued successfully.
              </p>
            </div>

            {/* Ticket Card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 text-left space-y-4 shadow-inner relative overflow-hidden">
              {/* Ticket Jagged Edge decorations */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_center,_#1e293b_40%,_transparent_50%)] bg-[length:12px_8px] bg-repeat-x pointer-events-none" />
              
              <div>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">Assigned Clinic Ward</span>
                <span className="text-md font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                  <Stethoscope className="w-4 h-4 text-emerald-500" /> {ticketInfo.wardName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">Appt Date</span>
                  <span className="text-xs font-semibold text-slate-300 block mt-1">{ticketInfo.date}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">Time Block</span>
                  <span className="text-xs font-semibold text-slate-300 block mt-1">{ticketInfo.timeSlot}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Ticket Sequence</span>
                <span className="text-3xl font-black text-white mt-1 bg-slate-900 border border-slate-800 px-6 py-2 rounded-xl tracking-tight shadow-md">
                  Live Queue Position: #{ticketInfo.queuePosition}
                </span>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleExit}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] cursor-pointer"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex-1 p-6 md:p-8 space-y-8 max-w-3xl mx-auto w-full relative z-10 flex flex-col justify-center">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-slate-800/80 pb-6">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-inner">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Clinical Intake Portal
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Submit your outpatient check-in request and book an appointment slot.
            </p>
          </div>
        </div>

        {/* Global Errors */}
        {errorMsg && (
          <div className="p-4 bg-red-950/40 text-red-200 border border-red-900/60 rounded-2xl flex gap-3 items-center animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Wizard Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6">
          
          {/* Progress Header */}
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Intake Request
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-850">
              <span className={step >= 1 ? "text-indigo-400 font-bold" : ""}>Step 1: Date</span>
              <span>/</span>
              <span className={step >= 2 ? "text-indigo-400 font-bold" : ""}>Step 2: Session</span>
              <span>/</span>
              <span className={step >= 3 ? "text-indigo-400 font-bold" : ""}>Step 3: Narrative</span>
            </div>
          </div>

          {/* Persistent Hospital Selector at top of card */}
          {step < 4 && (
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Target Healthcare Facility
              </label>
              <select
                disabled={loading}
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">-- Choose Hospital --</option>
                {initialHospitals.map((hosp) => (
                  <option key={hosp.id} value={hosp.id}>
                    {hosp.name} {hosp.region ? `(${hosp.region})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* STEP 1: Date Selection */}
          {step === 1 && (
            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Select Appointment Date
                </label>
                <input
                  type="date"
                  min={getTodayString()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Restricted to today and future scheduling days only. Institutional operations are subject to confirmation.
              </p>
            </div>
          )}

          {/* STEP 2: Time Block Picker */}
          {step === 2 && (
            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Select Session Time Slot
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`p-4 rounded-xl text-xs font-bold border text-left transition-all duration-200 active:scale-[0.98] ${
                        selectedTimeSlot === slot
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20"
                          : "bg-slate-950 border-slate-850 text-slate-300 hover:bg-slate-900/60 hover:text-white"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Chief Complaints Narrative */}
          {step === 3 && (
            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5" /> Chief Complaints & Reason for Care
                  </label>
                  <span className={`text-[10px] font-bold ${chiefComplaints.trim().length >= 10 ? "text-emerald-400" : "text-amber-500"}`}>
                    {chiefComplaints.trim().length} / 10 chars min
                  </span>
                </div>
                <textarea
                  disabled={loading}
                  rows={5}
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                  placeholder="Detail your health reason for seeking outpatient care, symptoms, duration, etc. (Minimum 10 characters)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 resize-none disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-850">
            {step > 1 ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleBack}
                className="px-5 py-3 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 text-xs font-bold flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => router.push(`/patients/${citizenPatientId}/dashboard`)}
                className="px-5 py-3 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-400 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
              >
                Cancel & Exit
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-950 cursor-pointer"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || chiefComplaints.trim().length < 10 || !selectedHospitalId}
                onClick={handleSubmit}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-emerald-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit Intake <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
