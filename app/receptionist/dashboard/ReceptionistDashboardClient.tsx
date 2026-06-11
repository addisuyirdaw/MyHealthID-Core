"use client";

import { useState } from "react";
import { 
  Users, Stethoscope, Clock, Check, X, 
  MapPin, CheckCircle2, User, Phone, Search, AlertCircle, RefreshCw 
} from "lucide-react";
import { updateAppointmentStatus, getPendingAppointmentsForFacility } from "@/lib/actions/appointment.actions";

interface Patient {
  id: string;
  fullName: string;
  healthId: string;
  sex: string;
  age: number;
  phoneNumber?: string;
}

interface AppointmentRequest {
  id: string;
  department: string;
  dateTime: string;
  status: string;
  patient: Patient;
}

interface ReceptionistDashboardClientProps {
  initialRequests: AppointmentRequest[];
}

export function ReceptionistDashboardClient({ initialRequests }: ReceptionistDashboardClientProps) {
  const [requests, setRequests] = useState<AppointmentRequest[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI Messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await getPendingAppointmentsForFacility();
      if (res.success && res.appointments) {
        setRequests(res.appointments);
      } else {
        setErrorMsg(res.error || "Failed to refresh requests.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load requests.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAction = async (id: string, action: "SCHEDULED" | "CANCELLED" | "ARRIVED") => {
    setLoadingId(id);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await updateAppointmentStatus(id, action);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to complete booking action.");
      } else {
        // Remove from list or update
        setRequests((prev) => prev.filter((r) => r.id !== id));
        if (action === "ARRIVED") {
          setSuccessMsg("Patient checked in! They have been added to the live triage queue.");
        } else if (action === "SCHEDULED") {
          setSuccessMsg("Appointment approved & scheduled successfully.");
        } else {
          setSuccessMsg("Appointment request declined.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) =>
    r.patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.patient.healthId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-rose-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-pink-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center border border-pink-500/30">
              <Users className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                External Booking Moderation
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Review and check in appointments requested by citizen portal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <div className="bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Pending Requests: </span>
              <span className="text-pink-400 font-bold">{requests.length}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
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

        {/* Search Bar */}
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, Health ID, or department..."
            className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        </div>

        {/* Requests List */}
        <div className="bg-slate-900/20 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No pending appointment requests found.
            </div>
          ) : (
            <div className="divide-y divide-slate-850">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-900/10 transition-colors"
                >
                  {/* Patient Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center font-bold text-slate-200">
                        {req.patient.fullName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">{req.patient.fullName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          ID: <span className="font-mono text-slate-400">{req.patient.healthId}</span> • {req.patient.sex} • {req.patient.age} yrs
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-pink-400" />
                        <span>{req.department}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-pink-400" />
                        <span>{formatDateTime(req.dateTime)}</span>
                      </div>
                      {req.patient.phoneNumber && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-pink-400" />
                          <span>{req.patient.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <button
                      onClick={() => handleAction(req.id, "ARRIVED")}
                      disabled={loadingId !== null}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/20 flex items-center gap-1.5 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Arrived
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "SCHEDULED")}
                      disabled={loadingId !== null}
                      className="bg-slate-900 border border-slate-800 text-slate-200 hover:text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "CANCELLED")}
                      disabled={loadingId !== null}
                      className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-900/50 text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
