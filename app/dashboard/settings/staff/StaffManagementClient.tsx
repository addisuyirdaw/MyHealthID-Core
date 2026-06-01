"use client";

import React, { useState } from "react";
import { onboardHealthcareProfessional } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, ShieldCheck, Key, UserPlus, X, Trash2, Calendar, User, Eye, EyeOff, Lock } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { HEALTHCARE_ROLE_KEYS, getHealthcareRoleTranslation } from "@/lib/locales/enums";

interface StaffMember {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  professionalLicenseNumber: string | null;
  createdAt: Date;
}

export default function StaffManagementClient({ initialStaff, isAdmin = false }: { initialStaff: StaffMember[]; isAdmin?: boolean }) {
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const { language } = useLanguage();

  // Early return if not admin (defense-in-depth)
  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl text-center max-w-md mx-auto my-12">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center ring-8 ring-rose-500/5">
            <Lock className="w-10 h-10 text-rose-400" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Access Restricted</h2>
        <p className="text-slate-400 text-sm mb-6">
          Admin privileges are required to manage staff accounts and credentials.
        </p>
      </div>
    );
  }

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [role, setRole] = useState<string>("");
  const [pin, setPin] = useState("");

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !licenseNumber || !role || !pin) {
      alert("Please fill in all details.");
      return;
    }

    setLoading(true);
    try {
      const res = await onboardHealthcareProfessional({
        fullName,
        licenseNumber,
        role: role as any,
        pin,
      });

      if (res.success && res.user) {
        // Optimistically add to list
        const newStaff: StaffMember = {
          id: res.user.id,
          email: res.user.email,
          role: res.user.role,
          firstName: res.user.fullName.split(" ")[0],
          lastName: res.user.fullName.split(" ").slice(1).join(" "),
          professionalLicenseNumber: licenseNumber,
          createdAt: new Date(),
        };

        setStaffList([newStaff, ...staffList]);
        setIsModalOpen(false);

        // Reset Form
        setFullName("");
        setLicenseNumber("");
        setRole("");
        setPin("");
        alert(`Successfully onboarded ${fullName}!`);
      } else {
        alert(res.error || "Failed to onboard healthcare professional.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "HOSPITAL_CEO":
      case "IT_HIS_ADMIN":
        return "bg-purple-500/15 text-purple-300 border-purple-500/20";
      case "GENERAL_PRACTITIONER":
      case "MEDICAL_SPECIALIST":
      case "SUB_SPECIALIST":
      case "HEALTH_OFFICER":
        return "bg-blue-500/15 text-blue-300 border-blue-500/20";
      case "CLINICAL_NURSE":
      case "SPECIALIZED_NURSE":
      case "MIDWIFE":
        return "bg-teal-500/15 text-teal-300 border-teal-500/20";
      case "PHARMACIST":
        return "bg-amber-500/15 text-amber-300 border-amber-500/20";
      case "RECEPTIONIST":
      case "CARD_ROOM_CLERK":
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/20";
      case "LABORATORY_TECHNICIAN":
      case "LABORATORY_TECHNOLOGIST":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/20";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats + Onboard Trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-2xl text-blue-400 shadow-lg shadow-blue-900/10">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Healthcare Professionals</h3>
            <p className="text-sm text-slate-400 font-medium">
              Manage and provision user access roles under your facility umbrella.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 h-12 font-bold shadow-md shadow-blue-900/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Onboard Staff Professional
        </Button>
      </div>

      {/* Staff Directory Board */}
      <Card className="border-slate-800/80 bg-slate-900/40 backdrop-blur-md shadow-lg overflow-hidden rounded-2xl text-slate-100">
        <CardHeader className="bg-slate-900/60 border-b border-slate-800/60 pb-4">
          <CardTitle className="text-lg font-bold text-white">Active Roster</CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            List of certified clinical and operational personnel currently registered.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {staffList.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-md font-semibold text-slate-350">No professionals onboarded yet</p>
              <p className="text-sm text-slate-550 mt-1">Click the onboarding button above to add your first staff member.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {staffList.map((professional) => (
                <div
                  key={professional.id}
                  className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="bg-slate-950 border border-slate-800 text-slate-400 p-2.5 rounded-xl shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-md font-bold text-slate-200">
                        {professional.firstName} {professional.lastName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 border ${getRoleBadgeStyle(professional.role)}`}>
                          {professional.role}
                        </Badge>
                        <span className="text-xs text-slate-600 font-medium">•</span>
                        <span className="text-xs text-slate-400 font-mono font-medium">
                          License: {professional.professionalLicenseNumber || "N/A"}
                        </span>
                        <span className="text-xs text-slate-600 font-medium">•</span>
                        <span className="text-xs text-slate-400 font-medium">
                          Email: {professional.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 sm:self-center">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(professional.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl text-blue-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Onboard Professional</h3>
                  <p className="text-xs text-slate-400 font-medium">Provision network-wide facility credentials</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-full h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleOnboard}>
              <div className="p-6 space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Professional Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Dawit Tadesse"
                    className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 focus:border-blue-500 focus:ring-blue-500/20 placeholder:text-slate-650"
                    required
                  />
                </div>

                {/* License Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="licenseNumber" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ministry of Health License Number
                  </Label>
                  <Input
                    id="licenseNumber"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. MD-2026-ETH"
                    className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 focus:border-blue-500 focus:ring-blue-500/20 font-mono placeholder:text-slate-650"
                    required
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    System Role
                  </Label>
                  <Select onValueChange={(val: any) => setRole(val)} value={role || undefined} required>
                    <SelectTrigger id="role" className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 focus:ring-blue-500/20">
                      <SelectValue placeholder={language === "AM" ? "የስራ ሚናዎን ይምረጡ..." : "Select Professional Role..."} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                      {HEALTHCARE_ROLE_KEYS.map((roleKey) => (
                        <SelectItem key={roleKey} value={roleKey} className="cursor-pointer">
                          {getHealthcareRoleTranslation(roleKey, language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Temporary PIN */}
                <div className="space-y-1.5">
                  <Label htmlFor="pin" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Temporary Security Login PIN (Password)
                  </Label>
                  <div className="relative">
                    <Input
                      id="pin"
                      type={showPin ? "text" : "password"}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="e.g. 1234"
                      className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 focus:border-blue-500 focus:ring-blue-500/20 font-mono pr-10 placeholder:text-slate-650"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 h-8 px-2"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    * This PIN will be used for professional login context check. Ensure it is secure.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl h-11 px-5 border-slate-850 hover:bg-slate-900 text-slate-300 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-11 px-5 font-bold shadow-md shadow-blue-900/20"
                >
                  {loading ? "Onboarding..." : "Provision Professional"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
