"use client";

import React, { useState } from "react";
import { registerOrganization, loginUser } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hospital, CheckCircle2, Copy, Check, ArrowRight, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { FACILITY_SERVICE_TYPE_KEYS, getFacilityServiceTypeTranslation } from "@/lib/locales/enums";
import { EscapeHatch } from "@/components/navigation/EscapeHatch";

export default function RegisterFacilityPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [copied, setCopied] = useState(false);
  const [adminLicenseNumber, setAdminLicenseNumber] = useState("");
  const [adminActivationCode, setAdminActivationCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Form Fields State
  const [officialName, setOfficialName] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [kilil, setKilil] = useState("");
  const [zone, setZone] = useState("");
  const [woreda, setWoreda] = useState("");
  const [kebele, setKebele] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialName || !facilityType || !licenseNumber || !kilil || !zone || !woreda || !kebele) {
      alert("Please fill in all the required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerOrganization({
        officialName,
        facilityType,
        licenseNumber,
        kilil,
        zone,
        woreda,
        kebele,
      });

      if (res.success && res.organizationId) {
        setToken(res.organizationId);
        setFacilityName(res.name || officialName);
        setAdminLicenseNumber(res.adminLicenseNumber || "");
        setAdminActivationCode(res.adminActivationCode || "");
        setSuccess(true);
      } else {
        alert(res.error || "Failed to register facility.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyActivationCode = () => {
    navigator.clipboard.writeText(adminActivationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // True when any registration field has been touched — triggers confirm() before exit
  const isDirty = !!(officialName || facilityType || licenseNumber || kilil || zone || woreda || kebele);

  const handleActivateAdmin = async () => {
    if (activating) return;
    setActivating(true);
    setActivationError(null);

    try {
      const result = await loginUser({
        username: adminLicenseNumber,
        password: adminActivationCode,
        hospitalIdCode: token,
      });

      if (result?.error) {
        const errLower = result.error.toLowerCase();
        if (errLower.includes("invalid initial activation code")) {
          setActivationError("This activation code has expired or is invalid. Please restart facility activation.");
        } else if (errLower.includes("account not found")) {
          setActivationError("This administrator account could not be found.");
        } else if (errLower.includes("already activated") || !adminActivationCode) {
          setActivationError("This administrator account has already been activated. Continue to login.");
        } else {
          setActivationError(result.error);
        }
        setActivating(false);
      }
      // If success, loginUser redirects automatically
    } catch (err: any) {
      setActivationError("We couldn't reach MyHealthID. Check your connection and try again.");
      setActivating(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Escape hatch — post-success: no dirty guard needed */}
        <EscapeHatch href="/login" label="Return to Login Hub" />
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <Card className="w-full max-w-2xl bg-slate-800/80 backdrop-blur-xl border-slate-700 shadow-2xl text-slate-100 p-8 rounded-3xl relative z-10">
          {/* Success Header */}
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-500/10 p-5 rounded-full ring-8 ring-emerald-500/5">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 text-center">
            Facility Onboarding Successful
          </h1>
          <p className="text-slate-400 font-medium mb-8 text-center">
            Your facility is ready. Activate your administrator account to continue.
          </p>

          {/* Activation Error */}
          {activationError && (
            <div className="bg-rose-500/10 border border-rose-500/50 text-rose-200 p-4 rounded-xl mb-6 text-sm text-center">
              <p className="font-semibold text-rose-400 mb-1">Activation Failed</p>
              {activationError}
            </div>
          )}

          <Button
            type="button"
            disabled={activating}
            onClick={handleActivateAdmin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-14 text-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mb-6 transition-all"
          >
            {activating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Activating Admin Account...
              </>
            ) : (
              <>
                Activate Admin Account <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>

          <div className="border border-slate-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 text-sm font-semibold text-slate-300 transition-colors"
            >
              Facility Details
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showDetails && (
              <div className="p-4 bg-slate-900/50 border-t border-slate-700 space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your Facility ID is used internally to identify this facility within MyHealthID. You can access it later from your dashboard.
                </p>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-3 rounded-lg font-mono text-xs text-slate-300">
                  <span className="flex-1 select-all">{token}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="text-slate-400 hover:text-white h-7 px-2 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center py-12 px-6 relative overflow-hidden">
      {/* Escape hatch — guarded when any field is populated */}
      <EscapeHatch href="/login" label="Return to Login Hub" isDirty={isDirty} />
      {/* Dynamic Ambient Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border-slate-800 shadow-2xl rounded-3xl relative z-10">
        <CardHeader className="space-y-3 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
              <Hospital className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-white">
                Register New Facility
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">
                Onboard your clinic or hospital to the MyHealthID network
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Facility Name */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="officialName" className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Official Hospital Name
                </Label>
                <Input
                  id="officialName"
                  value={officialName}
                  onChange={(e) => setOfficialName(e.target.value)}
                  placeholder="e.g. Debre Berhan Referral Hospital"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-12 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>

              {/* Facility Type */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="facilityType" className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Facility Type
                </Label>
                <Select onValueChange={setFacilityType} value={facilityType || undefined} required>
                  <SelectTrigger id="facilityType" className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-12">
                    <SelectValue placeholder={language === "AM" ? "የእንክብካቤ አይነት ይምረጡ..." : "Select Facility Type..."} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                    {FACILITY_SERVICE_TYPE_KEYS.map((key) => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="focus:bg-slate-800 focus:text-white cursor-pointer"
                      >
                        {getFacilityServiceTypeTranslation(key, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* MOH License Number */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="licenseNumber" className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Ministry of Health (MOH) License Number
                </Label>
                <Input
                  id="licenseNumber"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MOH-ETH-2024-99999"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-12 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>

              {/* Region / Kilil */}
              <div className="space-y-2">
                <Label htmlFor="kilil" className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Region (Kilil)
                </Label>
                <Input
                  id="kilil"
                  value={kilil}
                  onChange={(e) => setKilil(e.target.value)}
                  placeholder="e.g. Amhara"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-12 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>

              {/* Zone */}
              <div className="space-y-2">
                <Label htmlFor="zone" className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Zone
                </Label>
                <Input
                  id="zone"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  placeholder="e.g. Semien Shewa"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-12 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>

              {/* Woreda */}
              <div className="space-y-2">
                <Label htmlFor="woreda" className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Woreda
                </Label>
                <Input
                  id="woreda"
                  value={woreda}
                  onChange={(e) => setWoreda(e.target.value)}
                  placeholder="e.g. Basona Worena"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-12 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>

              {/* Kebele */}
              <div className="space-y-2">
                <Label htmlFor="kebele" className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Kebele
                </Label>
                <Input
                  id="kebele"
                  value={kebele}
                  onChange={(e) => setKebele(e.target.value)}
                  placeholder="e.g. 04"
                  className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-12 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 text-md font-bold shadow-lg shadow-blue-500/20 mt-6"
            >
              {loading ? "Registering Facility..." : "Register Facility"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
