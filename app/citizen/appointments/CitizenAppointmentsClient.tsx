"use client";

import { useState } from "react";
import { 
  Calendar, Clock, Building, Stethoscope, 
  CheckCircle2, AlertTriangle, ArrowRight, History, Sparkles, X, AlertCircle 
} from "lucide-react";
import { bookAppointment } from "@/lib/actions/appointment.actions";
import { getHealthcareRoleTranslation, APPOINTMENT_STATUS_LABELS } from "@/lib/locales/enums";

interface Hospital {
  id: string;
  name: string;
  region?: string;
  zone?: string;
  woreda?: string;
  kebele?: string;
}

interface Appointment {
  id: string;
  department: string;
  dateTime: string;
  status: "PENDING_CONFIRMATION" | "SCHEDULED" | "ARRIVED" | "CANCELLED";
  facility: {
    name: string;
    region?: string;
    zone?: string;
  };
}

interface CitizenAppointmentsClientProps {
  citizenPatientId: string;
  initialHospitals: Hospital[];
  initialAppointments: Appointment[];
}

const DEPARTMENTS = [
  "General Medicine",
  "Pediatrics",
  "Triage / Emergency",
  "Gynecology & Obstetrics",
  "Internal Medicine",
  "Surgical Services"
];

export function CitizenAppointmentsClient({
  citizenPatientId,
  initialHospitals,
  initialAppointments,
}: CitizenAppointmentsClientProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [hospitals, setHospitals] = useState<Hospital[]>(initialHospitals);
  
  // Wizard States
  const [step, setStep] = useState(1);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Safeguard count check
  const activeBookingsCount = appointments.filter(
    (a) => a.status === "PENDING_CONFIRMATION" || a.status === "SCHEDULED"
  ).length;
  const isLimitReached = activeBookingsCount >= 2;

  // Filter facilities
  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.region && h.region.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedHospitalName = hospitals.find(h => h.id === selectedHospitalId)?.name || "";

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      setErrorMsg("Spam Limit Reached: You cannot have more than 2 pending or scheduled appointments at the same time.");
      return;
    }

    if (!selectedHospitalId || !selectedDepartment || !selectedDate || !selectedTime) {
      setErrorMsg("Please complete all scheduling steps.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const combinedDateTime = `${selectedDate}T${selectedTime}:00`;
      const res = await bookAppointment({
        patientId: citizenPatientId,
        facilityId: selectedHospitalId,
        department: selectedDepartment,
        dateTime: combinedDateTime,
      });

      if (!res.success || !res.appointment) {
        setErrorMsg(res.error || "Failed to schedule appointment.");
      } else {
        // Successfully booked! Add to list
        const newApp: Appointment = {
          id: res.appointment.id,
          department: res.appointment.department,
          dateTime: res.appointment.dateTime,
          status: res.appointment.status,
          facility: {
            name: selectedHospitalName,
            region: hospitals.find(h => h.id === selectedHospitalId)?.region,
            zone: hospitals.find(h => h.id === selectedHospitalId)?.zone,
          }
        };

        setAppointments([newApp, ...appointments]);
        setSuccessMsg("Appointment request submitted successfully! A receptionist will review it shortly.");
        
        // Reset form wizard
        setSelectedHospitalId("");
        setSelectedDepartment("");
        setSelectedDate("");
        setSelectedTime("");
        setStep(1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: Appointment["status"]) => {
    switch (status) {
      case "PENDING_CONFIRMATION":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "SCHEDULED":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "ARRIVED":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "CANCELLED":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    }
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex-1 p-6 md:p-8 space-y-8 max-w-6xl mx-auto w-full relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <Calendar className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Book a Medical Appointment
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Request care across any registered healthcare facility.
              </p>
            </div>
          </div>
          <div className="bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Active Bookings: </span>
            <span className={`font-bold ${isLimitReached ? "text-amber-400" : "text-emerald-400"}`}>
              {activeBookingsCount} / 2
            </span>
          </div>
        </div>

        {/* Global Messages */}
        {errorMsg && (
          <div className="p-4 bg-red-950/40 text-red-200 border border-red-900 rounded-xl flex gap-3 items-center animate-in slide-in-from-top-4 duration-300">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-sm font-semibold">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-950/40 text-emerald-200 border border-emerald-900 rounded-xl flex gap-3 items-center animate-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-semibold">{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scheduling Wizard Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 border-b border-slate-800/60 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Booking Wizard
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className={step >= 1 ? "text-indigo-400 font-bold" : ""}>Step 1</span>
                  <span>/</span>
                  <span className={step >= 2 ? "text-indigo-400 font-bold" : ""}>Step 2</span>
                  <span>/</span>
                  <span className={step >= 3 ? "text-indigo-400 font-bold" : ""}>Step 3</span>
                </div>
              </div>

              {isLimitReached ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mx-auto">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-md font-bold text-white">Booking Rate-Limit Reached</h3>
                    <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                      You currently have {activeBookingsCount} active appointment requests in a pending or scheduled state. To book another, please cancel or complete your current requests.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBook} className="space-y-6">
                  {/* STEP 1: Select Facility */}
                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          1. Select Hospital / Health Center
                        </label>
                        <div className="relative mt-2">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by facility name or region..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                          <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        </div>
                      </div>

                      <div className="max-h-[260px] overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-850">
                        {filteredHospitals.length === 0 ? (
                          <p className="p-4 text-xs text-slate-500 text-center">No facilities found.</p>
                        ) : (
                          filteredHospitals.map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => {
                                setSelectedHospitalId(h.id);
                                setStep(2);
                              }}
                              className={`w-full p-3.5 text-left text-sm hover:bg-slate-900 transition-colors flex justify-between items-center ${
                                selectedHospitalId === h.id ? "bg-indigo-950/30 text-indigo-200 border-l-2 border-indigo-500" : "text-slate-300"
                              }`}
                            >
                              <div>
                                <p className="font-semibold text-white">{h.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {h.region || "Ethiopia"} • {h.zone || "Generic Zone"}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-600" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Select Department */}
                  {step === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            2. Select Speciality Department
                          </label>
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            Back to facilities
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Selected: {selectedHospitalName}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {DEPARTMENTS.map((dept) => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              setSelectedDepartment(dept);
                              setStep(3);
                            }}
                            className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.01] ${
                              selectedDepartment === dept
                                ? "bg-indigo-950/40 text-indigo-200 border-indigo-500 shadow-md shadow-indigo-900/10"
                                : "bg-slate-950/60 border-slate-850 text-slate-300 hover:bg-slate-900"
                            }`}
                          >
                            <Stethoscope className="w-5 h-5 text-indigo-400 mb-2" />
                            <p className="font-bold text-sm text-white">{dept}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Available for screening &amp; triage</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Choose Date & Time */}
                  {step === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            3. Select Date and Time
                          </label>
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            Back to departments
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Facility: {selectedHospitalName} | Specialty: {selectedDepartment}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-400">Appointment Date</label>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-slate-400">Appointment Time</label>
                          <input
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !selectedDate || !selectedTime}
                        className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                      >
                        {loading ? "Scheduling Booking..." : "Submit Booking Request"}
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Booking History Column */}
          <div className="space-y-6">
            <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-indigo-400" /> Booking History
              </h2>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {appointments.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No bookings found. Request your first appointment!
                  </div>
                ) : (
                  appointments.map((app) => {
                    const statusText = APPOINTMENT_STATUS_LABELS[app.status]?.en || app.status;
                    return (
                      <div
                        key={app.id}
                        className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-2 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm text-white">{app.department}</p>
                            <p className="text-[11px] text-slate-400 font-semibold truncate max-w-[160px] mt-0.5" title={app.facility.name}>
                              {app.facility.name}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeColor(app.status)}`}>
                            {statusText}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1 border-t border-slate-900">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          <span>{formatDateTime(app.dateTime)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
