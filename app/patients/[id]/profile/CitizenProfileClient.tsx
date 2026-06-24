"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { updateCitizenProfile } from "@/lib/actions/patient.actions";
import {
  User,
  Phone,
  Calendar,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Edit2,
  Save,
  X,
  Shield,
  Lock,
  Mail,
  Briefcase,
  BookOpen,
  Users,
  CheckCircle2,
} from "lucide-react";

interface CitizenProfileClientProps {
  patientId: string;
  initialFullName: string;
  initialPhoneNumber: string;
  initialDob: string;
  healthId: string;
  initialEmail: string;
  initialSex: string;
  initialAge: number;
  initialReligion: string;
  initialOccupation: string;
  initialMaritalStatus: string;
  initialEducationalStatus: string;
  initialEmergencyContactName: string;
  initialEmergencyContactPhone: string;
  initialBloodGroup: string;
  initialNationalId: string;
  initialFaydaId: string;
}

export default function CitizenProfileClient({
  patientId,
  initialFullName,
  initialPhoneNumber,
  initialDob,
  healthId,
  initialEmail,
  initialSex,
  initialAge,
  initialReligion,
  initialOccupation,
  initialMaritalStatus,
  initialEducationalStatus,
  initialEmergencyContactName,
  initialEmergencyContactPhone,
  initialBloodGroup,
  initialNationalId,
  initialFaydaId,
}: CitizenProfileClientProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(initialFullName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [dob, setDob] = useState(initialDob);
  const [email, setEmail] = useState(initialEmail);
  const [sex, setSex] = useState(initialSex || "Male");
  const [age, setAge] = useState(initialAge);
  const [religion, setReligion] = useState(initialReligion);
  const [occupation, setOccupation] = useState(initialOccupation);
  const [maritalStatus, setMaritalStatus] = useState(initialMaritalStatus);
  const [educationalStatus, setEducationalStatus] = useState(initialEducationalStatus);
  const [emergencyContactName, setEmergencyContactName] = useState(initialEmergencyContactName);
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initialEmergencyContactPhone);
  const [bloodGroup, setBloodGroup] = useState(initialBloodGroup);
  const [nationalId, setNationalId] = useState(initialNationalId);
  const [faydaId, setFaydaId] = useState(initialFaydaId);
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute field lock status based on presence of initial values
  const isNationalIdLocked = !!initialNationalId;
  const isFaydaIdLocked = !!initialFaydaId;
  const isBloodGroupLocked = !!initialBloodGroup;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      setError("Please enter a valid date of birth.");
      setLoading(false);
      return;
    }
    const currentYear = new Date().getFullYear();
    const dobYear = dobDate.getFullYear();
    if (dobYear < 1900 || dobYear > currentYear) {
      setError(`Date of birth must be a valid date between 1900 and ${currentYear}.`);
      setLoading(false);
      return;
    }
    if (dobDate > new Date()) {
      setError("Date of birth cannot be in the future.");
      setLoading(false);
      return;
    }

    try {
      const result = await updateCitizenProfile({
        fullName,
        phoneNumber,
        dateOfBirth: dob,
        email,
        sex,
        age: Number(age),
        religion,
        occupation,
        maritalStatus,
        educationalStatus,
        emergencyContactName,
        emergencyContactPhone,
        bloodGroup,
        nationalId,
        faydaId,
        password: password || undefined,
      });

      if (result.success) {
        setSuccess(t.profile.successMessage || "Profile updated successfully!");
        setIsEditing(false);
        setPassword(""); // Clear password field on success
        router.refresh();
      } else {
        setError(result.error || t.profile.errorMessage || "Failed to update profile.");
      }
    } catch (err: any) {
      setError(err.message || t.profile.errorMessage || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFullName(initialFullName);
    setPhoneNumber(initialPhoneNumber);
    setDob(initialDob);
    setEmail(initialEmail);
    setSex(initialSex || "Male");
    setAge(initialAge);
    setReligion(initialReligion);
    setOccupation(initialOccupation);
    setMaritalStatus(initialMaritalStatus);
    setEducationalStatus(initialEducationalStatus);
    setEmergencyContactName(initialEmergencyContactName);
    setEmergencyContactPhone(initialEmergencyContactPhone);
    setBloodGroup(initialBloodGroup);
    setNationalId(initialNationalId);
    setFaydaId(initialFaydaId);
    setPassword("");
    setIsEditing(false);
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center py-12 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />

      {/* Floating Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8 z-10">
        <button
          onClick={() => router.push(`/patients/${patientId}/clinical-records`)}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>{t.profile.backToRecords || "Back to Clinical Records"}</span>
        </button>
        <LanguageToggle />
      </div>

      {/* Card container */}
      <div className="w-full max-w-4xl bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 md:p-10 shadow-2xl relative z-10 overflow-hidden">
        {/* Glow effect on top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        <div className="flex flex-col gap-8">
          {/* Header section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">MyHealthID Security Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">
              {t.profile.title || "Citizen Profile Self-Management"}
            </h1>
            <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
              {t.profile.subtitle || "Update your contact and identification details securely."}
            </p>
          </div>

          {/* Quick Info bar */}
          <div className="bg-neutral-800/40 border border-neutral-800/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">MyHealthID</span>
              <span className="font-mono text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-lg font-bold">
                {healthId}
              </span>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
              >
                <Edit2 className="w-4 h-4" />
                <span>{t.profile.editButton || "Edit Profile"}</span>
              </button>
            )}
          </div>

          {/* Toast style notifications */}
          {success && (
            <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 rounded-2xl p-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-rose-950/40 border border-rose-500/20 text-rose-300 rounded-2xl p-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-6">
              
              {/* SECTION: Personal Information */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 mb-4 border-b border-neutral-800 pb-2">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm font-medium disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        disabled={!isEditing}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <Phone className="w-5 h-5" />
                      </div>
                      <input
                        type="tel"
                        disabled={!isEditing}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm font-mono disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <input
                        type="date"
                        disabled={!isEditing}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        required
                        min="1900-01-01"
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm font-mono disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Age
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="number"
                        disabled={!isEditing}
                        value={age}
                        onChange={(e) => setAge(Number(e.target.value))}
                        required
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Sex */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Gender / Sex
                    </label>
                    <div className="relative">
                      <select
                        disabled={!isEditing}
                        value={sex}
                        onChange={(e) => setSex(e.target.value)}
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3.5 px-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: Identification */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 mb-4 border-b border-neutral-800 pb-2">
                  Identification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* National ID */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      National ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        {isNationalIdLocked ? <Lock className="w-5 h-5 text-neutral-600" /> : <Shield className="w-5 h-5" />}
                      </div>
                      <input
                        type="text"
                        disabled={!isEditing || isNationalIdLocked}
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="e.g. 631508354891"
                        className={`w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed ${isNationalIdLocked ? 'bg-neutral-950/80 text-neutral-600 border-neutral-900' : ''}`}
                      />
                    </div>
                    {isNationalIdLocked && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">Verified Profile Marker</span>
                        <span className="text-[10px] text-neutral-500 ml-1">· Contact administration to change</span>
                      </div>
                    )}
                  </div>

                  {/* Fayda ID / FIN */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Fayda ID / FIN
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        {isFaydaIdLocked ? <Lock className="w-5 h-5 text-neutral-600" /> : <Shield className="w-5 h-5" />}
                      </div>
                      <input
                        type="text"
                        disabled={!isEditing || isFaydaIdLocked}
                        value={faydaId}
                        onChange={(e) => setFaydaId(e.target.value)}
                        placeholder="Fayda ID"
                        className={`w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed ${isFaydaIdLocked ? 'bg-neutral-950/80 text-neutral-600 border-neutral-900' : ''}`}
                      />
                    </div>
                    {isFaydaIdLocked && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">Verified Profile Marker</span>
                        <span className="text-[10px] text-neutral-500 ml-1">· Contact administration to change</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: Socio-Demographics */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 mb-4 border-b border-neutral-800 pb-2">
                  Socio-Demographics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Blood Group */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Blood Group
                    </label>
                    <div className="relative">
                      <select
                        disabled={!isEditing || isBloodGroupLocked}
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className={`w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 px-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed ${isBloodGroupLocked ? 'bg-neutral-950/80 text-neutral-600 border-neutral-900' : ''}`}
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>
                    {isBloodGroupLocked && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">Verified Profile Marker</span>
                        <span className="text-[10px] text-neutral-500 ml-1">· Contact administration to change</span>
                      </div>
                    )}
                  </div>

                  {/* Marital Status */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Marital Status
                    </label>
                    <div className="relative">
                      <select
                        disabled={!isEditing}
                        value={maritalStatus}
                        onChange={(e) => setMaritalStatus(e.target.value)}
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 px-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      >
                        <option value="">Select Marital Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Religion */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Religion
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <Users className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={religion}
                        onChange={(e) => setReligion(e.target.value)}
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Occupation */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Occupation
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Educational Status */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Educational Status
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={educationalStatus}
                        onChange={(e) => setEducationalStatus(e.target.value)}
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: Emergency Contact */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 mb-4 border-b border-neutral-800 pb-2">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Emergency Contact Name */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Contact Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact Phone */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Contact Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <Phone className="w-5 h-5" />
                      </div>
                      <input
                        type="tel"
                        disabled={!isEditing}
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm font-mono disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: Security Settings (Change Password) */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 mb-4 border-b border-neutral-800 pb-2">
                  Security Settings
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                      Set New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        disabled={!isEditing}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isEditing ? "Leave blank to keep current password" : "••••••••"}
                        className="w-full bg-neutral-900/60 border border-neutral-800 disabled:border-neutral-800/40 disabled:text-neutral-500 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Action buttons */}
            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-800/60">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 select-none"
                >
                  <Save className="w-5 h-5" />
                  <span>{loading ? "Saving..." : (t.profile.saveButton || "Save Changes")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 text-neutral-300 font-bold py-3.5 px-6 rounded-2xl transition-all duration-200 border border-neutral-700/50 select-none"
                >
                  <X className="w-5 h-5" />
                  <span>{t.profile.cancelButton || "Cancel"}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
