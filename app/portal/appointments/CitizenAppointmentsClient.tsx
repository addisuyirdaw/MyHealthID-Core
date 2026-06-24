"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Calendar, Clock, Building, Stethoscope, 
  CheckCircle2, AlertTriangle, ArrowRight, History, Sparkles, X, AlertCircle, Loader2 
} from "lucide-react";
import { bookAppointment } from "@/lib/actions/appointment.actions";
import { getLiveQueueStatus } from "@/lib/actions/queue.actions";
import { getHealthcareRoleTranslation, APPOINTMENT_STATUS_LABELS } from "@/lib/locales/enums";
import { getScreeningQuestions } from "@/lib/actions/hospital.actions";
import { useLanguage } from "@/components/LanguageProvider";

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

const SCREENING_STRINGS = {
  EN: {
    stepTitle: "Preliminary Symptom Review",
    stepSubtitle: "Please answer a few quick questions so we can route you safely.",
    emergencyTitle: "Urgent Care Required",
    emergencyBody: "Based on your responses, you may need immediate medical attention. Please bypass online scheduling and proceed directly to the Emergency Room.",
    emergencyBypass: "I understand — book a regular appointment anyway",
    progressLabel: (cur: number, total: number) => `Question ${cur} of ${total}`,
    nextBtn: "Next",
    skipBtn: "Skip Screening",
  },
  AM: {
    stepTitle: "የቅድሚያ ምልክት ግምገማ",
    stepSubtitle: "እባክዎ ጥቂት ጥያቄዎችን ይመልሱ። ወደ ትክክለኛው ክፍል እንዲደረሱ ያደርጋሉ።",
    emergencyTitle: "አሳሳቢ ሁኔታ ተገኝቷል",
    emergencyBody: "በምላሾችዎ መሰረት፣ ወዲያውኑ ህክምና ሊያስፈልግዎ ይችላል። እባክዎ ቀጠሮ ሳይይዙ ወዲያውኑ ወደ ድንገተኛ አደጋ ክፍል ይሂዱ።",
    emergencyBypass: "ገባኝ — ቀጠሮ ለመያዝ ቀጥል",
    progressLabel: (cur: number, total: number) => `ጥያቄ ${cur} ከ ${total}`,
    nextBtn: "ቀጣይ",
    skipBtn: "ምርመራ ዝለል",
  },
};


export function CitizenAppointmentsClient({
  citizenPatientId,
  initialHospitals,
  initialAppointments,
}: CitizenAppointmentsClientProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [hospitals, setHospitals] = useState<Hospital[]>(initialHospitals);

  // ── Queue Circuit-Breaker State ────────────────────────────────────────────
  const [queueStatus, setQueueStatus] = useState<{
    inQueue: boolean;
    queuePosition: number;
    status: string;
    ward?: string;
  } | null>(null);
  const [patientsAhead, setPatientsAhead] = useState(0);
  const [baseWaitMinutes, setBaseWaitMinutes] = useState(0);
  const [displayedCountdown, setDisplayedCountdown] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  // Track previous patientsAhead to detect queue advancement
  const prevPatientsAheadRef = useRef<number | null>(null);

  // Initial queue fetch on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchQueue() {
      const res = await getLiveQueueStatus(citizenPatientId);
      if (cancelled) return;
      if (res.inQueue && res.queuePosition != null) {
        const ahead = Math.max(0, res.queuePosition - 1);
        const base = ahead * 8;
        setPatientsAhead(ahead);
        setBaseWaitMinutes(base);
        setDisplayedCountdown(base);
        setIsFrozen(false);
        prevPatientsAheadRef.current = ahead;
        setQueueStatus({
          inQueue: true,
          queuePosition: res.queuePosition,
          status: (res as any).status ?? "WAITING",
          ward: (res as any).ward,
        });
      } else {
        setQueueStatus({ inQueue: false, queuePosition: 0, status: "" });
      }
    }
    void fetchQueue();
    return () => { cancelled = true; };
  }, [citizenPatientId]);

  // ── Circuit-Breaker Countdown Engine (60-second interval) ─────────────────
  useEffect(() => {
    if (!queueStatus?.inQueue) return;

    const timer = setInterval(() => {
      setDisplayedCountdown((prev) => {
        if (prev > 8) {
          setIsFrozen(false);
          return prev - 1;
        }
        // Freeze at 8 — do not allow below 8
        setIsFrozen(true);
        return 8;
      });
    }, 60_000);

    return () => clearInterval(timer);
  }, [queueStatus?.inQueue]);

  // ── Dynamic Synchronization Hook (background re-poll every 60s) ───────────
  useEffect(() => {
    if (!queueStatus?.inQueue) return;

    const poll = setInterval(async () => {
      const res = await getLiveQueueStatus(citizenPatientId);
      if (!res.inQueue || res.queuePosition == null) return;

      const freshAhead = Math.max(0, res.queuePosition - 1);
      const prev = prevPatientsAheadRef.current ?? freshAhead;

      // Queue advanced — doctor called the next patient
      if (freshAhead < prev) {
        const newBase = freshAhead * 8;
        setPatientsAhead(freshAhead);
        setBaseWaitMinutes(newBase);
        setDisplayedCountdown(newBase); // full reset, clears freeze
        setIsFrozen(false);
        setQueueStatus((s) =>
          s ? { ...s, queuePosition: res.queuePosition! } : s
        );
      }
      prevPatientsAheadRef.current = freshAhead;
    }, 60_000);

    return () => clearInterval(poll);
  }, [citizenPatientId, queueStatus?.inQueue]);
  
  const { language } = useLanguage();

  // Wizard States
  const [step, setStep] = useState(1);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Screening States
  const [screeningQuestions, setScreeningQuestions] = useState<any[]>([]);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [screeningStep, setScreeningStep] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [emergencyBlocked, setEmergencyBlocked] = useState(false);
  const [isAutoRouted, setIsAutoRouted] = useState(false);
  const [isScreeningCompleted, setIsScreeningCompleted] = useState(false);
  
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
        setScreeningQuestions([]);
        setScreeningAnswers({});
        setScreeningStep(0);
        setEmergencyBlocked(false);
        setIsAutoRouted(false);
        setIsScreeningCompleted(false);
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

  /** Map prisma Ward enum values → human-readable badge label + colour */
  const getWardBadge = (ward?: string): { label: string; dot: string; ring: string; text: string } => {
    const w = (ward ?? "").toUpperCase();
    if (w.includes("EMERGENCY"))
      return { label: "GENERAL EMERGENCY", dot: "🔴", ring: "border-red-500/60", text: "text-red-300" };
    if (w.includes("OPD") || w.includes("OUTPATIENT"))
      return { label: "MEDICAL OPD", dot: "🟢", ring: "border-emerald-500/60", text: "text-emerald-300" };
    if (w.includes("SURGICAL"))
      return { label: "SURGICAL WARD", dot: "🟡", ring: "border-amber-500/60", text: "text-amber-300" };
    if (w.includes("PEDIATRIC"))
      return { label: "PEDIATRIC WARD", dot: "🔵", ring: "border-blue-500/60", text: "text-blue-300" };
    if (w.includes("MATERNITY") || w.includes("GYNECOLOGY"))
      return { label: "MATERNITY / OB-GYN", dot: "🩷", ring: "border-pink-500/60", text: "text-pink-300" };
    if (w.includes("LAB"))
      return { label: "LABORATORY", dot: "🟣", ring: "border-violet-500/60", text: "text-violet-300" };
    if (w.includes("PHARMACY"))
      return { label: "PHARMACY", dot: "🟠", ring: "border-orange-500/60", text: "text-orange-300" };
    return { label: "INPATIENT WARD", dot: "⚪", ring: "border-slate-500/60", text: "text-slate-300" };
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
                  <span className={step === 1 ? "text-indigo-400 font-bold" : ""}>
                    {language === "AM" ? "ተቋም" : "Facility"}
                  </span>
                  <span>/</span>
                  {screeningQuestions.length > 0 && (
                    <>
                      <span className={step === 2 ? "text-indigo-400 font-bold" : ""}>
                        {language === "AM" ? "ምርመራ" : "Screening"}
                      </span>
                      <span>/</span>
                    </>
                  )}
                  <span className={step === 3 ? "text-indigo-400 font-bold" : ""}>
                    {language === "AM" ? "ክፍል" : "Department"}
                  </span>
                  <span>/</span>
                  <span className={step === 4 ? "text-indigo-400 font-bold" : ""}>
                    {language === "AM" ? "ቀጠሮ" : "Schedule"}
                  </span>
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
                              disabled={loadingQuestions}
                              onClick={async () => {
                                setSelectedHospitalId(h.id);
                                setLoadingQuestions(true);
                                try {
                                  const res = await getScreeningQuestions(h.id);
                                  if (res.success && res.questions && res.questions.length > 0) {
                                    setScreeningQuestions(res.questions);
                                    setScreeningAnswers({});
                                    setScreeningStep(0);
                                    setEmergencyBlocked(false);
                                    setIsScreeningCompleted(false);
                                    setStep(2);
                                  } else {
                                    setScreeningQuestions([]);
                                    setIsScreeningCompleted(true);
                                    setStep(3);
                                  }
                                } catch (e) {
                                  console.error(e);
                                  setScreeningQuestions([]);
                                  setIsScreeningCompleted(true);
                                  setStep(3);
                                } finally {
                                  setLoadingQuestions(false);
                                }
                              }}
                              className={`w-full p-3.5 text-left text-sm hover:bg-slate-900 transition-colors flex justify-between items-center ${
                                selectedHospitalId === h.id ? "bg-indigo-950/30 text-indigo-200 border-l-2 border-indigo-500" : "text-slate-300"
                              } ${loadingQuestions ? "opacity-60 pointer-events-none" : ""}`}
                            >
                              <div>
                                <p className="font-semibold text-white">{h.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {h.region || "Ethiopia"} • {h.zone || "Generic Zone"}
                                </p>
                              </div>
                              {loadingQuestions && selectedHospitalId === h.id ? (
                                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                              ) : (
                                <ArrowRight className="w-4 h-4 text-slate-600" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {loadingQuestions && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-300">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-sm text-slate-400 font-semibold">
                        {language === "AM" ? "የህክምና ምርመራ ጥያቄዎችን በመጫን ላይ..." : "Loading clinical review questions..."}
                      </p>
                    </div>
                  )}

                  {/* STEP 2: Preliminary Symptom Review */}
                  {!loadingQuestions && step === 2 && screeningQuestions.length > 0 && !isScreeningCompleted && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                            {SCREENING_STRINGS[language].stepTitle}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setStep(1);
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            {language === "AM" ? "ወደ ሆስፒታሎች ይመለሱ" : "Back to facilities"}
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {SCREENING_STRINGS[language].stepSubtitle}
                        </p>
                      </div>

                      {emergencyBlocked ? (
                        <div className="p-5 bg-red-950/40 border border-red-500/30 rounded-2xl space-y-4 animate-in zoom-in-95 duration-200">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-8 h-8 text-red-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h3 className="text-red-400 font-bold text-base">
                                {SCREENING_STRINGS[language].emergencyTitle}
                              </h3>
                              <p className="text-red-200/90 text-sm leading-relaxed">
                                {SCREENING_STRINGS[language].emergencyBody}
                              </p>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-red-950 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setEmergencyBlocked(false);
                                setIsAutoRouted(false);
                                setIsScreeningCompleted(true);
                                setStep(3);
                              }}
                              className="text-xs text-slate-400 hover:text-white transition-colors"
                            >
                              {SCREENING_STRINGS[language].emergencyBypass}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Question Card */}
                          <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              {SCREENING_STRINGS[language].progressLabel(screeningStep + 1, screeningQuestions.length)}
                            </span>
                            <h3 className="text-white font-bold text-base mt-1">
                              {language === "AM" 
                                ? screeningQuestions[screeningStep].labelAm 
                                : screeningQuestions[screeningStep].labelEn}
                            </h3>

                            <div className="grid grid-cols-1 gap-3 mt-4">
                              {screeningQuestions[screeningStep].options.map((opt: any) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    const nextAnswers = { ...screeningAnswers, [screeningQuestions[screeningStep].id]: opt.id };
                                    setScreeningAnswers(nextAnswers);
                                    
                                    if (opt.isEmergencyFlag) {
                                      setEmergencyBlocked(true);
                                      return;
                                    }

                                    if (opt.autoSelectDepartment) {
                                      setSelectedDepartment(opt.autoSelectDepartment);
                                      setIsAutoRouted(true);
                                    }

                                    if (screeningStep < screeningQuestions.length - 1) {
                                      setScreeningStep(prev => prev + 1);
                                    } else {
                                      // Check if any answer along the way set a department
                                      const hasAutoSelectedDept = Object.values(nextAnswers).some((ansId) => {
                                        const allOpts = screeningQuestions.flatMap(q => q.options);
                                        const optionObj = allOpts.find(o => o.id === ansId);
                                        return optionObj?.autoSelectDepartment;
                                      });

                                      setIsScreeningCompleted(true);
                                      if (hasAutoSelectedDept) {
                                        setStep(4);
                                      } else {
                                        setStep(3);
                                      }
                                    }
                                  }}
                                  className="p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/10 text-left rounded-xl transition-all hover:scale-[1.01] flex justify-between items-center group"
                                >
                                  <span className="text-sm font-semibold text-slate-200 group-hover:text-white">
                                    {language === "AM" ? opt.labelAm : opt.labelEn}
                                  </span>
                                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400" />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                if (screeningStep > 0) {
                                  setScreeningStep(prev => prev - 1);
                                } else {
                                  setStep(1);
                                }
                              }}
                              className="text-slate-400 hover:text-white"
                            >
                              {language === "AM" ? "ተመለስ" : "Back"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDepartment("");
                                setIsAutoRouted(false);
                                setIsScreeningCompleted(true);
                                setStep(3);
                              }}
                              className="text-slate-500 hover:text-slate-300"
                            >
                              {SCREENING_STRINGS[language].skipBtn}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3: Select Department */}
                  {!loadingQuestions && step === 3 && (isScreeningCompleted || screeningQuestions.length === 0) && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {language === "AM" ? "3. ልዩ ህክምና ክፍል ይምረጡ" : "3. Select Speciality Department"}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              if (screeningQuestions.length > 0) {
                                setIsScreeningCompleted(false);
                                setStep(2);
                                setScreeningStep(screeningQuestions.length - 1);
                              } else {
                                setStep(1);
                              }
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            {language === "AM" ? "ወደኋላ ተመለስ" : "Back"}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Selected: {selectedHospitalName}</p>
                      </div>

                      {isAutoRouted ? (
                        <div className="space-y-4">
                          <div className="p-5 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-2">
                                <Sparkles className="w-3 h-3" /> {language === "AM" ? "በምርመራ የተመረጠ" : "Auto-Routed"}
                              </span>
                              <h3 className="text-white font-bold text-base">{selectedDepartment}</h3>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {language === "AM" 
                                  ? "በምልክት ግምገማዎ መሰረት ይህንን ክፍል በራስ-ሰር መርጠናል።" 
                                  : "Based on your symptom screening responses, we have auto-selected this department."}
                              </p>
                            </div>
                            <div className="flex gap-3 items-center">
                              <button
                                type="button"
                                onClick={() => setIsAutoRouted(false)}
                                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold"
                              >
                                {language === "AM" ? "ክፍል ቀይር" : "Change Speciality"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setStep(4)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1"
                              >
                                {language === "AM" ? "ቀጣይ" : "Proceed"} <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {DEPARTMENTS.map((dept) => (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => {
                                setSelectedDepartment(dept);
                                setStep(4);
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
                      )}
                    </div>
                  )}

                  {/* STEP 4: Choose Date & Time */}
                  {!loadingQuestions && step === 4 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {language === "AM" ? "4. ቀን እና ሰዓት ይምረጡ" : "4. Select Date and Time"}
                          </label>
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            {language === "AM" ? "ወደ ክፍሎች ተመለስ" : "Back to departments"}
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

          {/* Right Sidebar: Queue Status + Booking History */}
          <div className="space-y-6">

            {/* ── Queue Circuit-Breaker Panel ──────────────────────────────── */}
            {queueStatus?.inQueue && (() => {
              const badge = getWardBadge(queueStatus.ward);
              const isActive = queueStatus.status === "IN_PROGRESS";
              return (
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  {/* Ambient glow rings */}
                  <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />

                  <div className="relative z-10 flex flex-col items-center gap-5 text-center">

                    {/* Ward Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-widest ${badge.ring} ${badge.text} bg-slate-950/60`}>
                      {badge.dot} {badge.label}
                    </span>

                    {/* Circular Countdown Clock */}
                    <div className="relative flex items-center justify-center">
                      {/* Outer decorative ring */}
                      <svg width="160" height="160" className="absolute" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r="72" fill="none" stroke="#334155" strokeWidth="6" />
                        <circle
                          cx="80" cy="80" r="72" fill="none"
                          stroke={isFrozen ? "#f59e0b" : "#6366f1"}
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 72}`}
                          strokeDashoffset={`${
                            baseWaitMinutes > 0
                              ? 2 * Math.PI * 72 * (1 - displayedCountdown / baseWaitMinutes)
                              : 0
                          }`}
                          transform="rotate(-90 80 80)"
                          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.4s ease" }}
                        />
                      </svg>

                      {/* Centre content */}
                      <div className="w-36 h-36 rounded-full bg-slate-950/80 border border-slate-800/60 flex flex-col items-center justify-center shadow-inner z-10">
                        {isActive ? (
                          <>
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Now Seeing You</span>
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mt-1" />
                          </>
                        ) : (
                          <>
                            <span className={`text-4xl font-black tabular-nums leading-none ${
                              isFrozen ? "text-amber-400" : "text-indigo-300"
                            }`}>
                              {displayedCountdown}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">mins</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Queue position text */}
                    <div className="space-y-1">
                      <p className="text-white font-bold text-base leading-snug">
                        You are{" "}
                        <span className="text-indigo-300">#{queueStatus.queuePosition}</span>{" "}
                        in queue
                      </p>
                      <p className="text-slate-400 text-sm">
                        Patients Ahead:{" "}
                        <span className="font-bold text-slate-200">{patientsAhead}</span>
                      </p>
                      {!isActive && (
                        <p className="text-xs font-semibold">
                          <span className="text-slate-400">Est. Wait Time: </span>
                          <span className={isFrozen ? "text-amber-400 font-black" : "text-indigo-300 font-black"}>
                            {displayedCountdown} min{displayedCountdown !== 1 ? "s" : ""}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Freeze notice — only when countdown is locked at 8 */}
                    {isFrozen && !isActive && (
                      <div className="w-full mt-1 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 animate-in fade-in duration-500">
                        <div className="flex items-start gap-2 text-left">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-200 leading-relaxed font-medium">
                            Doctor currently consulting active patient. Your countdown will refresh as soon as the next patient is called.
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              );
            })()}

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
