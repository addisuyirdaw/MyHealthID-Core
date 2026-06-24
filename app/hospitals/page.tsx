"use client";

import { useEffect, useState } from "react";
import { getHospitals, requestIntake, getExistingIntakeRequests, getCitizenProfile } from "@/lib/actions/hospital.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hospital, Search, Filter, ClipboardPlus, Clock, MapPin, CheckCircle, ShieldAlert, ArrowLeft, X, Loader2 } from "lucide-react";
import Link from "next/link";

interface HospitalData {
  id: string;
  name: string;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  kebele: string | null;
}

interface IntakeRequestData {
  id: string;
  nationalId: string;
  fullName: string;
  status: string;
  organizationId: string;
  createdAt: string;
  organization: {
    name: string;
  };
}

export default function HospitalsDirectoryPage() {
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<HospitalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters State
  const [kilil, setKilil] = useState("ALL");
  const [zone, setZone] = useState("ALL");
  const [woreda, setWoreda] = useState("ALL");

  const [uniqueKilils, setUniqueKilils] = useState<string[]>([]);
  const [uniqueZones, setUniqueZones] = useState<string[]>([]);
  const [uniqueWoredas, setUniqueWoredas] = useState<string[]>([]);

  // User Citizen Session State
  const [citizenId, setCitizenId] = useState<string | null>(null);
  const [citizenProfile, setCitizenProfile] = useState<{ fullName: string; faydaId: string | null; nationalId: string | null; phoneNumber?: string | null } | null>(null);

  // Intake Requests state
  const [myRequests, setMyRequests] = useState<IntakeRequestData[]>([]);
  const [lookupFaydaId, setLookupFaydaId] = useState("");
  const [isSearchingRequests, setIsSearchingRequests] = useState(false);

  // Modal State
  const [selectedHospital, setSelectedHospital] = useState<HospitalData | null>(null);
  const [intakeName, setIntakeName] = useState("");
  const [intakeFayda, setIntakeFayda] = useState("");
  const [intakePhone, setIntakePhone] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [intakeSuccess, setIntakeSuccess] = useState(false);
  const [intakeError, setIntakeError] = useState("");

  // Profile loading state
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // 1. Fetch initial hospitals
    fetchHospitals();

    // 2. Resolve citizen profile if logged in
    const getCookie = (name: string) => {
      if (typeof document === "undefined") return null;
      const match = document.cookie.split("; ").find((r) => r.startsWith(`${name}=`));
      return match ? match.split("=")[1] : null;
    };
    
    const cid = getCookie("citizenPatientId");
    if (cid) {
      setCitizenId(cid);
      setProfileLoading(true);
      getCitizenProfile(cid).then((res) => {
        if (res.success && res.citizen) {
          setCitizenProfile(res.citizen);
          setIntakeName(res.citizen.fullName);
          const fId = res.citizen.faydaId || res.citizen.nationalId || "";
          setIntakeFayda(fId);
          setIntakePhone(res.citizen.phoneNumber || "");
          setLookupFaydaId(fId);
          // Auto-fetch existing requests for logged in citizen
          if (fId) {
            fetchExistingRequests(fId);
          }
        }
      }).finally(() => {
        setProfileLoading(false);
      });
    }
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    const res = await getHospitals();
    if (res.success && res.hospitals) {
      setHospitals(res.hospitals);
      setFilteredHospitals(res.hospitals);
      
      // Calculate dynamic filter options
      const kilils = Array.from(new Set(res.hospitals.map((h: HospitalData) => h.region).filter(Boolean))) as string[];
      const zones = Array.from(new Set(res.hospitals.map((h: HospitalData) => h.zone).filter(Boolean))) as string[];
      const woredas = Array.from(new Set(res.hospitals.map((h: HospitalData) => h.woreda).filter(Boolean))) as string[];

      setUniqueKilils(kilils);
      setUniqueZones(zones);
      setUniqueWoredas(woredas);
    }
    setLoading(false);
  };

  const fetchExistingRequests = async (fId: string) => {
    setIsSearchingRequests(true);
    const requests = await getExistingIntakeRequests(fId);
    setMyRequests(requests);
    setIsSearchingRequests(false);
  };

  // Perform client-side filter combinations
  useEffect(() => {
    let result = hospitals;

    // Region / Kilil filter
    if (kilil !== "ALL") {
      result = result.filter((h) => h.region === kilil);
    }

    // Zone filter
    if (zone !== "ALL") {
      result = result.filter((h) => h.zone === zone);
    }

    // Woreda filter
    if (woreda !== "ALL") {
      result = result.filter((h) => h.woreda === woreda);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.region && h.region.toLowerCase().includes(q)) ||
          (h.zone && h.zone.toLowerCase().includes(q)) ||
          (h.woreda && h.woreda.toLowerCase().includes(q))
      );
    }

    setFilteredHospitals(result);
  }, [kilil, zone, woreda, searchQuery, hospitals]);

  const handleRequestIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeError("");
    setIntakeSuccess(false);

    if (!selectedHospital) return;

    // Suppress name and Fayda ID requirement check ONLY if the citizenProfile is loaded AND contains those fields.
    const isProfileLoadedWithDetails = !!citizenProfile && (citizenProfile.fullName && (citizenProfile.faydaId || citizenProfile.nationalId));
    
    if (!isProfileLoadedWithDetails && (!intakeName || !intakeFayda)) {
      setIntakeError("Name and Fayda ID are required.");
      return;
    }

    const cleanFayda = (citizenProfile && (citizenProfile.faydaId || citizenProfile.nationalId))
      ? (citizenProfile.faydaId || citizenProfile.nationalId || "").replace(/\s/g, "")
      : intakeFayda.replace(/\s/g, "");

    if (cleanFayda.length !== 12 && cleanFayda.length !== 16) {
      setIntakeError("Fayda National ID must be exactly 12 or 16 digits.");
      return;
    }

    const finalName = (citizenProfile && citizenProfile.fullName) ? citizenProfile.fullName : intakeName;
    const finalPhone = (citizenProfile && citizenProfile.phoneNumber) ? citizenProfile.phoneNumber : intakePhone;

    setSubmittingIntake(true);
    const res = await requestIntake({
      nationalId: cleanFayda,
      fullName: finalName,
      phoneNumber: finalPhone,
      organizationId: selectedHospital.id,
      notes: intakeNotes,
    });

    if (res.success) {
      setIntakeSuccess(true);
      fetchExistingRequests(cleanFayda);
      // Reset intake fields if anonymous
      if (!citizenId) {
        setIntakeName("");
        setIntakeFayda("");
      }
      setIntakePhone("");
      setIntakeNotes("");
      setTimeout(() => {
        setSelectedHospital(null);
        setIntakeSuccess(false);
      }, 2000);
    } else {
      setIntakeError(res.error || "Failed to submit request.");
    }
    setSubmittingIntake(false);
  };

  const handleLookupRequests = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupFaydaId.trim()) return;
    fetchExistingRequests(lookupFaydaId);
  };

  const clearFilters = () => {
    setKilil("ALL");
    setZone("ALL");
    setWoreda("ALL");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        {/* Header section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1.5">
              <MapPin className="w-4 h-4 text-emerald-500" /> MyHealthID National Network
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <Hospital className="h-10 w-10 text-emerald-500 shrink-0" />
              Public Healthcare Discovery
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Browse and discover registered clinical facilities, community health clinics, and tertiary referral hospitals near you. Submit an open intake request securely using your Fayda National ID.
            </p>
          </div>

          <Link href="/">
            <Button variant="outline" className="border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl h-11 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Go to Portal Home
            </Button>
          </Link>
        </header>

        {/* Filter controls panel */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 font-bold text-md text-white">
            <Filter className="w-4.5 h-4.5 text-blue-400" /> Filter & Search Directory
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Kilil Dropdown */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Region (Kilil)</Label>
              <Select value={kilil} onValueChange={setKilil}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                  <SelectItem value="ALL" className="cursor-pointer">All Regions</SelectItem>
                  {uniqueKilils.map((k) => (
                    <SelectItem key={k} value={k} className="cursor-pointer">{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Zone Dropdown */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zone</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                  <SelectItem value="ALL" className="cursor-pointer">All Zones</SelectItem>
                  {uniqueZones.map((z) => (
                    <SelectItem key={z} value={z} className="cursor-pointer">{z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Woreda Dropdown */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Woreda</Label>
              <Select value={woreda} onValueChange={setWoreda}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white rounded-xl h-11">
                  <SelectValue placeholder="All Woredas" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white rounded-xl">
                  <SelectItem value="ALL" className="cursor-pointer">All Woredas</SelectItem>
                  {uniqueWoredas.map((w) => (
                    <SelectItem key={w} value={w} className="cursor-pointer">{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search query input */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Facility Name</Label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 pl-10 focus:ring-blue-500/40"
                />
              </div>
            </div>
          </div>

          {(kilil !== "ALL" || zone !== "ALL" || woreda !== "ALL" || searchQuery.trim()) && (
            <div className="flex justify-end pt-2">
              <Button onClick={clearFilters} variant="ghost" className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 rounded-lg">
                ✕ Clear All Filters
              </Button>
            </div>
          )}
        </section>

        {/* Directory Grid */}
        <main className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🏥 Available Healthcare Providers
              <span className="text-xs font-normal text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                {filteredHospitals.length} Found
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              Loading medical directory...
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl text-slate-500 max-w-lg mx-auto">
              <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="font-bold text-md text-slate-300">No Facilities Match Your Criteria</h3>
              <p className="text-xs text-slate-500 mt-1">If a clinic or hospital isn't registered in the MyHealthID network, it will not appear as available.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredHospitals.map((hospital) => (
                <Card key={hospital.id} className="bg-slate-900/40 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/70 transition-all duration-300 rounded-2xl flex flex-col justify-between shadow-lg group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 pointer-events-none transition-colors" />

                  <CardHeader className="pb-3 border-b border-slate-800/60">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                      <Hospital className="w-5.5 h-5.5" />
                    </div>
                    <CardTitle className="text-lg text-white font-bold tracking-tight mb-1 group-hover:text-emerald-400 transition-colors">
                      {hospital.name.split(" - ")[0]}
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      {hospital.name.includes("(") ? hospital.name.split("(")[1].split(")")[0] : "General Hospital"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 pb-6 space-y-4">
                    <div className="space-y-2 text-sm text-slate-300 bg-slate-950/40 p-3.5 border border-slate-900 rounded-xl">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{hospital.region || "Amhara"}, Ethiopia</span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-col gap-0.5 pl-5 border-l border-slate-800 mt-1">
                        <span>Zone: {hospital.zone || "N/A"}</span>
                        <span>Woreda: {hospital.woreda || "N/A"}</span>
                        <span>Kebele: {hospital.kebele || "N/A"}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <Button
                      onClick={() => {
                        setSelectedHospital(hospital);
                        setIntakeError("");
                        setIntakeSuccess(false);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50"
                    >
                      <ClipboardPlus className="w-4 h-4" /> Request Intake / Register
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Existing requests lookup panel (Fayda ID lookup) */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl max-w-3xl mx-auto">
          <div className="space-y-2 text-center max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" /> Check Your Registration Status
            </h2>
            <p className="text-xs text-slate-400">
              Enter your 12-digit FIN or 16-digit FCN Fayda National ID to check pending intake allocations.
            </p>
          </div>

          <form onSubmit={handleLookupRequests} className="flex gap-2.5 max-w-md mx-auto">
            <Input
              value={lookupFaydaId}
              onChange={(e) => setLookupFaydaId(e.target.value)}
              placeholder="e.g. 1234 5678 9012"
              className="bg-slate-950 border-slate-800 text-white font-mono text-center rounded-xl h-12 pl-4 focus:ring-blue-500/40"
              required
            />
            <Button type="submit" disabled={isSearchingRequests} className="bg-blue-600 hover:bg-blue-500 h-12 px-6 rounded-xl font-bold whitespace-nowrap shadow-md">
              {isSearchingRequests ? "Looking up..." : "Lookup Requests"}
            </Button>
          </form>

          {myRequests.length > 0 && (
            <div className="pt-4 divide-y divide-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Active Allocation Requests</h3>
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <div key={req.id} className="bg-slate-950/60 p-4 border border-slate-800/80 rounded-2xl flex flex-wrap justify-between items-center gap-4">
                    <div className="space-y-1">
                      <p className="font-bold text-white text-sm">{req.organization.name.split(" - ")[0]}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <span>Patient: {req.fullName}</span>
                        <span>•</span>
                        <span>Fayda ID: {req.nationalId}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full font-medium">
                        Submitted: {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" /> PENDING INTAKE
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Intake Dialog Modal */}
      {selectedHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400">
                  <ClipboardPlus className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Intake Request Registration</h3>
                  <p className="text-xs text-slate-400 font-medium truncate max-w-[280px]" title={selectedHospital.name}>
                    Allocating to: {selectedHospital.name.split(" - ")[0]}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => setSelectedHospital(null)}
                className="text-slate-500 hover:text-white rounded-full h-9 w-9 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRequestIntakeSubmit}>
              <div className="p-6 space-y-4">
                {intakeSuccess ? (
                  <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white">Request Submitted!</h4>
                    <p className="text-slate-400 text-xs px-6">
                      Your open intake request is successfully saved under your Fayda ID. Facility triage coordinators can now access your records.
                    </p>
                  </div>
                ) : (
                  <>
                    {intakeError && (
                      <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{intakeError}</span>
                      </div>
                    )}

                    {citizenId && (
                      <div className="p-3 bg-blue-500/5 border border-blue-500/10 text-blue-400 text-[11px] rounded-xl font-medium">
                        ℹ️ Logged In: Pre-populated directly from your MyHealthID Citizen registry.
                      </div>
                    )}

                    {profileLoading ? (
                      <div className="space-y-4 py-4 flex flex-col items-center justify-center border border-slate-800 rounded-2xl bg-slate-950/40">
                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                        <p className="text-xs text-slate-400">Loading citizen profile...</p>
                      </div>
                    ) : (
                      <>
                        {/* Citizen Name */}
                        <div className="space-y-1.5">
                          <Label htmlFor="intakeName" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Citizen Full Name
                          </Label>
                          <Input
                            id="intakeName"
                            value={intakeName}
                            onChange={(e) => setIntakeName(e.target.value)}
                            placeholder="e.g. Dawit Tadesse"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 pl-4 read-only:opacity-80"
                            required
                            readOnly={!!citizenProfile && !!citizenProfile.fullName}
                          />
                        </div>

                        {/* Fayda National ID */}
                        <div className="space-y-1.5">
                          <Label htmlFor="intakeFayda" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Fayda National ID (FIN / FCN)
                          </Label>
                          <Input
                            id="intakeFayda"
                            value={intakeFayda}
                            onChange={(e) => setIntakeFayda(e.target.value)}
                            placeholder="12-digit FIN or 16-digit FCN"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 pl-4 font-mono read-only:opacity-80"
                            required
                            readOnly={!!citizenProfile && !!(citizenProfile.faydaId || citizenProfile.nationalId)}
                          />
                        </div>

                        {/* Contact Phone (Optional) */}
                        <div className="space-y-1.5">
                          <Label htmlFor="intakePhone" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Contact Phone Number (Optional)
                          </Label>
                          <Input
                            id="intakePhone"
                            value={intakePhone}
                            onChange={(e) => setIntakePhone(e.target.value)}
                            placeholder="e.g. +251 912 345678"
                            className="bg-slate-950 border-slate-800 text-white rounded-xl h-11 pl-4 read-only:opacity-80"
                            readOnly={!!citizenProfile && !!citizenProfile.phoneNumber}
                          />
                        </div>
                      </>
                    )}

                    {/* Clinical Notes (Optional) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="intakeNotes" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Intake Reason / Chief Complaint (Optional)
                      </Label>
                      <textarea
                        id="intakeNotes"
                        value={intakeNotes}
                        onChange={(e) => setIntakeNotes(e.target.value)}
                        placeholder="Describe your current medical reason or symptoms for visit..."
                        className="bg-slate-950 border-slate-800 text-white rounded-xl w-full p-4 h-24 text-sm focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              {!intakeSuccess && (
                <div className="p-6 bg-slate-950/40 border-t border-slate-800 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedHospital(null)}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl h-11 px-5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingIntake}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 px-5 font-bold shadow-md"
                  >
                    {submittingIntake ? "Registering..." : "Submit Registration"}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
