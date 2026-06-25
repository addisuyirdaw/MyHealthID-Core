"use client";

/**
 * app/apply-for-facility/page.tsx
 *
 * Authenticated users submit a facility onboarding application here.
 * The form collects all data the admin needs for review, including the
 * flexible metadata fields (license URL, representative ID, physician lead).
 *
 * Auth: requires userId cookie — redirects to /signin if absent.
 * Isolation: does NOT touch /register-facility or registerOrganization.
 */

import React, { useState } from "react";
import Link from "next/link";
import { submitFacilityApplication } from "@/lib/actions/facility-application.actions";
import {
  Building2,
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  User,
  MapPin,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { FACILITY_SERVICE_TYPE_KEYS, getFacilityServiceTypeTranslation } from "@/lib/locales/enums";
import { useRouter } from "next/navigation";

// ─── Cookie helper (client-side) ─────────────────────────────────────────────
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Facility Info",      icon: Building2     },
  { id: 2, label: "Verification Docs",  icon: FileText      },
  { id: 3, label: "Location",           icon: MapPin        },
  { id: 4, label: "Review & Submit",    icon: ClipboardCheck },
];

const OWNERSHIP_TYPES = ["PUBLIC", "PRIVATE"];

export default function ApplyForFacilityPage() {
  const router = useRouter();

  // Auth check — done client-side on mount via cookie
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  React.useEffect(() => {
    const uid = getCookie("userId");
    setIsAuthed(!!uid);
    setAuthChecked(true);
    if (!uid) {
      router.replace("/signin?redirect=/apply-for-facility");
    }
  }, [router]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Facility Info
  const [officialName, setOfficialName] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [ownershipType, setOwnershipType] = useState("PUBLIC");
  const [contactEmail, setContactEmail] = useState("");

  // Step 2: Verification
  const [businessLicenseNumber, setBusinessLicenseNumber] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [representativeIdType, setRepresentativeIdType] = useState("Kebele ID");
  const [representativeIdUrl, setRepresentativeIdUrl] = useState("");
  const [physicianLeadName, setPhysicianLeadName] = useState("");

  // Step 3: Location
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [woreda, setWoreda] = useState("");
  const [kebele, setKebele] = useState("");
  const [notes, setNotes] = useState("");

  // ── Validation per step ─────────────────────────────────────────────────────
  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!officialName.trim())  return "Official facility name is required.";
      if (!facilityType)         return "Please select a facility type.";
      if (!contactEmail.trim() || !contactEmail.includes("@"))
        return "A valid contact email is required.";
    }
    if (s === 2) {
      if (!businessLicenseNumber.trim())
        return "Business license number is required.";
    }
    return null;
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(s + 1, 4));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const result = await submitFacilityApplication({
        businessLicenseNumber,
        contactEmail,
        officialName,
        facilityType,
        ownershipType,
        region,
        zone,
        woreda,
        kebele,
        metadata: {
          license_url: licenseUrl || undefined,
          representative_id_type: representativeIdType || undefined,
          representative_id_url: representativeIdUrl || undefined,
          physician_lead_name: physicianLeadName || undefined,
          notes: notes || undefined,
        },
      });
      if (result.success && result.applicationId) {
        setApplicationId(result.applicationId);
        setSuccess(true);
      } else {
        setError(result.error ?? "Submission failed. Please try again.");
      }
    } catch (e: any) {
      setError(e.message ?? "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  // ── Loading / unauthed guard ────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#06060a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }
  if (!isAuthed) return null; // redirect in progress

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-[#06060a] flex items-center justify-center p-6">
        <div className="relative w-full max-w-lg">
          {/* glow */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-emerald-500/20 via-transparent to-teal-500/10 blur-xl -z-10" />
          <div className="bg-neutral-900/80 border border-neutral-800/60 rounded-2xl p-8 backdrop-blur-md text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Application Submitted!</h1>
            <p className="text-neutral-400 text-sm mb-6">
              Your facility application for <span className="text-white font-semibold">{officialName}</span> has been
              received and is pending review by a System Administrator.
            </p>

            <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-neutral-500 mb-1 font-medium uppercase tracking-widest">Application Reference</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-emerald-400 font-mono text-sm truncate">{applicationId}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(applicationId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-neutral-700 transition text-neutral-400 hover:text-white"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-500 mb-6">
              You will receive an email notification at <span className="text-neutral-300">{contactEmail}</span> once a decision has been made.
            </p>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#06060a] text-neutral-100 flex flex-col">

      {/* ambient glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[45%] bg-emerald-600/5 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-teal-600/5 rounded-full blur-[160px]" />
      </div>

      {/* nav */}
      <header className="border-b border-neutral-800/60 bg-neutral-900/50 backdrop-blur-md px-6 h-14 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-sm">MyHealthID</span>
        </Link>
        <span className="text-xs text-neutral-500">Facility Onboarding Application</span>
      </header>

      <main className="flex-1 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-2xl">

          {/* heading */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full uppercase tracking-widest mb-4">
              <ShieldCheck className="w-3 h-3" />
              Gated Onboarding
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Apply for Facility Registration</h1>
            <p className="text-neutral-400 text-sm mt-2">
              Your application will be reviewed by a System Administrator before your facility is activated.
            </p>
          </div>

          {/* step indicator */}
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((s, i) => {
              const isActive = step === s.id;
              const isDone   = step > s.id;
              return (
                <React.Fragment key={s.id}>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                    isDone   ? "bg-neutral-800/50 text-neutral-300 border border-neutral-700/40" :
                               "text-neutral-600"
                  }`}>
                    {isDone
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      : <s.icon className="w-3.5 h-3.5" />
                    }
                    <span className="hidden sm:block">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px transition-colors ${isDone ? "bg-emerald-500/40" : "bg-neutral-800"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* card */}
          <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-6 backdrop-blur-md">

            {/* error banner */}
            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* ─── STEP 1: Facility Info ─── */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-1">Facility Information</h2>
                <p className="text-sm text-neutral-400 mb-5">Basic details about the healthcare facility you are registering.</p>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Official Facility Name *</label>
                  <input
                    id="official-name"
                    type="text"
                    value={officialName}
                    onChange={(e) => setOfficialName(e.target.value)}
                    placeholder="e.g. Addis Ababa General Hospital"
                    className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Facility Type *</label>
                    <select
                      id="facility-type"
                      value={facilityType}
                      onChange={(e) => setFacilityType(e.target.value)}
                      className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
                    >
                      <option value="" className="bg-neutral-900">Select type…</option>
                      {FACILITY_SERVICE_TYPE_KEYS.map((k) => (
                        <option key={k} value={k} className="bg-neutral-900">
                          {getFacilityServiceTypeTranslation(k, "en")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Ownership Type</label>
                    <select
                      id="ownership-type"
                      value={ownershipType}
                      onChange={(e) => setOwnershipType(e.target.value)}
                      className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
                    >
                      {OWNERSHIP_TYPES.map((o) => (
                        <option key={o} value={o} className="bg-neutral-900">{o}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Contact Email *</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="admin@yourhospital.gov.et"
                    className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                  />
                  <p className="text-xs text-neutral-500 mt-1.5">Approval/rejection notifications will be sent to this address.</p>
                </div>
              </div>
            )}

            {/* ─── STEP 2: Verification Docs ─── */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-1">Verification Documents</h2>
                <p className="text-sm text-neutral-400 mb-5">Provide verification details for the review process. Document links can be shared drive URLs.</p>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Business License Number *</label>
                  <input
                    id="license-number"
                    type="text"
                    value={businessLicenseNumber}
                    onChange={(e) => setBusinessLicenseNumber(e.target.value)}
                    placeholder="e.g. MOH-ETH-2024-00123"
                    className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Business License Document URL</label>
                  <input
                    id="license-url"
                    type="url"
                    value={licenseUrl}
                    onChange={(e) => setLicenseUrl(e.target.value)}
                    placeholder="https://drive.google.com/…"
                    className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Representative ID Type</label>
                    <select
                      id="rep-id-type"
                      value={representativeIdType}
                      onChange={(e) => setRepresentativeIdType(e.target.value)}
                      className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
                    >
                      {["Kebele ID", "Passport", "National ID (Fayda)", "Driver's License", "Other"].map((t) => (
                        <option key={t} value={t} className="bg-neutral-900">{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Representative ID Document URL</label>
                    <input
                      id="rep-id-url"
                      type="url"
                      value={representativeIdUrl}
                      onChange={(e) => setRepresentativeIdUrl(e.target.value)}
                      placeholder="https://drive.google.com/…"
                      className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
                    <User className="inline w-3 h-3 mr-1" />
                    Lead Physician / Director Name
                  </label>
                  <input
                    id="physician-lead"
                    type="text"
                    value={physicianLeadName}
                    onChange={(e) => setPhysicianLeadName(e.target.value)}
                    placeholder="Dr. Full Name"
                    className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                  />
                </div>
              </div>
            )}

            {/* ─── STEP 3: Location ─── */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-white mb-1">Location Details</h2>
                <p className="text-sm text-neutral-400 mb-5">Specify the administrative location of your facility.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Region (Kilil)</label>
                    <input id="region" type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Oromia" className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Zone</label>
                    <input id="zone" type="text" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g. West Hararghe" className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Woreda</label>
                    <input id="woreda" type="text" value={woreda} onChange={(e) => setWoreda(e.target.value)} placeholder="e.g. Chiro" className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Kebele</label>
                    <input id="kebele" type="text" value={kebele} onChange={(e) => setKebele(e.target.value)} placeholder="e.g. 03" className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">Additional Notes</label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional information you'd like the reviewer to know…"
                    className="w-full bg-neutral-800/60 border border-neutral-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition resize-none"
                  />
                </div>
              </div>
            )}

            {/* ─── STEP 4: Review & Submit ─── */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-1">Review & Submit</h2>
                <p className="text-sm text-neutral-400 mb-5">Please confirm the details below before submitting.</p>

                {[
                  { label: "Official Name",         value: officialName },
                  { label: "Facility Type",          value: facilityType.replace(/_/g, " ") },
                  { label: "Ownership",              value: ownershipType },
                  { label: "Contact Email",          value: contactEmail },
                  { label: "Business License",       value: businessLicenseNumber },
                  { label: "Lead Physician",         value: physicianLeadName || "—" },
                  { label: "Region",                 value: [region, zone, woreda, kebele].filter(Boolean).join(", ") || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-xs text-neutral-500 w-36 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-neutral-200 font-medium">{value}</span>
                  </div>
                ))}

                <div className="mt-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                  <strong>Note:</strong> Your application will enter a <strong>PENDING</strong> state. A System Administrator will review it and notify you at <strong>{contactEmail}</strong> once a decision is made. Existing facilities are not affected.
                </div>
              </div>
            )}

            {/* nav buttons */}
            <div className="flex items-center justify-between mt-8">
              {step > 1 ? (
                <button
                  onClick={() => { setError(""); setStep((s) => s - 1); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <Link href="/" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition">
                  <ArrowLeft className="w-4 h-4" />
                  Cancel
                </Link>
              )}

              {step < 4 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-900/30"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                  {loading ? "Submitting…" : "Submit Application"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
