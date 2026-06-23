"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  CheckCircle2, AlertCircle, Loader2, Users, Search, Hospital, 
  Activity, Plus, Phone, MapPin, User, Heart, Calendar, 
  Clock, AlertTriangle, ArrowRight, ShieldAlert, BadgeInfo, Check, ChevronRight, UserPlus,
  Stethoscope, Filter, BadgeCheck, MessageSquare
} from "lucide-react";
import { updatePatientPhoneByStaff } from "@/lib/actions/patient.actions";
import { updateAppointmentStatus } from "@/lib/actions/appointment.actions";
import { normalizeHealthcareRole } from "@/lib/locales/enums";

interface Patient {
  id: string;
  healthId: string;
  internalId: string;
  fullName: string;
  age: number;
  sex: string;
  phoneNumber?: string;
  hospitalId?: string; // Card No
  triageStatus: string;
  priorityLevel: string;
  ward: string;
  createdAt: string;
  religion?: string;
  occupation?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: {
    region?: string;
    zone?: string;
    woreda?: string;
    kebele?: string;
  };
}

interface Appointment {
  id: string;
  appointmentTime: string;
  requestedService: string;
  status: string;
  chiefComplaints?: string;
  queuePosition?: number;
  assignedWardId?: string;
  assignedWard?: { id: string; name: string; code: string } | null;
  patient: {
    id: string;
    fullName: string;
    healthId: string;
    sex: string;
    age: number;
    phoneNumber?: string;
  };
}

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

export function ReceptionPortal({ userRole = "", userId = "" }: { userRole?: string; userId?: string }) {
  // System states
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [activeTab, setActiveTab] = useState<"patients" | "appointments">("patients");
  
  // Dashboard data states
  const [metrics, setMetrics] = useState({
    totalToday: 0,
    waitingTriage: 0,
    activeInWards: 0,
    emergencyCases: 0,
    averageIntakeMinutes: 4.2,
    bedOccupancyRate: 74,
  });
  const [todayPatients, setTodayPatients] = useState<Patient[]>([]);
  const [activeQueue, setActiveQueue] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [appointmentWardFilter, setAppointmentWardFilter] = useState<string>("ALL");
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Phone reset modal state
  const [isPhoneResetOpen, setIsPhoneResetOpen] = useState(false);
  const [selectedPatientForReset, setSelectedPatientForReset] = useState<Patient | null>(null);
  const [newPhoneNumberVal, setNewPhoneNumberVal] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const normalizedRole = normalizeHealthcareRole(userRole);
  const isAuthorizedToReset =
    normalizedRole === "RECEPTIONIST" ||
    normalizedRole === "IT_HIS_ADMIN" ||
    normalizedRole === "HOSPITAL_CEO" ||
    userRole === "RECEPTIONIST" ||
    userRole === "SYSTEM_ADMINISTRATOR" ||
    userRole === "ADMIN";

  const handlePhoneReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForReset) return;
    if (!newPhoneNumberVal.trim()) {
      showToast("error", "Validation Alert", "New phone number is required.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await updatePatientPhoneByStaff(
        selectedPatientForReset.id,
        newPhoneNumberVal.trim(),
        userId
      );
      if (res.success) {
        showToast("success", "Success", "Patient verification phone number updated successfully!");
        setIsPhoneResetOpen(false);
        setNewPhoneNumberVal("");
        setSelectedPatientForReset(null);
        fetchDashboardData(true);
      } else {
        showToast("error", "Action Failed", res.error || "Failed to update phone number.");
      }
    } catch (err: any) {
      showToast("error", "Error", err.message || "An unexpected error occurred.");
    } finally {
      setResetLoading(false);
    }
  };

  // Form Collapsible Sections States
  const [expandedSection, setExpandedSection] = useState<"id" | "address" | "contact" | "medical">("id");

  // Detailed Registration Form State
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formData, setFormData] = useState({
    sex: "",
    dateOfBirth: "",
    phoneNumber: "",
    maritalStatus: "",
    occupation: "",
    customOccupation: "",
    religion: "",
    nationality: "Ethiopian",
    country: "Ethiopia",
    region: "Amhara",
    customRegion: "",
    zone: "",
    woreda: "",
    kebele: "",
    subCity: "",
    houseNumber: "",
    alternativePhone: "",
    email: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelationship: "",
    bloodGroup: "",
    reason: "",
  });

  // Fetch Dashboard Data
  const fetchDashboardData = async (silent = false) => {
    if (!silent) setDataLoading(true);
    try {
      const res = await fetch("/api/registration/list");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const result = await res.json();
      if (result.success) {
        setMetrics(result.metrics);
        setTodayPatients(result.todayPatients);
        setActiveQueue(result.activeQueue);
        setAppointments(result.upcomingAppointments);
      }
    } catch (err: any) {
      showToast("error", "Database Error", err.message || "Failed to load active patients list");
    } finally {
      setDataLoading(false);
    }
  };

  // Setup periodic refresh & clock
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 12000);
    
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  // Show toast notification
  const showToast = (type: "success" | "error" | "info", title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Check-in an appointment from the reception desk
  const handleCheckIn = async (appointmentId: string) => {
    setCheckingInId(appointmentId);
    try {
      const res = await updateAppointmentStatus(appointmentId, "ARRIVED");
      if (!res.success) {
        showToast("error", "Check-In Failed", res.error || "Failed to check in patient.");
      } else {
        setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
        showToast("success", "Patient Checked In", "Patient has been added to the live triage queue.");
        fetchDashboardData(true);
      }
    } catch (err: any) {
      showToast("error", "Error", err.message || "An unexpected error occurred.");
    } finally {
      setCheckingInId(null);
    }
  };

  // DOB Age Calculation
  const calculateAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let computedAge = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      computedAge--;
    }
    return computedAge >= 0 && computedAge <= 150 ? computedAge : null;
  };

  const age = calculateAge(formData.dateOfBirth);

  // Form input change helper
  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Form validators
  const validateForm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      showToast("error", "Validation Alert", "First and Last names are mandatory.");
      setExpandedSection("id");
      return false;
    }
    if (!formData.sex) {
      showToast("error", "Validation Alert", "Sex selection is required.");
      setExpandedSection("id");
      return false;
    }
    if (!formData.dateOfBirth || age === null) {
      showToast("error", "Validation Alert", "A valid Date of Birth is mandatory.");
      setExpandedSection("id");
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      showToast("error", "Validation Alert", "Primary phone contact is required.");
      setExpandedSection("contact");
      return false;
    }
    return true;
  };

  // Form submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const fullConcatName = `${firstName.trim()} ${middleName.trim() ? middleName.trim() + " " : ""}${lastName.trim()}`;
    const selectedRegion = formData.region === "Other" ? formData.customRegion.trim() : formData.region;
    const selectedOccupation = formData.occupation === "Other" ? formData.customOccupation.trim() : formData.occupation;
    
    // Concatenate sub-city & house number into kebele for perfect schema storage compatibility
    let enrichedKebele = formData.kebele.trim();
    if (formData.subCity.trim() || formData.houseNumber.trim()) {
      const parts = [];
      if (enrichedKebele) parts.push(`Kebele: ${enrichedKebele}`);
      if (formData.subCity.trim()) parts.push(`Sub-city: ${formData.subCity.trim()}`);
      if (formData.houseNumber.trim()) parts.push(`House No: ${formData.houseNumber.trim()}`);
      enrichedKebele = parts.join(", ");
    }

    try {
      const res = await fetch("/api/registration/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullConcatName,
          sex: formData.sex,
          dateOfBirth: formData.dateOfBirth,
          phoneNumber: formData.phoneNumber.trim(),
          region: selectedRegion || "Amhara",
          zone: formData.zone.trim(),
          woreda: formData.woreda.trim(),
          kebele: enrichedKebele,
          reason: formData.reason.trim() || "General Consultation",
          religion: formData.religion,
          occupation: selectedOccupation,
          maritalStatus: formData.maritalStatus,
          bloodGroup: formData.bloodGroup,
          emergencyContactName: formData.emergencyName.trim() || null,
          emergencyContactPhone: formData.emergencyPhone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register patient.");

      showToast("success", "Intake Completed", `Successfully registered ${fullConcatName} (#${data.patientId})`);
      setIsModalOpen(false);
      
      // Reset Form State
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setFormData({
        sex: "",
        dateOfBirth: "",
        phoneNumber: "",
        maritalStatus: "",
        occupation: "",
        customOccupation: "",
        religion: "",
        nationality: "Ethiopian",
        country: "Ethiopia",
        region: "Amhara",
        customRegion: "",
        zone: "",
        woreda: "",
        kebele: "",
        subCity: "",
        houseNumber: "",
        alternativePhone: "",
        email: "",
        emergencyName: "",
        emergencyPhone: "",
        emergencyRelationship: "",
        bloodGroup: "",
        reason: "",
      });
      setExpandedSection("id");

      // Refresh live lists
      fetchDashboardData();
    } catch (err: any) {
      showToast("error", "Submission Failed", err.message || "Failed to submit registration.");
    } finally {
      setLoading(false);
    }
  };

  // Filtering today's patient list & appointments
  const filteredPatients = todayPatients.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(query) ||
      p.healthId.toLowerCase().includes(query) ||
      (p.hospitalId && p.hospitalId.toLowerCase().includes(query)) ||
      (p.phoneNumber && p.phoneNumber.includes(query))
    );
  });

  const filteredAppointments = appointments.filter((a) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      a.patient.fullName.toLowerCase().includes(query) ||
      a.patient.healthId.toLowerCase().includes(query) ||
      a.requestedService.toLowerCase().includes(query) ||
      (a.chiefComplaints || "").toLowerCase().includes(query)
    );
    const matchesWard =
      appointmentWardFilter === "ALL" ||
      (a.assignedWard?.code === appointmentWardFilter);
    return matchesSearch && matchesWard;
  });

  // Visual avatar color matcher based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-pink-500/10 text-pink-600 border-pink-200",
      "bg-blue-500/10 text-blue-600 border-blue-200",
      "bg-emerald-500/10 text-emerald-600 border-emerald-200",
      "bg-purple-500/10 text-purple-600 border-purple-200",
      "bg-amber-500/10 text-amber-600 border-amber-200",
      "bg-cyan-500/10 text-cyan-600 border-cyan-200",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col relative overflow-hidden">
      
      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 space-y-3 z-50 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-xl border shadow-xl flex gap-3 items-start animate-in slide-in-from-right duration-300 ${
              t.type === "success" 
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-800" 
                : t.type === "error" 
                  ? "bg-red-950/90 text-red-200 border-red-800" 
                  : "bg-blue-950/90 text-blue-200 border-blue-800"
            }`}
          >
            {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
            {t.type === "error" && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
            {t.type === "info" && <BadgeInfo className="w-5 h-5 text-blue-400 flex-shrink-0" />}
            <div>
              <p className="font-bold text-sm text-white">{t.title}</p>
              <p className="text-xs mt-1 text-neutral-300">{t.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* 1. TOP HEADER (SYSTEM BAR) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/30">
              <Hospital className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Reception Desk Portal
              </h1>
              <p className="text-neutral-400 text-xs mt-0.5">
                Active Facility: <span className="font-semibold text-neutral-300">MyHealthID Medical Center</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Clock Widget */}
            <div className="bg-neutral-850 px-4 py-2 rounded-xl border border-neutral-800 flex items-center gap-2 text-xs font-mono">
              <Clock className="w-4 h-4 text-pink-400 animate-pulse" />
              <span className="text-neutral-200 font-bold">{currentTime || "Loading..."}</span>
            </div>

            {/* Shift Widget */}
            <div className="bg-neutral-850 px-4 py-2 rounded-xl border border-neutral-800 text-xs">
              <span className="text-neutral-400">Duty Clerk: </span>
              <span className="text-pink-400 font-semibold">Shift A | Terminal 1</span>
            </div>

            {/* Main Action Registration Trigger Button */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold h-10 px-5 rounded-xl shadow-lg shadow-pink-900/20 flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  + Add New Patient
                </Button>
              </DialogTrigger>
              
              {/* STUNNING PATENT REGISTRATION MODAL FORM */}
              <DialogContent className="max-w-2xl bg-neutral-900 border-neutral-800 text-neutral-100 p-0 overflow-hidden shadow-2xl rounded-2xl">
                <div className="bg-gradient-to-r from-pink-600 to-rose-600 p-6 text-white">
                  <DialogTitle className="text-xl font-black flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-white animate-bounce-subtle" /> Patient Registration intake
                  </DialogTitle>
                  <DialogDescription className="text-pink-100/90 text-xs mt-1">
                    Enter structured identification, address, and emergency contact details below.
                  </DialogDescription>
                </div>

                <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  
                  {/* SECTION 1: IDENTIFICATION DETAILS (COLLAPSIBLE) */}
                  <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "id" ? "" as any : "id")}
                      className="w-full flex items-center justify-between p-4 bg-neutral-950/80 hover:bg-neutral-950 text-left border-b border-neutral-800 transition-colors"
                    >
                      <span className="font-bold text-sm flex items-center gap-2 text-pink-400">
                        <User className="w-4 h-4" /> 1. Identification Details
                      </span>
                      <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${expandedSection === "id" ? "rotate-90" : ""}`} />
                    </button>
                    
                    {expandedSection === "id" && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-350">
                        <div>
                          <Label className="text-neutral-300 text-xs">First Name *</Label>
                          <Input 
                            value={firstName} 
                            onChange={(e) => setFirstName(e.target.value)} 
                            placeholder="e.g. Abebe"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5 focus:border-pink-500" 
                          />
                        </div>
                        <div>
                          <Label className="text-neutral-300 text-xs">Middle Name</Label>
                          <Input 
                            value={middleName} 
                            onChange={(e) => setMiddleName(e.target.value)} 
                            placeholder="e.g. Kebede"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5 focus:border-pink-500" 
                          />
                        </div>
                        <div>
                          <Label className="text-neutral-300 text-xs">Last Name *</Label>
                          <Input 
                            value={lastName} 
                            onChange={(e) => setLastName(e.target.value)} 
                            placeholder="e.g. Balcha"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5 focus:border-pink-500" 
                          />
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Sex *</Label>
                          <Select value={formData.sex} onValueChange={(val) => handleFormChange("sex", val)}>
                            <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Date of Birth *</Label>
                          <Input 
                            type="date"
                            value={formData.dateOfBirth} 
                            onChange={(e) => handleFormChange("dateOfBirth", e.target.value)} 
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>

                        <div className="flex items-end h-full pb-0.5">
                          {age !== null ? (
                            <div className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between">
                              <span>Auto-calculated Age:</span>
                              <span className="font-mono text-sm font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/30">{age} yrs</span>
                            </div>
                          ) : (
                            <div className="w-full bg-neutral-900 border border-neutral-850 px-3 py-2 rounded-xl text-xs text-neutral-500 italic">
                              Age calculated on DOB entry
                            </div>
                          )}
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Marital Status</Label>
                          <Select value={formData.maritalStatus} onValueChange={(val) => handleFormChange("maritalStatus", val)}>
                            <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                              <SelectItem value="Divorced">Divorced</SelectItem>
                              <SelectItem value="Widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Occupation</Label>
                          <Select value={formData.occupation} onValueChange={(val) => handleFormChange("occupation", val)}>
                            <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                              <SelectItem value="Student">Student</SelectItem>
                              <SelectItem value="Farmer">Farmer</SelectItem>
                              <SelectItem value="Civil Servant">Civil Servant</SelectItem>
                              <SelectItem value="Trader">Trader</SelectItem>
                              <SelectItem value="Unemployed">Unemployed</SelectItem>
                              <SelectItem value="Other">Other (Specify)</SelectItem>
                            </SelectContent>
                          </Select>
                          {formData.occupation === "Other" && (
                            <Input
                              value={formData.customOccupation}
                              onChange={(e) => handleFormChange("customOccupation", e.target.value)}
                              placeholder="Describe occupation"
                              className="bg-neutral-900 border-neutral-800 text-white h-9 mt-2"
                            />
                          )}
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Religion</Label>
                          <Select value={formData.religion} onValueChange={(val) => handleFormChange("religion", val)}>
                            <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                              <SelectItem value="Orthodox">Orthodox</SelectItem>
                              <SelectItem value="Muslim">Muslim</SelectItem>
                              <SelectItem value="Protestant">Protestant</SelectItem>
                              <SelectItem value="Catholic">Catholic</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                              <SelectItem value="None">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: ADDRESS DETAILS (COLLAPSIBLE) */}
                  <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "address" ? "" as any : "address")}
                      className="w-full flex items-center justify-between p-4 bg-neutral-950/80 hover:bg-neutral-950 text-left border-b border-neutral-800 transition-colors"
                    >
                      <span className="font-bold text-sm flex items-center gap-2 text-pink-400">
                        <MapPin className="w-4 h-4" /> 2. Address Details
                      </span>
                      <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${expandedSection === "address" ? "rotate-90" : ""}`} />
                    </button>
                    
                    {expandedSection === "address" && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-350">
                        <div>
                          <Label className="text-neutral-300 text-xs">Country</Label>
                          <Input 
                            value={formData.country} 
                            onChange={(e) => handleFormChange("country", e.target.value)} 
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                            disabled
                          />
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Region</Label>
                          <Select value={formData.region} onValueChange={(val) => handleFormChange("region", val)}>
                            <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                              <SelectItem value="Addis Ababa">Addis Ababa</SelectItem>
                              <SelectItem value="Amhara">Amhara</SelectItem>
                              <SelectItem value="Oromia">Oromia</SelectItem>
                              <SelectItem value="Tigray">Tigray</SelectItem>
                              <SelectItem value="Sidama">Sidama</SelectItem>
                              <SelectItem value="SNNPR">SNNPR</SelectItem>
                              <SelectItem value="Somali">Somali</SelectItem>
                              <SelectItem value="Other">Other (Specify)</SelectItem>
                            </SelectContent>
                          </Select>
                          {formData.region === "Other" && (
                            <Input
                              value={formData.customRegion}
                              onChange={(e) => handleFormChange("customRegion", e.target.value)}
                              placeholder="Specify region"
                              className="bg-neutral-900 border-neutral-800 text-white h-9 mt-2"
                            />
                          )}
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Zone / Sub-city</Label>
                          <Input 
                            value={formData.zone} 
                            onChange={(e) => handleFormChange("zone", e.target.value)} 
                            placeholder="e.g. North Shewa or Kirkos"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Woreda / District</Label>
                          <Input 
                            value={formData.woreda} 
                            onChange={(e) => handleFormChange("woreda", e.target.value)} 
                            placeholder="e.g. Debre Berhan Woreda"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Kebele / Village</Label>
                          <Input 
                            value={formData.kebele} 
                            onChange={(e) => handleFormChange("kebele", e.target.value)} 
                            placeholder="e.g. Kebele 04"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">House Number (Optional)</Label>
                          <Input 
                            value={formData.houseNumber} 
                            onChange={(e) => handleFormChange("houseNumber", e.target.value)} 
                            placeholder="e.g. 512"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: CONTACT & EMERGENCY DETAILS (COLLAPSIBLE) */}
                  <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "contact" ? "" as any : "contact")}
                      className="w-full flex items-center justify-between p-4 bg-neutral-950/80 hover:bg-neutral-950 text-left border-b border-neutral-800 transition-colors"
                    >
                      <span className="font-bold text-sm flex items-center gap-2 text-pink-400">
                        <Phone className="w-4 h-4" /> 3. Contact &amp; Emergency Details
                      </span>
                      <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${expandedSection === "contact" ? "rotate-90" : ""}`} />
                    </button>
                    
                    {expandedSection === "contact" && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-350">
                        <div>
                          <Label className="text-neutral-300 text-xs">Primary Phone *</Label>
                          <Input 
                            value={formData.phoneNumber} 
                            onChange={(e) => handleFormChange("phoneNumber", e.target.value)} 
                            placeholder="e.g. 0911000000"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Alternative Phone</Label>
                          <Input 
                            value={formData.alternativePhone} 
                            onChange={(e) => handleFormChange("alternativePhone", e.target.value)} 
                            placeholder="e.g. 0912000000"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Email Address (Optional)</Label>
                          <Input 
                            type="email"
                            value={formData.email} 
                            onChange={(e) => handleFormChange("email", e.target.value)} 
                            placeholder="e.g. user@gmail.com"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>

                        <div className="md:col-span-3 border-t border-neutral-800/60 pt-4 mt-2">
                          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Emergency Contact Info</h4>
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Emergency Name</Label>
                          <Input 
                            value={formData.emergencyName} 
                            onChange={(e) => handleFormChange("emergencyName", e.target.value)} 
                            placeholder="e.g. Martha Kebede"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Emergency Phone</Label>
                          <Input 
                            value={formData.emergencyPhone} 
                            onChange={(e) => handleFormChange("emergencyPhone", e.target.value)} 
                            placeholder="e.g. 0922000000"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5" 
                          />
                        </div>

                        <div>
                          <Label className="text-neutral-300 text-xs">Relationship</Label>
                          <Select value={formData.emergencyRelationship} onValueChange={(val) => handleFormChange("emergencyRelationship", val)}>
                            <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Sibling">Sibling</SelectItem>
                              <SelectItem value="Child">Child</SelectItem>
                              <SelectItem value="Friend">Friend</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 4: MEDICAL DETAILS (COLLAPSIBLE) */}
                  <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "medical" ? "" as any : "medical")}
                      className="w-full flex items-center justify-between p-4 bg-neutral-950/80 hover:bg-neutral-950 text-left border-b border-neutral-800 transition-colors"
                    >
                      <span className="font-bold text-sm flex items-center gap-2 text-pink-400">
                        <Heart className="w-4 h-4" /> 4. Medical Background
                      </span>
                      <ChevronRight className={`w-4 h-4 text-neutral-400 transition-transform ${expandedSection === "medical" ? "rotate-90" : ""}`} />
                    </button>
                    
                    {expandedSection === "medical" && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-350">
                        <div>
                          <Label className="text-neutral-300 text-xs">Blood Group</Label>
                          <Select value={formData.bloodGroup} onValueChange={(val) => handleFormChange("bloodGroup", val)}>
                            <SelectTrigger className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                              <SelectItem value="Unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-neutral-300 text-xs">Reason for Visit / Chief Complaint</Label>
                          <Input 
                            value={formData.reason} 
                            onChange={(e) => handleFormChange("reason", e.target.value)} 
                            placeholder="e.g. Chest pain, Fever, Routine Assessment"
                            className="bg-neutral-900 border-neutral-800 text-white h-9 mt-1.5 focus:border-pink-500" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission and Close buttons */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800">
                    <Button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 h-10 px-5 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold h-10 px-6 rounded-xl shadow-lg cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Completing Intake...
                        </>
                      ) : (
                        "Save & Check-In"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* 2. EMERGENCY / NOTIFICATIONS ALERTS BANNER AREA */}
        {metrics.emergencyCases > 0 && (
          <div className="p-4 bg-gradient-to-r from-red-950/80 to-rose-950/60 border border-red-900/60 rounded-2xl flex items-center justify-between shadow-xl animate-pulse-subtle">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center animate-ping-slow">
                <AlertTriangle className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <p className="font-bold text-sm text-red-100 flex items-center gap-2">
                  Emergency Alert Notification <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                </p>
                <p className="text-red-300/90 text-xs mt-0.5">
                  There are <span className="font-black text-white">{metrics.emergencyCases} emergency case(s)</span> waiting in the queue. Please fast-track clinical triage.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-yellow-400 hover:bg-yellow-500 text-neutral-950 font-bold px-3 py-1.5 h-8 rounded-lg text-xs"
              onClick={() => showToast("info", "Action Taken", "Triage Nurse alerted to expedite emergencies.")}
            >
              Alert Triage Nurse
            </Button>
          </div>
        )}

        {/* 3. STUNNING HIGHLIGHT REAL-TIME METRICS GRIDS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          
          {/* TODAY REGISTERED CARD */}
          <Card className="bg-gradient-to-br from-pink-950/60 to-neutral-900/90 border-pink-900/40 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-pink-300 text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                Total Intakes <Users className="w-4 h-4 text-pink-400" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-3xl font-black text-white">{metrics.totalToday}</span>
              <p className="text-[10px] text-neutral-400 mt-1">registered today</p>
            </CardContent>
          </Card>

          {/* WAITING TRIAGE CARD */}
          <Card className="bg-gradient-to-br from-cyan-950/60 to-neutral-900/90 border-cyan-900/40 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-cyan-300 text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                Waiting Triage <Activity className="w-4 h-4 text-cyan-400" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-3xl font-black text-white">{metrics.waitingTriage}</span>
              <p className="text-[10px] text-neutral-400 mt-1">patients in lobby</p>
            </CardContent>
          </Card>

          {/* ACTIVE IN WARDS */}
          <Card className="bg-gradient-to-br from-purple-950/60 to-neutral-900/90 border-purple-900/40 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-purple-300 text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                Active Wards <User className="w-4 h-4 text-purple-400" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-3xl font-black text-white">{metrics.activeInWards}</span>
              <p className="text-[10px] text-neutral-400 mt-1">currently being seen</p>
            </CardContent>
          </Card>

          {/* EMERGENCY ALERTS */}
          <Card className={`overflow-hidden relative group shadow-xl ${
            metrics.emergencyCases > 0 
              ? "bg-gradient-to-br from-red-950/80 to-neutral-900/90 border-red-800 animate-pulse-subtle" 
              : "bg-gradient-to-br from-neutral-900 to-neutral-900/90 border-neutral-800"
          }`}>
            <CardHeader className="p-4 pb-2">
              <CardDescription className={`text-xs font-semibold uppercase tracking-wider flex items-center justify-between ${
                metrics.emergencyCases > 0 ? "text-red-300" : "text-neutral-400"
              }`}>
                Emergency Cases <AlertTriangle className={`w-4 h-4 ${metrics.emergencyCases > 0 ? "text-red-400 animate-bounce" : "text-neutral-500"}`} />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className={`text-3xl font-black ${metrics.emergencyCases > 0 ? "text-red-400 font-extrabold" : "text-white"}`}>
                {metrics.emergencyCases}
              </span>
              <p className="text-[10px] text-neutral-400 mt-1">requires immediate care</p>
            </CardContent>
          </Card>

          {/* CLERK EFFICIENCY */}
          <Card className="bg-gradient-to-br from-neutral-900 to-neutral-900/90 border-neutral-800 shadow-xl overflow-hidden relative">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                Clerk Efficiency
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-3xl font-black text-white">{metrics.averageIntakeMinutes}m</span>
              <p className="text-[10px] text-neutral-400 mt-1">average intake time</p>
            </CardContent>
          </Card>

          {/* BED OCCUPANCY */}
          <Card className="bg-gradient-to-br from-neutral-900 to-neutral-900/90 border-neutral-800 shadow-xl overflow-hidden relative">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">
                Bed Occupancy
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-3xl font-black text-white">{metrics.bedOccupancyRate}%</span>
              <p className="text-[10px] text-neutral-400 mt-1">ER/OPD wards occupied</p>
            </CardContent>
          </Card>
        </div>

        {/* 4. ACTIVE PATIENT QUEUE (HORIZONTAL scrolling cards STRIP) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-pink-400" /> Active Patient Queue (Live Strip)
            </h3>
            <span className="text-xs text-neutral-500">Showing {activeQueue.length} patient(s) waiting triage</span>
          </div>

          {activeQueue.length === 0 ? (
            <div className="p-6 bg-neutral-950/40 border border-neutral-800/80 rounded-2xl text-center text-neutral-500 text-xs italic">
              No patients waiting in queue. Click "+ Add New Patient" to register and initialize the live queue.
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
              {activeQueue.map((patient, index) => {
                const isEmergency = patient.priorityLevel === "EMERGENCY";
                const isUrgent = patient.priorityLevel === "URGENT";
                const initials = patient.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
                
                return (
                  <Card 
                    key={patient.id} 
                    className={`w-64 flex-shrink-0 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-l-4 border ${
                      isEmergency 
                        ? "bg-gradient-to-r from-red-950/80 to-neutral-900 border-red-500 border-l-red-500 shadow-lg shadow-red-950/10" 
                        : isUrgent 
                          ? "bg-neutral-900 border-neutral-800 border-l-amber-500" 
                          : "bg-neutral-900 border-neutral-800 border-l-pink-500"
                    }`}
                  >
                    <CardContent className="p-4 flex gap-3 items-center">
                      {/* Circle Avatar */}
                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs font-black shrink-0 ${
                        isEmergency 
                          ? "bg-red-500/10 text-red-400 border-red-500/30" 
                          : getAvatarColor(patient.fullName)
                      }`}>
                        {initials}
                      </div>

                      {/* Patient metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold text-sm text-white truncate" title={patient.fullName}>{patient.fullName}</p>
                          <span className="font-mono text-[10px] text-neutral-500 font-bold shrink-0">#{index + 1}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-neutral-400 font-mono">{patient.healthId}</span>
                          <span className="text-[10px] text-neutral-500">|</span>
                          <span className="text-[10px] text-neutral-400 font-mono">Card: {patient.hospitalId || "—"}</span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-neutral-800/80">
                          <span className="text-[10px] text-neutral-400 truncate">{patient.sex}, {patient.age} yrs</span>
                          {isEmergency ? (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span> Emergency
                            </span>
                          ) : (
                            <span className="bg-neutral-800 text-neutral-300 border border-neutral-700 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider">
                              Waiting Triage
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. MAIN CORE LAYOUT AREA (TWO COLUMNS) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT & CENTER PANEL (COLUMNS 1 & 2) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Horizontal Tabs: Registered Patients vs. Upcoming Appointments */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("patients")}
                  className={`px-4 py-2 text-sm font-bold transition-all border-b-2 rounded-t-lg ${
                    activeTab === "patients" 
                      ? "text-pink-400 border-pink-500 bg-pink-500/5" 
                      : "text-neutral-400 border-transparent hover:text-white"
                  }`}
                >
                  Today's Intakes ({filteredPatients.length})
                </button>
                <button
                  onClick={() => setActiveTab("appointments")}
                  className={`px-4 py-2 text-sm font-bold transition-all border-b-2 rounded-t-lg ${
                    activeTab === "appointments" 
                      ? "text-pink-400 border-pink-500 bg-pink-500/5" 
                      : "text-neutral-400 border-transparent hover:text-white"
                  }`}
                >
                  Today's Appointments ({filteredAppointments.length})
                </button>
              </div>
            </div>

            {/* TAB CONTENT: TODAY INTAKES LIST */}
            {activeTab === "patients" && (
              <Card className="bg-neutral-900 border-neutral-800 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider">
                        <th className="p-4">Card No</th>
                        <th className="p-4">Patient ID</th>
                        <th className="p-4">Full Name</th>
                        <th className="p-4">Age/Sex</th>
                        <th className="p-4">Contact Phone</th>
                        <th className="p-4">Region/Address</th>
                        <th className="p-4">Triage Status</th>
                        {isAuthorizedToReset && <th className="p-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/80">
                      {dataLoading ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-neutral-400">
                            <Loader2 className="w-6 h-6 animate-spin text-pink-500 mx-auto" />
                            <p className="mt-2 text-xs">Loading registered patients database...</p>
                          </td>
                        </tr>
                      ) : filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-neutral-500 italic">
                            No registered intakes matching the filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredPatients.map((patient) => {
                          const isEmergency = patient.priorityLevel === "EMERGENCY";
                          const isUrgent = patient.priorityLevel === "URGENT";
                          
                          return (
                            <tr key={patient.id} className="hover:bg-neutral-850/60 transition-colors group">
                              <td className="p-4 font-mono font-bold text-neutral-300">{patient.hospitalId || "—"}</td>
                              <td className="p-4 font-mono text-neutral-400 group-hover:text-pink-400 transition-colors">{patient.healthId}</td>
                              <td className="p-4 font-bold text-white text-sm">{patient.fullName}</td>
                              <td className="p-4 text-neutral-300">{patient.age} / {patient.sex}</td>
                              <td className="p-4 font-mono text-neutral-400">{patient.phoneNumber || "—"}</td>
                              <td className="p-4 text-neutral-400 truncate max-w-[140px]" title={patient.address?.region}>
                                {patient.address?.region || "Amhara"}, {patient.address?.zone || "—"}
                              </td>
                              <td className="p-4">
                                {isEmergency ? (
                                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]">
                                    Emergency
                                  </span>
                                ) : isUrgent ? (
                                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px]">
                                    Urgent Ward
                                  </span>
                                ) : (
                                  <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px]">
                                    Waiting Triage
                                  </span>
                                )}
                              </td>
                              {isAuthorizedToReset && (
                                <td className="p-4 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPatientForReset(patient);
                                      setNewPhoneNumberVal(patient.phoneNumber || "");
                                      setIsPhoneResetOpen(true);
                                    }}
                                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700/60 text-xs font-semibold"
                                  >
                                    Update Verification Phone
                                  </Button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* TAB CONTENT: APPOINTMENTS LIST */}
            {activeTab === "appointments" && (
              <Card className="bg-neutral-900 border-neutral-800 shadow-2xl overflow-hidden">
                {/* Ward Filter Bar */}
                <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-neutral-800">
                  <Filter className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Filter by Ward:</span>
                  <div className="flex gap-2 flex-wrap">
                    {["ALL", "GEN_MED", "PED", "CARD"].map((code) => {
                      const label = code === "ALL" ? "All Wards" : code === "GEN_MED" ? "General Medicine" : code === "PED" ? "Pediatrics" : "Cardiology";
                      return (
                        <button
                          key={code}
                          onClick={() => setAppointmentWardFilter(code)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                            appointmentWardFilter === code
                              ? "bg-pink-500 border-pink-400 text-white shadow"
                              : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="ml-auto text-[10px] text-neutral-600">{filteredAppointments.length} shown</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider">
                        <th className="p-4">#</th>
                        <th className="p-4">Time Slot</th>
                        <th className="p-4">Patient Name</th>
                        <th className="p-4">Age/Sex</th>
                        <th className="p-4">Ward / Service</th>
                        <th className="p-4">Chief Complaints</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/80">
                      {dataLoading ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-neutral-400">
                            <Loader2 className="w-6 h-6 animate-spin text-pink-500 mx-auto" />
                            <p className="mt-2 text-xs">Loading appointments database...</p>
                          </td>
                        </tr>
                      ) : filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-neutral-500 italic">
                            No appointments scheduled for today.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((app) => (
                          <tr key={app.id} className="hover:bg-neutral-850/60 transition-colors">
                            {/* Queue position badge */}
                            <td className="p-4">
                              <span className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 font-black text-sm flex items-center justify-center">
                                #{app.queuePosition ?? "—"}
                              </span>
                            </td>
                            {/* Time Slot */}
                            <td className="p-4 font-mono font-bold text-pink-400 text-sm">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> {app.appointmentTime}
                              </div>
                            </td>
                            {/* Patient Name + Health ID */}
                            <td className="p-4">
                              <div className="font-bold text-white text-sm">{app.patient.fullName}</div>
                              <div className="font-mono text-[10px] text-neutral-500 mt-0.5">{app.patient.healthId}</div>
                            </td>
                            {/* Age / Sex */}
                            <td className="p-4 text-neutral-300">{app.patient.age} / {app.patient.sex}</td>
                            {/* Ward / Service */}
                            <td className="p-4">
                              <div className="font-medium text-neutral-200">{app.assignedWard?.name || app.requestedService}</div>
                              {app.assignedWard && (
                                <div className="text-[9px] font-mono text-neutral-600 mt-0.5 uppercase">{app.assignedWard.code}</div>
                              )}
                            </td>
                            {/* Chief Complaints snippet */}
                            <td className="p-4 max-w-[200px]">
                              {app.chiefComplaints ? (
                                <div className="flex items-start gap-1.5">
                                  <MessageSquare className="w-3 h-3 text-neutral-500 mt-0.5 shrink-0" />
                                  <span className="text-neutral-400 line-clamp-2 leading-relaxed">
                                    {app.chiefComplaints.slice(0, 80)}{app.chiefComplaints.length > 80 ? "…" : ""}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-neutral-600 italic">No complaints filed</span>
                              )}
                            </td>
                            {/* Check-In Action */}
                            <td className="p-4">
                              <button
                                onClick={() => handleCheckIn(app.id)}
                                disabled={checkingInId !== null}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow shadow-emerald-900/30"
                              >
                                {checkingInId === app.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <BadgeCheck className="w-3 h-3" />
                                )}
                                Check In
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* RIGHT SIDE PANEL (COLUMN 3) */}
          <div className="space-y-6">
            
            {/* Patient Search & Global Filter Panel */}
            <Card className="bg-neutral-900 border-neutral-800 shadow-2xl relative overflow-hidden group">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-4 h-4 text-pink-400" /> Patient Search &amp; Global Filter
                </CardTitle>
                <CardDescription className="text-neutral-400 text-xs">
                  Lookup patients in real-time by Name, ID, Card No, or Contact.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                  <Input
                    placeholder="Search by Name, PT-XXXXX, Card..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white h-9 pl-9 focus:border-pink-500 text-xs"
                  />
                </div>
                {searchQuery && (
                  <div className="p-2 rounded-lg bg-pink-950/20 text-pink-400 text-xs flex items-center justify-between border border-pink-900/30">
                    <span>Active Filters Applied</span>
                    <button onClick={() => setSearchQuery("")} className="underline text-[10px] hover:text-white">Clear</button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bed & Resource Occupancy Status Widget */}
            <Card className="bg-neutral-900 border-neutral-800 shadow-2xl">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-pink-400" /> Bed &amp; Resource Capacity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                
                {/* Emergency Room Beds */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-300">Emergency Room (ER)</span>
                    <span className="text-red-400">5 / 8 Beds</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/80">
                    <div className="h-full bg-gradient-to-r from-red-600 to-rose-600 rounded-full" style={{ width: "62.5%" }}></div>
                  </div>
                </div>

                {/* OPD Wards */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-300">OPD Consultation Clinics</span>
                    <span className="text-pink-400">12 / 20 Wards</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/80">
                    <div className="h-full bg-gradient-to-r from-pink-600 to-rose-600 rounded-full" style={{ width: "60%" }}></div>
                  </div>
                </div>

                {/* Card Room Clerk Load */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-300">Card Room Clerk Load</span>
                    <span className="text-emerald-400">Normal (Normal Load)</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/80">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full" style={{ width: "35%" }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Incomplete Registration Alerts Widget */}
            <Card className="bg-neutral-900 border-neutral-800 shadow-2xl">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-pink-400" /> Incomplete Registration Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3">
                {filteredPatients.some(p => !p.phoneNumber || !p.emergencyContactName) ? (
                  filteredPatients.filter(p => !p.phoneNumber || !p.emergencyContactName).slice(0, 2).map(p => (
                    <div key={p.id} className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl flex items-start gap-2.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{p.fullName}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Missing emergency details or contact</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-pink-400 hover:text-pink-500 text-[10px] p-0 h-auto underline font-bold"
                        onClick={() => showToast("info", "Quick Edit", "Verification flow and profile details open.")}
                      >
                        Resolve
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic text-center py-4">No incomplete registration alerts detected.</p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

      </div>

      {/* Update Verification Phone Modal */}
      <Dialog open={isPhoneResetOpen} onOpenChange={setIsPhoneResetOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-400" />
              Update Verification Phone
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs mt-1">
              Correct the patient's phone number to allow verification code delivery.
            </DialogDescription>
          </DialogHeader>

          {selectedPatientForReset && (
            <form onSubmit={handlePhoneReset} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-neutral-400 text-xs uppercase tracking-wider">Patient Name</Label>
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
                  {selectedPatientForReset.fullName}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-neutral-400 text-xs uppercase tracking-wider">Patient ID</Label>
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-mono text-neutral-300">
                  {selectedPatientForReset.healthId}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPhoneNumber" className="text-neutral-300 text-xs font-semibold">New Phone Number</Label>
                <Input
                  id="newPhoneNumber"
                  type="text"
                  value={newPhoneNumberVal}
                  onChange={(e) => setNewPhoneNumberVal(e.target.value)}
                  placeholder="e.g. +251912345678"
                  required
                  className="bg-neutral-950 border-neutral-800 text-white focus:border-blue-500/50 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-800/60">
                <Button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {resetLoading ? "Updating..." : "Update Phone"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPhoneResetOpen(false)}
                  disabled={resetLoading}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700/60"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
