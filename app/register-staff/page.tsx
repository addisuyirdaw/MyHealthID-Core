"use client";

import React, { useState, useEffect, Suspense } from "react";
import { registerHealthcareProfessional } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, CheckCircle2, Copy, Check, ArrowRight, ShieldCheck, Mail, Building, Key, Award, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { HEALTHCARE_ROLE_KEYS, getHealthcareRoleTranslation } from "@/lib/locales/enums";

function RegisterStaffForm() {
  const router = useRouter();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Success state payload
  const [onboardedName, setOnboardedName] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [hospitalIdCode, setHospitalIdCode] = useState("");

  // Form Fields State
  const [organizationId, setOrganizationId] = useState("");
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [role, setRole] = useState<string>("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    const orgId = searchParams.get("orgId");
    if (orgId) {
      setOrganizationId(orgId);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !fullName || !licenseNumber || !role || !pin) {
      alert("Please fill in all the required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerHealthcareProfessional({
        fullName,
        licenseNumber,
        role: role as any,
        pin,
        organizationId,
      });

      if (res.success && res.user) {
        setOnboardedName(res.user.fullName);
        setGeneratedEmail(res.user.email);
        setHospitalIdCode(res.user.organizationId || organizationId);
        setSuccess(true);
      } else {
        alert(res.error || "Failed to self-register.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        <Card className="w-full max-w-xl bg-slate-900/80 backdrop-blur-xl border-slate-800 shadow-2xl text-slate-100 p-8 rounded-3xl relative z-10">
          {/* Success Header */}
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-500/10 p-5 rounded-full ring-8 ring-emerald-500/5">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 text-center">
            Staff Registration Successful
          </h1>
          <p className="text-slate-400 font-medium mb-8 text-center">
            Welcome <span className="font-semibold text-white">{onboardedName}</span>! Your professional account is now registered under Facility ID: <span className="font-mono text-emerald-400 font-bold">{hospitalIdCode}</span>.
          </p>

          {/* Generated Login Email */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              📧 Your Generated Username / Login Email
            </h3>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-3.5 rounded-xl font-mono text-sm text-slate-200 break-all select-all">
              <span className="flex-1 font-bold">{generatedEmail}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="text-slate-400 hover:text-white hover:bg-slate-800 h-9 px-3 shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              * Note: Your username is automatically derived from your license number. Use it + your PIN + Facility ID to sign in.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Link href={`/login?orgId=${encodeURIComponent(hospitalIdCode)}`} className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-12 text-md font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                <ShieldCheck className="w-5 h-5" /> Proceed to Login Portal <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-center text-[10px] text-slate-500">The Organization ID and Username are pre-filled on the login page.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center py-12 px-6 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-xl bg-slate-900/60 backdrop-blur-xl border-slate-800 shadow-2xl rounded-3xl relative z-10">
        <CardHeader className="space-y-3 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
              <UserPlus className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-white">
                Staff Self-Registration
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">
                Register as a professional under your hospital facility
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Hospital ID Token */}
            <div className="space-y-1.5">
              <Label htmlFor="organizationId" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Hospital / Organization ID Code
              </Label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <Input
                  id="organizationId"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  placeholder="e.g. MH-AMH-BAS-DEBRE-A3F7"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-11 pl-11 focus:ring-2 focus:ring-blue-500/40 font-mono text-sm"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-500">
                * Enter the unique Organization Token provided by your facility administrator.
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Professional Full Name
              </Label>
              <div className="relative">
                <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Dawit Tadesse"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-11 pl-11 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>
            </div>

            {/* License Number */}
            <div className="space-y-1.5">
              <Label htmlFor="licenseNumber" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ministry of Health License Number
              </Label>
              <div className="relative">
                <Award className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MD-2026-ETH"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-11 pl-11 focus:ring-2 focus:ring-blue-500/40 font-mono text-sm uppercase"
                  required
                />
              </div>
            </div>

            {/* Role select */}
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                System Access Role
              </Label>
              <Select onValueChange={(val: any) => setRole(val)} value={role || undefined} required>
                <SelectTrigger id="role" className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-11">
                  <SelectValue placeholder={language === "am" ? "የስራ ሚናዎን ይምረጡ..." : "Select your System Role..."} />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                  {HEALTHCARE_ROLE_KEYS.map((roleKey) => (
                    <SelectItem
                      key={roleKey}
                      value={roleKey}
                      className="focus:bg-slate-800 focus:text-white cursor-pointer"
                    >
                      {getHealthcareRoleTranslation(roleKey, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PIN / Password */}
            <div className="space-y-1.5">
              <Label htmlFor="pin" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Security PIN / Password
              </Label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Create your login PIN/Password"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-11 pl-11 pr-10 focus:ring-2 focus:ring-blue-500/40 font-mono"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white h-8 px-2"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 text-md font-bold shadow-lg shadow-blue-500/20 mt-6"
            >
              {loading ? "Registering Account..." : "Self-Register Hospital Staff"}
            </Button>
          </form>

          {/* Footer link to sign in */}
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-center gap-1">
            <p className="text-[11px] text-slate-500">
              Already registered?{" "}
              <Link href="/login" className="text-blue-400 hover:underline font-semibold">
                Sign in to your account
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterStaffPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RegisterStaffForm />
    </Suspense>
  );
}
