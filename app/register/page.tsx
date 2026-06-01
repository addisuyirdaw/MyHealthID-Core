"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { registerPatient } from "@/lib/actions/patient.actions";
import { checkInToQueue } from "@/lib/actions/queue.actions";
import { ADMIN_ROLES, REGISTRATION_ROLES } from "@/lib/locales/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HeartPulse, CheckCircle2, ShieldCheck, User, IdCard, Fingerprint, ScanSearch, AlertTriangle, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import dynamic from "next/dynamic";
import { parseFaydaScanPayload } from "@/lib/fayda-scan";
import { FrontIdCapture } from "@/components/FrontIdCapture";
import { LogoIcon } from "@/components/LogoIcon";
import { ChiefComplaintPicker } from "@/components/ChiefComplaintPicker";
import { findTriageComplaintByLabel } from "@/lib/triage/triageList";
import { isFaydaFin12, isFaydaFcn16 } from "@/lib/fayda-format";
import { Ward, TriageStatus } from "@prisma/client";

const FaydaQrScanner = dynamic(
  () => import("@/components/FaydaQrScanner").then((m) => m.FaydaQrScanner),
  { ssr: false }
);

function formatFinDigits(raw: string) {
  const val = raw.replace(/\D/g, "").substring(0, 12);
  let formatted = val;
  if (formatted.length > 4) formatted = formatted.substring(0, 4) + " " + formatted.substring(4);
  if (formatted.length > 9) formatted = formatted.substring(0, 9) + " " + formatted.substring(9);
  return formatted;
}

type ScanFeedback =
  | { variant: "idle" }
  | { variant: "info" | "success" | "error"; title: string; detail?: string };

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  const [role, setRole] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const getRoleFromCookie = () => {
      if (typeof document === "undefined") return "";
      const match = document.cookie.split("; ").find((r) => r.startsWith("userRole="));
      return match ? match.split("=")[1] : "";
    };
    const r = getRoleFromCookie();
    setRole(r);
    setAuthChecked(true);
  }, []);

  // Identity Bridge State
  const [identityMode, setIdentityMode] = useState<"FAYDA" | "NO_ID" | "MANUAL" | null>(null);
  // No-ID path is on by default (server-generated MHID-XXXXXX). Set NEXT_PUBLIC_ALLOW_NO_ID=false to hide it only.
  const allowNoId = String(process.env.NEXT_PUBLIC_ALLOW_NO_ID ?? "true").toLowerCase() !== "false";

  const [isVerified, setIsVerified] = useState(false);
  const [nationalId, setNationalId] = useState("");
  const [fcn, setFcn] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [phone, setPhone] = useState("");
  const [nidExistsError, setNidExistsError] = useState("");
  type ScanStep = "idle" | "scan_back" | "transition" | "scan_front" | "confirmation";
  const [scanStep, setScanStep] = useState<ScanStep>("idle");
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>({ variant: "idle" });

  // OCR cross-check state
  type OcrStatus = "idle" | "scanning" | "verified" | "mismatch" | "failed" | "skipped";
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrReason, setOcrReason] = useState("");
  const lastUploadedFile = useRef<File | null>(null);
  const isAutoSubmitting = useRef(false);

  // Auto-filled Fayda demographics (Golden List / QR payload)
  const [fullName, setFullName] = useState("");
  const [sex, setSex] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>(""); // yyyy-mm-dd

  const resetIdentityState = () => {
    setNationalId("");
    setFcn("");
    setIsVerified(false);
    setScanStep("idle");
    setScanFeedback({ variant: "idle" });
    setFullName("");
    setSex("");
    setDateOfBirth("");
    setNidExistsError("");
    setOcrStatus("idle");
    setOcrReason("");
    lastUploadedFile.current = null;
    isAutoSubmitting.current = false;
  };

  // Smart Triage State
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [ward, setWard] = useState("OPD_OUTPATIENT");
  const [triageStatus, setTriageStatus] = useState("WAITING_FOR_TRIAGE");
  /** Urgent chief complaint → EMERGENCY ward + red queue row (still WAITING_FOR_TRIAGE for nurse triage). */
  const [visitEmergency, setVisitEmergency] = useState(false);
  const [suspectedDisease, setSuspectedDisease] = useState("");

  const [accessError, setAccessError] = useState("");

  /** Desk-only emergency lane: minimal fields, no scanner / no FIN verification. */
  const [emergencyFastPath, setEmergencyFastPath] = useState(false);
  const [emergencyDeskName, setEmergencyDeskName] = useState("");
  const [emergencyDeskPhone, setEmergencyDeskPhone] = useState("");

  const finDigitsOnly = nationalId.replace(/\s/g, "");
  const fcnDigitsOnly = fcn.replace(/\D/g, "");
  const finFormatOk = isFaydaFin12(finDigitsOnly);
  const fcnFormatOk = isFaydaFcn16(fcnDigitsOnly);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errorMsg = params.get("error");
      if (errorMsg) {
        setAccessError(errorMsg.replace(/\+/g, " "));
      }
    }
  }, []);

  const analyzeSymptoms = (text: string) => {
    const lowerText = text.toLowerCase();
    
    let suspect = "";
    if (lowerText.includes("cough") && (lowerText.includes("sweat") || lowerText.includes("weight"))) {
      suspect = "High Suspect: TB (Tuberculosis)";
    } else if (lowerText.includes("fever") && lowerText.includes("pain") && lowerText.includes("vomit")) {
      suspect = "High Suspect: Severe Infection";
    } else if (lowerText.includes("fever") && lowerText.includes("chill") && lowerText.includes("headache")) {
      suspect = "High Suspect: Malaria";
    } else if (lowerText.includes("heartburn") || (lowerText.includes("stomach") && lowerText.includes("pain")) || lowerText.includes("ulcer")) {
      suspect = "High Suspect: Peptic Ulcer Disease";
    }
    setSuspectedDisease(suspect);

    const keywords = ['chest', 'breath', 'blood', 'unconscious', 'accident', 'severe', 'pain'];
    
    if (keywords.some((kw) => lowerText.includes(kw))) {
      setWard("EMERGENCY");
      setTriageStatus("WAITING_FOR_TRIAGE");
      setVisitEmergency(true);
    } else {
      setWard("OPD_OUTPATIENT");
      setTriageStatus("WAITING_FOR_TRIAGE");
      setVisitEmergency(false);
    }
  };

  const applyStructuredComplaint = (label: string, priority?: 1 | 2) => {
    setChiefComplaint(label);
    if (priority === 1) {
      setWard("EMERGENCY");
      setTriageStatus("WAITING_FOR_TRIAGE");
      setVisitEmergency(true);
    } else if (priority === 2) {
      setWard("OPD_OUTPATIENT");
      setTriageStatus("WAITING_FOR_TRIAGE");
      setVisitEmergency(false);
    }
    analyzeSymptoms(label);
  };

  const handleComplaintChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setChiefComplaint(val);
    const hit = findTriageComplaintByLabel(val.trim());
    if (hit) applyStructuredComplaint(hit.label, hit.priority);
    else analyzeSymptoms(val);
  };

  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    let formatted = val.substring(0, 12);
    if (formatted.length > 4) formatted = formatted.substring(0, 4) + ' ' + formatted.substring(4);
    if (formatted.length > 9) formatted = formatted.substring(0, 9) + ' ' + formatted.substring(9);
    setNationalId(formatted);
    setIsVerified(false);
    setNidExistsError("");
    setFcn("");
    setScanFeedback({ variant: "idle" });
  };

  const handleNidBlur = async () => {
    const cleanId = nationalId.replace(/\s/g, '');
    if (!cleanId) return;

    try {
      const res = await fetch(`/api/patients/check-exists?nid=${cleanId}`);
      const data = await res.json();
      if (data.exists) {
        setNidExistsError("This ID is already in use. Please edit or login.");
      } else {
        setNidExistsError("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const verifyFayda = async (fin: string, scannedFcn: string) => {
    setIsVerifying(true);
    setScanFeedback({ variant: "info", title: "Verifying identity", detail: "Checking your FIN + FCN against the Verified Registry…" });
    try {
      const res = await fetch("/api/fayda/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fin, fcn: scannedFcn }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Verification failed.");

      const cleanFcn = scannedFcn.replace(/\D/g, "").slice(0, 16);
      const gender = String(data.gender || "").toLowerCase();
      const resolvedSex = gender.startsWith("m") ? "Male" : gender.startsWith("f") ? "Female" : "";
      const dobIso = String(data.dateOfBirth || "");
      const dateOnly = dobIso.includes("T") ? dobIso.split("T")[0] : dobIso;
      const resolvedName = data.fullName || "";

      setNationalId(formatFinDigits(fin));
      setFcn(cleanFcn);
      setFullName(resolvedName);
      setSex(resolvedSex);
      setDateOfBirth(dateOnly);
      setIsVerified(true);
      
      setScanStep("transition");
      setTimeout(() => {
        setScanStep("scan_front");
      }, 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Verification failed.";
      setScanFeedback({ variant: "error", title: "Verification failed", detail: msg });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyManualFayda = async () => {
    const fin = nationalId.replace(/\s/g, "");
    const f = fcn.replace(/\s/g, "");
    if (fin.length !== 12) {
      setScanFeedback({
        variant: "error",
        title: "Missing FIN",
        detail: "Enter the 12-digit FIN printed on the back of your Fayda card.",
      });
      return;
    }
    if (f.length !== 16) {
      setScanFeedback({
        variant: "error",
        title: "Missing FCN",
        detail: "Enter or scan the 16-digit FCN from the front barcode.",
      });
      return;
    }
    await verifyFayda(fin, f);
  };

  const handleManualScanBypass = useCallback(() => {
    setScanStep("idle");
    setScanFeedback({
      variant: "info",
      title: "Manual entry",
      detail: "Type the 12-digit FIN and 16-digit FCN below, then tap Verify FIN + FCN.",
    });
  }, []);

  const triggerAutoSubmit = useCallback(async (patientFullName: string, patientFin: string, patientFcn: string, patientSex: string, patientDob: string) => {
    if (isAutoSubmitting.current) return;
    isAutoSubmitting.current = true;
    setLoading(true);
    setScanFeedback({ variant: "info", title: "Registering…", detail: "Saving to database and assigning queue token…" });
    try {
      const dobDate = patientDob ? new Date(`${patientDob}T00:00:00.000Z`) : undefined;
      const ageCalc = dobDate ? Math.max(0, new Date().getFullYear() - dobDate.getFullYear()) : 0;
      const result = await registerPatient({
        fullName: patientFullName,
        faydaId: patientFin,
        fcn: patientFcn,
        age: ageCalc,
        sex: patientSex || "Not Specified",
        dateOfBirth: dobDate,
        reasonForVisit: "Auto-registered via Fayda QR verification",
        chiefComplaint: "Pending — registered via Fayda QR",
        ward: "OPD_OUTPATIENT" as any,
        triageStatus: "WAITING_FOR_TRIAGE" as any,
        generateMyHealthId: false,
      });
      if (result?.error) {
        setScanFeedback({ variant: "error", title: "Registration error", detail: result.error });
        setLoading(false);
        isAutoSubmitting.current = false;
        return;
      }
      await checkInToQueue(result.id);
      router.push(`/queue?token=${result.queuePosition ?? 1}&name=${encodeURIComponent(patientFullName)}`);
    } catch (err: any) {
      setScanFeedback({ variant: "error", title: "Auto-registration failed", detail: err.message || "Please try again." });
      setLoading(false);
      isAutoSubmitting.current = false;
    }
  }, [router]);

  const handleFrontCapture = async (file: File) => {
    lastUploadedFile.current = file;
    await runOcrThenAutoSubmit(nationalId.replace(/\s/g, ""), fcn, fullName, sex, dateOfBirth);
  };

  const runOcrThenAutoSubmit = useCallback(async (fin: string, fcn: string, name: string, sex: string, dob: string) => {
    const file = lastUploadedFile.current;
    if (!file) {
      setOcrStatus("skipped");
      await triggerAutoSubmit(name, fin, fcn, sex, dob);
      return;
    }
    setOcrStatus("scanning");
    setScanFeedback({ variant: "info", title: "Cross-checking printed card…", detail: "Reading Name and FIN from the card image via OCR…" });
    try {
      const { runFaydaOcr, matchOcrVsQr } = await import("@/lib/fayda-ocr");
      const extract = await runFaydaOcr(file);
      const matchResult = matchOcrVsQr(extract, fin, name);
      if (matchResult.match) {
        setOcrStatus("verified");
        setOcrReason(matchResult.reason);
        setScanFeedback({ variant: "success", title: "✅ Card verified", detail: matchResult.reason });
        setScanStep("confirmation");
      } else {
        setOcrStatus("mismatch");
        setOcrReason(matchResult.reason);
        setScanFeedback({ variant: "error", title: "⚠️ Visual Mismatch Detected", detail: "Please ensure you are scanning the exact same ID card." });
      }
    } catch {
      setOcrStatus("failed");
      setOcrReason("OCR engine could not load. Use Staff Bypass to continue.");
      setScanFeedback({ variant: "error", title: "OCR unavailable", detail: "Could not read the card image. Use Staff Bypass below." });
    }
  }, [triggerAutoSubmit]);

  const handleDecodedQr = async (text: string, sourceFile?: File) => {
    if (sourceFile) lastUploadedFile.current = sourceFile;
    setScanFeedback({ variant: "info", title: "Code read", detail: "Extracting FIN and FCN from the scan…" });
    const parsed = parseFaydaScanPayload(text);
    if (!parsed) {
      setScanFeedback({
        variant: "error",
        title: "Could not parse ID data",
        detail: "Try brighter light, hold the card flat, scan the back QR or front barcode, or use Upload photo. You can also type FIN + FCN and tap Verify FIN + FCN.",
      });
      return;
    }
    if (parsed.kind === "pair") {
      await verifyFayda(parsed.fin, parsed.fcn);
      return;
    }
    if (parsed.kind === "fcn_only") {
      setFcn(parsed.fcn);
      setScanFeedback({ variant: "info", title: "FCN captured", detail: "Enter your 12-digit FIN from the card (or scan the back), then tap Verify FIN + FCN." });
      return;
    }
    if (parsed.kind === "fin_only") {
      setNationalId(formatFinDigits(parsed.fin));
      setScanFeedback({ variant: "info", title: "FIN captured", detail: "Scan the front barcode for FCN or type the 16-digit FCN, then tap Verify FIN + FCN." });
    }
  };

  const submitEmergencyDesk = async () => {
    const name = emergencyDeskName.trim();
    if (name.length < 2) {
      alert("Enter the patient name (at least 2 characters).");
      return;
    }
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    try {
      const result = await registerPatient({
        fullName: name,
        generateMyHealthId: true,
        age: 25,
        sex: "Not Specified",
        chiefComplaint: "Emergency — expedited desk registration (ID deferred)",
        reasonForVisit: "Emergency intake",
        ward: Ward.EMERGENCY,
        triageStatus: TriageStatus.WAITING_FOR_TRIAGE,
        emergencyFlag: true,
        phoneNumber: emergencyDeskPhone.trim() || undefined,
      });
      if (result?.error) {
        alert(result.error);
        return;
      }
      try {
        await checkInToQueue(result.id);
      } catch {
        /* already queued */
      }
      router.push(`/queue?token=${result.queuePosition ?? 1}&name=${encodeURIComponent(name)}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Emergency registration failed.");
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const nationalIdVal = nationalId.replace(/\s/g, '');

    if (identityMode === "FAYDA") {
      if (nationalIdVal && nationalIdVal.length !== 12) {
        alert("Invalid FIN length. Please scan the Fayda QR and verify your FIN (12 digits).");
        setLoading(false);
        isSubmitting.current = false;
        return;
      }
    }

    if (identityMode === "FAYDA" && !isVerified) {
      alert("Please scan and verify the Fayda ID before submitting.");
      setLoading(false);
      isSubmitting.current = false;
      return;
    }

    const data: any = {
      fullName: (formData.get("fullName") as string) || fullName,
      faydaId: (identityMode === "FAYDA" || identityMode === "MANUAL") ? (nationalIdVal || undefined) : undefined,
      nationalId: (identityMode === "FAYDA" || identityMode === "MANUAL") && nationalIdVal ? nationalIdVal : undefined,
      generateMyHealthId: identityMode === "NO_ID" || identityMode === "MANUAL",
      fcn: identityMode === "FAYDA" ? (fcn || undefined) : undefined,
      dateOfBirth: dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : undefined,
      age: Math.max(0, parseInt(formData.get("age") as string, 10) || 0),
      sex: (formData.get("sex") as string) || sex,
      reasonForVisit: "Routine Triage Assessment",
      ward: ward || "OPD_OUTPATIENT",
      triageStatus: "WAITING_FOR_TRIAGE",
      emergencyFlag: false,
      religion: formData.get("religion") as string,
      occupation: formData.get("occupation") as string,
      maritalStatus: formData.get("maritalStatus") as string,
      educationalStatus: formData.get("educationalStatus") as string,
      addressRegion: formData.get("addressRegion") as string,
      addressZone: formData.get("addressZone") as string,
      addressWoreda: formData.get("addressWoreda") as string,
      addressKebele: formData.get("addressKebele") as string,
      emergencyContactName: formData.get("emergencyContactName") as string,
      emergencyContactPhone: formData.get("emergencyContactPhone") as string,
      chiefComplaint: "Routine Triage Assessment",
      detailedSituation: "",
      preExistingConditions: "",
      allergyInformation: "",
      phoneNumber: formData.get("phoneNumber") as string,
    };

    try {
      const result = await registerPatient(data);
      if (result && result.error) {
        alert(result.error);
        return;
      }
      try { await checkInToQueue(result.id); } catch { /* queue already exists */ }
      router.push(`/queue?token=${result.queuePosition ?? 1}&name=${encodeURIComponent((formData.get("fullName") as string) || fullName)}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  }

  if (authChecked && role && !REGISTRATION_ROLES.includes(role as any) && !ADMIN_ROLES.includes(role as any)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl text-center max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center ring-8 ring-amber-500/5">
              <ShieldAlert className="w-10 h-10 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Access Restricted</h2>
          <p className="text-slate-400 text-sm mb-2">
            The <span className="font-bold text-pink-400">Patient Registration Portal</span> is only accessible to Receptionists.
          </p>
          {role && (
            <p className="text-xs text-slate-500 mb-6">
              Your current role:{" "}
              <span className="font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                {role}
              </span>
            </p>
          )}
          <Button
            className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-11 border border-slate-700"
            onClick={() => window.history.back()}
          >
            ← Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex items-center justify-center p-4">
      {/* Glow circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      <Card className="w-full max-w-2xl border-slate-800/80 bg-slate-900/40 backdrop-blur-2xl shadow-2xl relative z-10 text-slate-100">
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-1 text-center pb-8 border-b border-slate-800/60">
            <div className="mx-auto bg-blue-500/10 border border-blue-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
              <HeartPulse className="h-8 w-8 text-blue-400" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-white">{t.registration.title}</CardTitle>
            <CardDescription className="text-slate-400 text-sm">{t.registration.subtitle}</CardDescription>

            {accessError && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center shadow-md animate-in fade-in zoom-in duration-300 mx-auto max-w-lg w-full">
                <svg className="w-6 h-6 text-red-400 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <div className="text-left text-red-200 text-sm">
                   <p className="font-bold uppercase tracking-wider mb-0.5">Authorization Error</p>
                   <p className="font-medium">{accessError}</p>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="grid gap-6 pt-8 pb-4">

            <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/40 via-red-900/10 to-red-950/40 p-4 text-white shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                  <span className="font-black text-lg tracking-tight uppercase text-red-200">Red emergency</span>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-red-300">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-red-500/50 bg-slate-900 text-red-500 accent-red-650"
                    checked={emergencyFastPath}
                    onChange={(e) => {
                      setEmergencyFastPath(e.target.checked);
                      if (e.target.checked) {
                        resetIdentityState();
                        setIdentityMode(null);
                        setVisitEmergency(true);
                        setWard("EMERGENCY");
                      } else {
                        setVisitEmergency(false);
                        setWard("OPD_OUTPATIENT");
                      }
                    }}
                  />
                  <span className="text-sm font-bold">Activate — skip scanner &amp; ID checks</span>
                </label>
              </div>
              {emergencyFastPath && (
                <div className="space-y-3 pt-3 border-t border-red-900/50">
                  <p className="text-xs text-red-300/80">
                    For unstable patients only. Creates a <strong>temporary MHID</strong> and queues under emergency — complete full Fayda verification later when safe.
                  </p>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Patient name</Label>
                    <Input
                      value={emergencyDeskName}
                      onChange={(e) => setEmergencyDeskName(e.target.value)}
                      placeholder="e.g. Alemayehu Tadesse"
                      className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Phone (optional)</Label>
                    <Input
                      value={emergencyDeskPhone}
                      onChange={(e) => setEmergencyDeskPhone(e.target.value)}
                      placeholder="+251…"
                      className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500/20"
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full h-12 text-sm font-black bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg border border-red-500/25 transition-all"
                    disabled={loading}
                    onClick={() => void submitEmergencyDesk()}
                  >
                    Register to queue now
                  </button>
                </div>
              )}
            </div>

            {/* === HYBRID IDENTITY BRIDGE === */}
            {!emergencyFastPath && (!identityMode ? (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-200 flex items-center justify-center gap-2">
                    <Fingerprint className="w-5 h-5 text-blue-400" /> {t.registration.identityVerification}
                  </h3>
                  <p className="text-sm text-slate-400">{t.registration.identitySelectionDesc}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => { resetIdentityState(); setEmergencyFastPath(false); setIdentityMode("FAYDA"); }}
                    className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-blue-900/50 bg-blue-950/20 hover:bg-blue-950/40 hover:border-blue-500 transition-all duration-200 text-left"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <IdCard className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-blue-200">{t.registration.faydaIdTitle}</p>
                      <p className="text-xs text-blue-400 mt-0.5">{t.registration.faydaIdDesc}</p>
                    </div>
                  </button>
                  {allowNoId ? (
                    <button
                      type="button"
                      onClick={() => { resetIdentityState(); setEmergencyFastPath(false); setIdentityMode("NO_ID"); setIsVerified(true); }}
                      className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-slate-800 bg-slate-900/20 hover:bg-emerald-950/20 hover:border-emerald-500/50 transition-all duration-200 text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:bg-emerald-600 transition-all">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-300 group-hover:text-emerald-300">{t.registration.noIdTitle}</p>
                        <p className="text-xs text-slate-400 group-hover:text-emerald-400 mt-0.5">{t.registration.noIdDesc}</p>
                      </div>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/10 text-center text-xs text-slate-500">
                      <p>No-ID registration is disabled for this deployment.</p>
                    </div>
                  )}
                </div>
                {/* Manual Entry — always visible, full-width */}
                <button
                  type="button"
                  onClick={() => { resetIdentityState(); setEmergencyFastPath(false); setIdentityMode("MANUAL"); setIsVerified(true); }}
                  className="group w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/40 hover:border-amber-500/50 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-550 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform shrink-0">
                     <ScanSearch className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-amber-200">Manual Entry (No Scan Required)</p>
                    <p className="text-xs text-amber-400 mt-0.5">Type your name, National ID, and details directly — no camera or QR needed.</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  identityMode === "FAYDA" ? "bg-blue-650" : identityMode === "MANUAL" ? "bg-amber-600" : "bg-emerald-650"
                }`}>
                  {identityMode === "FAYDA" ? <IdCard className="w-4 h-4 text-white" /> : identityMode === "MANUAL" ? <ScanSearch className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-200">
                    {identityMode === "FAYDA" ? t.registration.faydaPathTitle : identityMode === "MANUAL" ? "Manual Entry" : t.registration.noIdPathTitle}
                  </p>
                  <p className="text-xs text-slate-400">
                    {identityMode === "FAYDA" ? t.registration.faydaPathDesc : identityMode === "MANUAL" ? "Fill in your details manually — no scan required." : t.registration.noIdPathDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetIdentityState(); setEmergencyFastPath(false); setIdentityMode(null); }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  {t.registration.change}
                </button>
              </div>
            ))}

            {/* === DEMOGRAPHICS === */}
            {!emergencyFastPath && identityMode && (<>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">{t.registration.demographicsTitle}</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Full Name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={identityMode === "FAYDA" && isVerified}
                    className="bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* === MANUAL ENTRY PANEL === */}
              {identityMode === "MANUAL" && (
                <div className="mt-4 p-5 rounded-xl border-2 border-amber-900/50 bg-amber-950/20 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-amber-200 font-bold text-sm">
                    <ScanSearch className="w-4 h-4 text-amber-450" />
                    Manual Registration — Enter Details Below
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="manual-nid" className="text-slate-300">National ID (FIN) — Optional</Label>
                      <Input
                        id="manual-nid"
                        placeholder="e.g. 1234 5678 9012"
                        value={nationalId}
                        onChange={handleNationalIdChange}
                        onBlur={handleNidBlur}
                        className={nidExistsError ? "border-red-500 bg-red-950/20 text-red-200" : "bg-slate-950 border-slate-800 text-slate-100"}
                      />
                      {nidExistsError && <p className="text-xs text-red-400 mt-1">{nidExistsError}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="manual-sex" className="text-slate-300">Sex</Label>
                      <Select name="sex" value={sex} onValueChange={setSex}>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="manual-dob" className="text-slate-300">Date of Birth</Label>
                      <Input
                        id="manual-dob"
                        type="date"
                        name="dateOfBirth"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="manual-phone" className="text-slate-300">Phone Number</Label>
                      <Input
                        id="manual-phone"
                        name="phoneNumber"
                        placeholder="+251 9XX XXX XXX"
                        type="tel"
                        className="bg-slate-950 border-slate-800 text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-xs text-amber-300">
                    ⚠️ <strong>Staff Note:</strong> Manual registration bypasses QR verification. A staff member should visually confirm the ID document before approving.
                  </div>
                </div>
              )}
              </div>

              {/* Fayda ID input — only shown in FAYDA mode */}
              {identityMode === "FAYDA" && (
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <Label htmlFor="nationalId" className="text-slate-300">{t.registration.faydaIdTitle}</Label>
                    {finFormatOk && !isVerified && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-450 bg-emerald-950/30 border border-emerald-900/50 px-2 py-0.5 rounded-full shrink-0">
                        Fayda format verified (12-digit FIN)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 -mt-1">Length check only — not proof the ID was issued by Fayda.</p>
                  <div className="flex gap-2">
                    <Input
                      id="nationalId"
                      name="nationalId"
                      placeholder="Scan QR to fill FIN"
                      value={nationalId}
                      onChange={handleNationalIdChange}
                      onBlur={handleNidBlur}
                      disabled={isVerified}
                      className={isVerified ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-350" : (nidExistsError ? "border-red-500 bg-red-950/20 text-red-200" : "bg-slate-950 border-slate-800 text-slate-100")}
                      required
                    />
                      <Button
                        type="button"
                        onClick={() => {
                          setScanFeedback({ variant: "idle" });
                          setScanStep("scan_back");
                        }}
                      disabled={isVerified || isVerifying}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold whitespace-nowrap"
                    >
                      {isVerifying ? "Verifying..." : "Scan card"}
                    </Button>
                  </div>

                  {identityMode === "FAYDA" && !isVerified && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={verifyManualFayda} disabled={isVerifying} className="border-slate-800 hover:bg-slate-900 text-slate-200">
                        Verify FIN + FCN
                      </Button>
                      <span className="text-xs text-slate-500 self-center">
                        Use after typing or scanning both numbers (Golden List / pilot registry must include your pair).
                      </span>
                    </div>
                  )}

                  {identityMode === "FAYDA" && !isVerified && scanStep === "idle" && scanFeedback.variant !== "idle" && (
                    <div
                      className={`mt-3 rounded-lg border p-3 text-sm ${
                        scanFeedback.variant === "success"
                          ? "border-emerald-800/50 bg-emerald-950/20 text-emerald-200"
                          : scanFeedback.variant === "error"
                            ? "border-red-800/50 bg-red-950/20 text-red-200"
                            : "border-blue-800/50 bg-blue-950/20 text-blue-200"
                      }`}
                    >
                      <p className="font-semibold">{scanFeedback.title}</p>
                      {scanFeedback.detail && (
                        <p className="mt-1 text-xs opacity-90">{scanFeedback.detail}</p>
                      )}
                      {scanFeedback.variant === "error" && (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 w-full border-red-800/50 text-red-300 hover:bg-red-950/30"
                          onClick={handleManualScanBypass}
                        >
                          Manual bypass — close scanner &amp; type FIN + FCN
                        </Button>
                      )}
                    </div>
                  )}

                  {scanStep !== "idle" && (
                    <div className="mt-3 p-4 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-2xl relative z-20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-400" />
                          Secure Fayda Verification
                        </div>
                        <button
                          type="button"
                          onClick={() => setScanStep("idle")}
                          className="text-xs text-slate-400 hover:text-slate-200 underline"
                        >
                          Close
                        </button>
                      </div>
                      {scanFeedback.variant !== "idle" && (
                        <div
                          className={`mb-3 rounded-lg border p-3 text-sm ${
                            scanFeedback.variant === "success"
                              ? "border-emerald-800/50 bg-emerald-950/20 text-emerald-250"
                              : scanFeedback.variant === "error"
                                ? "border-red-800/50 bg-red-950/20 text-red-250"
                                : "border-blue-800/50 bg-blue-950/20 text-blue-250"
                          }`}
                        >
                          <p className="font-semibold">{scanFeedback.title}</p>
                          {scanFeedback.detail && (
                            <p className="mt-1 text-xs opacity-90">{scanFeedback.detail}</p>
                          )}
                        </div>
                      )}

                      {scanStep === "scan_back" && (
                        <div className="animate-in fade-in duration-300">
                          <p className="font-bold mb-2 text-slate-200">Step 1: Scan Back (QR)</p>
                          <FaydaQrScanner
                            onCodeRead={() =>
                              setScanFeedback({
                                variant: "info",
                                title: "Code detected",
                                detail: "Reading data from your Ethiopian National ID…",
                              })
                            }
                            onDecodedText={(text, file) => handleDecodedQr(text, file)}
                            onFaydaPair={async (fcn, fin, file) => {
                              if (file) lastUploadedFile.current = file;
                              setScanFeedback({ variant: "info", title: "Code detected", detail: "Extracting FIN and FCN from the scan…" });
                              await verifyFayda(fin, fcn);
                            }}
                            onError={(msg) =>
                              setScanFeedback({
                                variant: "error",
                                title: "Could not read ID from image",
                                detail: msg,
                              })
                            }
                            onManualBypass={handleManualScanBypass}
                          />
                        </div>
                      )}

                      {scanStep === "transition" && (
                        <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in zoom-in duration-300">
                          <LogoIcon className="w-20 h-20 animate-pulse" />
                          <p className="text-blue-400 font-semibold text-lg animate-pulse text-center">Back verified.<br/>Transitioning to Front...</p>
                        </div>
                      )}

                      {scanStep === "scan_front" && (
                        <div className="animate-in slide-in-from-right-4 duration-500">
                          <p className="font-bold mb-2 text-blue-300">Step 2: Scan Front (Photo)</p>
                          <FrontIdCapture onCapture={handleFrontCapture} />
                          {ocrStatus === "scanning" && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-purple-300 bg-purple-950/20 border border-purple-800/50 rounded-lg px-3 py-2">
                              <ScanSearch className="w-4 h-4 animate-pulse shrink-0 text-purple-400" />
                              Cross-checking printed Name &amp; FIN via OCR…
                            </div>
                          )}
                          {(ocrStatus === "mismatch" || ocrStatus === "failed") && (
                            <div className="mt-3 rounded-lg border border-amber-800/50 bg-amber-950/20 p-3 text-sm">
                              <div className="flex items-start gap-2 text-amber-200">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                                <div>
                                  <p className="font-semibold">Visual Mismatch Detected</p>
                                  <p className="text-xs mt-0.5 opacity-85">{ocrReason}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setOcrStatus("skipped");
                                  void triggerAutoSubmit(fullName, nationalId.replace(/\s/g, ""), fcn, sex, dateOfBirth);
                                }}
                                className="mt-2.5 w-full text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors"
                              >
                                Staff Bypass — Register Anyway
                              </button>
                            </div>
                          )}
                          {ocrStatus === "verified" && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-900/50 rounded-lg px-3 py-2">
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-450" />
                              OCR verified — {ocrReason}
                            </div>
                          )}
                        </div>
                      )}

                      {scanStep === "confirmation" && (
                        <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-emerald-500/50 rounded-2xl bg-emerald-950/20 shadow-2xl mt-4 animate-in zoom-in duration-500">
                          <LogoIcon className="w-16 h-16 mb-4" />
                          <h3 className="text-xl font-black text-emerald-300 tracking-tight">Identity Passport</h3>
                          <div className="mt-4 bg-slate-950/60 p-4 rounded-xl border border-emerald-900/40 w-full text-left space-y-2 shadow-inner">
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Name</p>
                              <p className="text-lg font-semibold text-slate-200">{fullName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-2">FIN</p>
                              <p className="text-lg font-mono text-slate-200">{nationalId}</p>
                            </div>
                          </div>
                          <Button 
                            type="button"
                            onClick={() => triggerAutoSubmit(fullName, nationalId.replace(/\s/g, ""), fcn, sex, dateOfBirth)}
                            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl h-12 text-lg font-bold transition-all hover:scale-[1.02]"
                          >
                            Confirm Identity
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {nidExistsError && !isVerified && (
                    <div className="text-sm text-red-400 mt-1 font-medium">
                      {nidExistsError}
                    </div>
                  )}

                  {isVerified && nationalId && (
                    <div className="mt-2 rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-3 text-sm text-emerald-250">
                      <div className="flex items-center font-semibold text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 mr-2 shrink-0 text-emerald-450" />
                        Verification successful
                      </div>
                      <p className="mt-1 pl-6 text-xs text-emerald-450/80">
                        Your Fayda FIN matched the Verified Registry. Name, date of birth, and sex were filled in automatically.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* No-ID manual demographics (only shown in NO_ID mode) */}
              {identityMode === "NO_ID" && (
                <div className="mt-4 p-4 rounded-xl border border-emerald-800/50 bg-emerald-950/10 space-y-3">
                  <div className="text-sm font-semibold text-emerald-300">
                    Manual Registration (No National ID)
                  </div>
                  <div className="text-xs text-emerald-400">
                    A unique <strong>MyHealth ID</strong> (<code className="text-emerald-300">MHID-XXXXXX</code>) will be created securely on the server when you submit.
                  </div>
                </div>
              )}

              {identityMode === "NO_ID" && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/50 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-450 shrink-0" />
                  <span className="text-emerald-300 font-medium">{t.registration.noIdBadgeText}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-slate-300">Age</Label>
                  <Input id="age" name="age" type="number" min="0" placeholder="Age" required className="bg-slate-950 border-slate-800 text-slate-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex" className="text-slate-300">Sex</Label>
                  <Select name="sex" required value={sex} onValueChange={setSex}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={identityMode === "FAYDA" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-slate-300">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={identityMode === "FAYDA" && isVerified}
                    required
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                {identityMode === "FAYDA" && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <Label htmlFor="fcn" className="text-slate-300">FCN (scan or type)</Label>
                      {fcnFormatOk && !isVerified && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-2 py-0.5 rounded-full shrink-0">
                          Fayda format verified (16-digit FCN)
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 -mt-1">Length check only — not proof the ID was issued by Fayda.</p>
                    <Input
                      id="fcn"
                      name="fcn"
                      value={fcn}
                      disabled={isVerified}
                      onChange={(e) => setFcn(e.target.value.replace(/\D/g, "").slice(0, 16))}
                      placeholder="16-digit FCN (front barcode)"
                      className={isVerified ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-950 border-slate-800 text-slate-100"}
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-slate-300">Phone Number</Label>
                  <Input 
                    id="phoneNumber" 
                    name="phoneNumber" 
                    type="tel" 
                    placeholder="09... (Optional)" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ''))}
                    pattern="^(09|07)\d{8}$" 
                    title="Phone number must be 10 digits starting with 09 or 07" 
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus" className="text-slate-300">Marital Status</Label>
                  <Select name="maritalStatus">
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><SelectValue placeholder="Select Status..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="educationalStatus" className="text-slate-300">Educational Status</Label>
                  <Select name="educationalStatus">
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-100"><SelectValue placeholder="Select Level..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Primary">Primary</SelectItem>
                      <SelectItem value="Secondary">Secondary</SelectItem>
                      <SelectItem value="Higher Education">Higher Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="occupation" className="text-slate-300">Occupation</Label>
                  <Input id="occupation" name="occupation" placeholder="Occupation" className="bg-slate-950 border-slate-800 text-slate-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="religion" className="text-slate-300">Religion</Label>
                  <Input id="religion" name="religion" placeholder="Religion (Optional)" className="bg-slate-950 border-slate-800 text-slate-100" />
                </div>
              </div>

            {/* Lock overlay — shown when Fayda path but not yet verified */}
            {identityMode === "FAYDA" && !isVerified ? (
              <div className="py-12 bg-slate-900/20 border border-slate-800 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-75">
                <div className="w-16 h-16 bg-slate-850 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-300">{t.registration.faydaVerificationRequired}</h3>
                <p className="text-slate-500 max-w-sm mt-1 text-xs">{t.registration.faydaUnlockText}</p>
              </div>
            ) : isVerified ? (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-8">
                {/* 2. Address & Contact */}
                <div className="space-y-4 pt-2">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">{t.registration.addressTitle}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressRegion" className="text-slate-300">Region</Label>
                  <Input id="addressRegion" name="addressRegion" placeholder="Region (Kilil) e.g. Amhara" required className="bg-slate-950 border-slate-800 text-slate-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressZone" className="text-slate-300">Zone</Label>
                  <Input id="addressZone" name="addressZone" placeholder="Zone / Sub-city" required className="bg-slate-950 border-slate-800 text-slate-100" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressWoreda" className="text-slate-300">Woreda</Label>
                  <Input id="addressWoreda" name="addressWoreda" placeholder="Woreda" required className="bg-slate-950 border-slate-800 text-slate-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressKebele" className="text-slate-300">Kebele</Label>
                  <Input id="addressKebele" name="addressKebele" placeholder="Kebele" required className="bg-slate-950 border-slate-800 text-slate-100" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName" className="text-slate-300">Emergency Contact Name</Label>
                  <Input id="emergencyContactName" name="emergencyContactName" placeholder="Full Name" className="bg-slate-950 border-slate-800 text-slate-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone" className="text-slate-300">Emergency Contact Phone</Label>
                  <Input id="emergencyContactPhone" name="emergencyContactPhone" placeholder="Phone Number" className="bg-slate-950 border-slate-800 text-slate-100" />
                </div>
              </div>
            </div>
            </div>
          ) : null}
          </>
          )}

          </CardContent>

          {!emergencyFastPath && (
          <CardFooter>
            <button 
              className="w-full h-12 flex items-center justify-center gap-2 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg border border-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none" 
              disabled={loading || !isVerified || !identityMode} 
              type="submit"
            >
              {loading ? t.registration.registering : t.registration.completeRegistration}
            </button>
          </CardFooter>
          )}
        </form>
      </Card>
    </div>
  );
}