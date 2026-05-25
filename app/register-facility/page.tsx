"use client";

import React, { useState } from "react";
import { registerOrganization } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hospital, CheckCircle2, Copy, Check, ArrowRight, Users, LogIn, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterFacilityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [copied, setCopied] = useState(false);

  // Form Fields State
  const [officialName, setOfficialName] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [kilil, setKilil] = useState("");
  const [zone, setZone] = useState("");
  const [woreda, setWoreda] = useState("");
  const [kebele, setKebele] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialName || !facilityType || !kilil || !zone || !woreda || !kebele) {
      alert("Please fill in all the required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerOrganization({
        officialName,
        facilityType,
        kilil,
        zone,
        woreda,
        kebele,
      });

      if (res.success && res.organizationId) {
        setToken(res.organizationId);
        setFacilityName(res.name || officialName);
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

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
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
            <span className="font-semibold text-white">{facilityName}</span> is now registered on the MyHealthID National Network.
          </p>

          {/* Org ID Token */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-5 mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              🏥 Facility Initialization Token (Organization ID)
            </h3>
            <div className="flex items-center gap-2 bg-slate-800 border border-emerald-500/30 p-3.5 rounded-xl font-mono text-sm text-emerald-400 font-bold break-all">
              <span className="flex-1 select-all">{token}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="text-slate-400 hover:text-white hover:bg-slate-700 h-9 px-3 shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-amber-400/80 mt-2 font-medium">
              ⚠️ Save this token securely. Staff will need it to log in to your facility.
            </p>
          </div>

          {/* Step-by-step next actions */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-5 mb-7 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">What to do next</h3>

            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-xs font-black text-blue-400">1</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Log in as Facility Administrator</p>
                <p className="text-xs text-slate-400 mt-0.5">Use your Organization ID above + your email + password on the login page.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-xs font-black text-blue-400">2</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Onboard Your Staff</p>
                <p className="text-xs text-slate-400 mt-0.5">Onboard them via the <span className="text-blue-400 font-semibold">Admin Dashboard</span> OR direct staff to self-register using the link below.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <span className="text-xs font-black text-emerald-400">3</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Staff Can Now Login</p>
                <p className="text-xs text-slate-400 mt-0.5">Once registered, each staff member logs in with their license email + PIN + this Organization ID.</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Link href={`/login?orgId=${encodeURIComponent(token)}`} className="w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 h-12 text-md font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                <ShieldCheck className="w-5 h-5" /> Go to Staff Login Portal <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/register-staff?orgId=${encodeURIComponent(token)}`} className="w-full">
              <Button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl px-8 h-11 text-sm font-semibold flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600">
                <Users className="w-4 h-4 text-blue-400" /> Share Self-Registration Link for Staff <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <p className="text-center text-xs text-slate-500">The Organization ID is pre-filled automatically on these pages.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center py-12 px-6 relative overflow-hidden">
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
                <Select onValueChange={setFacilityType} required>
                  <SelectTrigger id="facilityType" className="bg-slate-950/80 border-slate-800 text-white rounded-xl h-12">
                    <SelectValue placeholder="Select Facility Type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                    <SelectItem value="Referral Hospital" className="focus:bg-slate-800 focus:text-white cursor-pointer">Referral Hospital</SelectItem>
                    <SelectItem value="Regional Clinic" className="focus:bg-slate-800 focus:text-white cursor-pointer">Regional Clinic</SelectItem>
                    <SelectItem value="Private Lab" className="focus:bg-slate-800 focus:text-white cursor-pointer">Private Lab</SelectItem>
                    <SelectItem value="Pharmacy" className="focus:bg-slate-800 focus:text-white cursor-pointer">Pharmacy</SelectItem>
                  </SelectContent>
                </Select>
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
