"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { registerPatient } from "@/lib/actions/patient.actions";
import { checkInToQueue } from "@/lib/actions/queue.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HeartPulse, CheckCircle2, ShieldCheck, User, IdCard, Fingerprint, ScanSearch, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import dynamic from "next/dynamic";
import { parseFaydaScanPayload } from "@/lib/fayda-scan";
import { FrontIdCapture } from "@/components/FrontIdCapture";
import { LogoIcon } from "@/components/LogoIcon";
import { ChiefComplaintPicker } from "@/components/ChiefComplaintPicker";
import { findTriageComplaintByLabel } from "@/lib/triage/triageList";

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

  // Identity Bridge State
  const [identityMode, setIdentityMode] = useState<"FAYDA" | "NO_ID" | "MANUAL" | null>(null);
  // No-ID path is on by default (server-generated MHID-XXXXXX). Set NEXT_PUBLIC_ALLOW_NO_ID=false to hide it only.
  const allowNoId = String(process.env.NEXT_PUBLIC_ALLOW_NO_ID ?? "true").toLowerCase() !== "false";

  // Phase 11 State
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [fcn, setFcn] = useState("");
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [linkageStatus, setLinkageStatus] = useState<"IDLE" | "ERROR">("IDLE");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [phone, setPhone] = useState("");
  const [nidExistsError, setNidExistsError] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [countdown, setCountdown] = useState(0);
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
      suspect = "High Suspect: Appendicitis / Severe Infection";
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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const val = e.target.value.replace(/\D/g, '');
    let formatted = val.substring(0, 12);
    if (formatted.length > 4) formatted = formatted.substring(0, 4) + ' ' + formatted.substring(4);
    if (formatted.length > 9) formatted = formatted.substring(0, 9) + ' ' + formatted.substring(9);
    setNationalId(formatted);
    // Reset states if user types again
    setLinkedEmail(null);
    setLinkageStatus("IDLE");
    setShowOtp(false);
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

  /** Auto-submit: called after OCR step resolves (verified or staff-bypassed). */
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
      // Auto-enqueue
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

  /** Run OCR cross-check then auto-submit if match (or skipped). */
  const runOcrThenAutoSubmit = useCallback(async (fin: string, fcn: string, name: string, sex: string, dob: string) => {
    const file = lastUploadedFile.current;
    if (!file) {
      // No uploaded file (camera scan) — skip OCR, go straight to auto-submit
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

  const handleSendCode = async () => {
    if (!email) {
      alert("Please provide an email address first.");
      return;
    }
    if (nidExistsError) {
      alert("This ID is already registered. Please login or edit existing record.");
      return;
    }
    const cleanId = nationalId.replace(/\s/g, '');
    if (!cleanId) {
      alert("Please provide your National ID first.");
      return;
    }
    setSendingSms(true);
    try {
      // Call the API to ensure DB record is created/updated (Integrity)
      await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nationalId: cleanId }),
      });
      // Open the OTP input section
      setShowOtp(true);
      setCountdown(60);
    } catch (err) {
      console.error(err);
      // Fallback: still show OTP field if API fails so they can use demo bypass
      setShowOtp(true);
    } finally {
      setSendingSms(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId: nationalId.replace(/\s/g, ''), otp }),
      });
      const data = await res.json();
      if (data.success || otp === "123456") {
        setIsVerified(true);
      } else {
        alert("Invalid OTP. Try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error verifying OTP");
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const nationalIdVal = nationalId.replace(/\s/g, '');

    // Frontend validation check before calling the server
    if (identityMode === "FAYDA") {
      if (nationalIdVal && nationalIdVal.length !== 12) {
        alert("Invalid FIN length. Please scan the Fayda QR and verify your FIN (12 digits).");
        setLoading(false);
        isSubmitting.current = false;
        return;
      }
    }

    // For Fayda path: require verification. For No-ID and Manual paths: skip.
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
      reasonForVisit: formData.get("chiefComplaint") as string,
      ward: ward,
      triageStatus: "WAITING_FOR_TRIAGE",
      emergencyFlag: visitEmergency,
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
      chiefComplaint: formData.get("chiefComplaint") as string,
      detailedSituation: formData.get("detailedSituation") as string,
      suspectedDisease: suspectedDisease,
      preExistingConditions: formData.get("preExistingConditions") as string,
      allergyInformation: formData.get("allergyInformation") as string,
      bp: formData.get("bp") as string,
      pulse: parseInt(formData.get("pulse") as string, 10) || undefined,
      temp: parseFloat(formData.get("temp") as string) || undefined,
      spO2: parseInt(formData.get("spO2") as string, 10) || undefined,
      phoneNumber: formData.get("phoneNumber") as string,
    };

    try {
      const result = await registerPatient(data);
      if (result && result.error) {
        alert(result.error);
        return;
      }
      // Auto-enqueue and redirect to live queue
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



  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-3xl" />
      <Card className="w-full max-w-2xl border-white/40 bg-white/60 backdrop-blur-2xl shadow-xl relative z-10">
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-1 text-center pb-8 border-b border-white/20">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
              <HeartPulse className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">{t.registration.title}</CardTitle>
            <CardDescription>{t.registration.subtitle}</CardDescription>

            {accessError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center shadow-sm animate-in fade-in zoom-in duration-300 mx-auto max-w-lg w-full">
                <svg className="w-6 h-6 text-red-600 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <div className="text-left text-red-800 text-sm">
                   <p className="font-bold uppercase tracking-wider mb-0.5">Authorization Error</p>
                   <p className="font-medium">{accessError}</p>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="grid gap-6 pt-8 pb-4">

            {/* === HYBRID IDENTITY BRIDGE === */}
            {!identityMode ? (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-800 flex items-center justify-center gap-2">
                    <Fingerprint className="w-5 h-5 text-blue-600" /> {t.registration.identityVerification}
                  </h3>
                  <p className="text-sm text-slate-500">{t.registration.identitySelectionDesc}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => { resetIdentityState(); setIdentityMode("FAYDA"); }}
                    className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200 text-left"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <IdCard className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-blue-800">{t.registration.faydaIdTitle}</p>
                      <p className="text-xs text-blue-600 mt-0.5">{t.registration.faydaIdDesc}</p>
                    </div>
                  </button>
                  {allowNoId ? (
                    <button
                      type="button"
                      onClick={() => { resetIdentityState(); setIdentityMode("NO_ID"); setIsVerified(true); }}
                      className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:bg-emerald-600 transition-all">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-slate-700 group-hover:text-emerald-800">{t.registration.noIdTitle}</p>
                        <p className="text-xs text-slate-500 group-hover:text-emerald-600 mt-0.5">{t.registration.noIdDesc}</p>
                      </div>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                      <p>No-ID registration is disabled for this deployment.</p>
                    </div>
                  )}
                </div>
                {/* Manual Entry — always visible, full-width */}
                <button
                  type="button"
                  onClick={() => { resetIdentityState(); setIdentityMode("MANUAL"); setIsVerified(true); }}
                  className="group w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform shrink-0">
                    <ScanSearch className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-amber-800">Manual Entry (No Scan Required)</p>
                    <p className="text-xs text-amber-700 mt-0.5">Type your name, National ID, and details directly — no camera or QR needed.</p>
                  </div>
                </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  identityMode === "FAYDA" ? "bg-blue-600" : identityMode === "MANUAL" ? "bg-amber-500" : "bg-emerald-600"
                }`}>
                  {identityMode === "FAYDA" ? <IdCard className="w-4 h-4 text-white" /> : identityMode === "MANUAL" ? <ScanSearch className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {identityMode === "FAYDA" ? t.registration.faydaPathTitle : identityMode === "MANUAL" ? "Manual Entry" : t.registration.noIdPathTitle}
                  </p>
                  <p className="text-xs text-slate-500">
                    {identityMode === "FAYDA" ? t.registration.faydaPathDesc : identityMode === "MANUAL" ? "Fill in your details manually — no scan required." : t.registration.noIdPathDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { resetIdentityState(); setIdentityMode(null); }}
                  className="text-xs text-slate-400 hover:text-slate-700 underline"
                >
                  {t.registration.change}
                </button>
              </div>
            )}

            {/* === DEMOGRAPHICS (shown after identity selection) === */}
            {identityMode && (<>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">{t.registration.demographicsTitle}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Full Name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={identityMode === "FAYDA" && isVerified}
                  />
                </div>
              </div>

              {/* === MANUAL ENTRY PANEL === */}
              {identityMode === "MANUAL" && (
                <div className="mt-4 p-5 rounded-xl border-2 border-amber-200 bg-amber-50/60 space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <ScanSearch className="w-4 h-4" />
                    Manual Registration — Enter Details Below
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="manual-nid">National ID (FIN) — Optional</Label>
                      <Input
                        id="manual-nid"
                        placeholder="e.g. 1234 5678 9012"
                        value={nationalId}
                        onChange={handleNationalIdChange}
                        onBlur={handleNidBlur}
                        className={nidExistsError ? "border-red-400 bg-red-50" : ""}
                      />
                      {nidExistsError && <p className="text-xs text-red-600">{nidExistsError}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="manual-sex">Sex</Label>
                      <Select name="sex" value={sex} onValueChange={setSex}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="manual-dob">Date of Birth</Label>
                      <Input
                        id="manual-dob"
                        type="date"
                        name="dateOfBirth"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="manual-phone">Phone Number</Label>
                      <Input
                        id="manual-phone"
                        name="phoneNumber"
                        placeholder="+251 9XX XXX XXX"
                        type="tel"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-100 border border-amber-300 text-xs text-amber-900">
                    ⚠️ <strong>Staff Note:</strong> Manual registration bypasses QR verification. A staff member should visually confirm the ID document before approving.
                  </div>
                </div>
              )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex gap-2">
                    <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@example.com" disabled={isVerified || showOtp} required />
                    {!isVerified && !showOtp && (
                      <Button type="button" onClick={handleSendCode} disabled={sendingSms} className="bg-blue-600 hover:bg-blue-700">
                        {sendingSms ? "Sending..." : "Verify Email"}
                      </Button>
                    )}
                  </div>
                  {showOtp && !isVerified && (
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-sm mt-2 transition-all">
                      <p className="text-slate-600 mb-2">
                        A verification code was sent to <span className="font-mono font-medium text-blue-700">{email}</span>.
                      </p>
                      <div className="space-y-3 mt-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs text-slate-500">Enter 6-digit Code</Label>
                          {countdown > 0 && <span className="text-xs font-medium text-slate-500">{countdown}s</span>}
                        </div>
                        <div className="flex gap-2">
                          <Input 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                            placeholder="000000" 
                            className="font-mono text-center tracking-widest max-w-[120px]"
                          />
                          <Button type="button" onClick={handleVerifyOtp} size="sm" variant="default" className="min-w-[80px]">Verify</Button>
                        </div>
                        {countdown === 0 && (
                          <Button 
                            type="button" 
                            onClick={handleSendCode} 
                            disabled={sendingSms}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 mt-1"
                            variant="ghost"
                          >
                            Resend Code
                          </Button>
                        )}
                        <div className="mt-4 pt-3 border-t border-blue-200/50">
                          <p className="text-[10px] text-center text-slate-500 mb-2 font-medium">ለጊዜው ያለ ኢሜል ማረጋገጫ መግባት ይቻላል</p>
                          <Button 
                            type="button" 
                            onClick={() => { setIsVerified(true); setShowOtp(false); }} 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            Continue to Dashboard (Demo Mode)
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Fayda ID input — only shown in FAYDA mode */}
              {identityMode === "FAYDA" && (
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nationalId">{t.registration.faydaIdTitle}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="nationalId"
                      name="nationalId"
                      placeholder="Scan QR to fill FIN"
                      value={nationalId}
                      onChange={handleNationalIdChange}
                      onBlur={handleNidBlur}
                      disabled={isVerified}
                      className={isVerified ? "bg-green-50 border-green-200" : (nidExistsError ? "border-red-500 bg-red-50" : "")}
                      required
                    />
                      <Button
                        type="button"
                        onClick={() => {
                          setScanFeedback({ variant: "idle" });
                          setScanStep("scan_back");
                        }}
                      disabled={isVerified || isVerifying}
                      className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                    >
                      {isVerifying ? "Verifying..." : "Scan card"}
                    </Button>
                  </div>

                  {identityMode === "FAYDA" && !isVerified && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={verifyManualFayda} disabled={isVerifying}>
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
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : scanFeedback.variant === "error"
                            ? "border-red-200 bg-red-50 text-red-900"
                            : "border-blue-200 bg-blue-50 text-blue-900"
                      }`}
                    >
                      <p className="font-semibold">{scanFeedback.title}</p>
                      {scanFeedback.detail && (
                        <p className="mt-1 text-xs opacity-90">{scanFeedback.detail}</p>
                      )}
                    </div>
                  )}

                  {scanStep !== "idle" && (
                    <div className="mt-3 p-4 rounded-xl border border-slate-200 bg-white shadow-lg relative z-20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          Secure Fayda Verification
                        </div>
                        <button
                          type="button"
                          onClick={() => setScanStep("idle")}
                          className="text-xs text-slate-500 hover:text-slate-800 underline"
                        >
                          Close
                        </button>
                      </div>
                      {scanFeedback.variant !== "idle" && (
                        <div
                          className={`mb-3 rounded-lg border p-3 text-sm ${
                            scanFeedback.variant === "success"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : scanFeedback.variant === "error"
                                ? "border-red-200 bg-red-50 text-red-900"
                                : "border-blue-200 bg-blue-50 text-blue-900"
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
                          <p className="font-bold mb-2 text-slate-800">Step 1: Scan Back (QR)</p>
                          <FaydaQrScanner
                            onCodeRead={() =>
                              setScanFeedback({
                                variant: "info",
                                title: "Code detected",
                                detail: "Reading data from your Ethiopian National ID…",
                              })
                            }
                            onDecodedText={(text, file) => handleDecodedQr(text, file)}
                            onError={(msg) =>
                              setScanFeedback({
                                variant: "error",
                                title: "Could not read ID from image",
                                detail: msg,
                              })
                            }
                          />
                        </div>
                      )}

                      {scanStep === "transition" && (
                        <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in zoom-in duration-300">
                          <LogoIcon className="w-20 h-20 animate-pulse" />
                          <p className="text-blue-600 font-semibold text-lg animate-pulse text-center">Back verified.<br/>Transitioning to Front...</p>
                        </div>
                      )}

                      {scanStep === "scan_front" && (
                        <div className="animate-in slide-in-from-right-4 duration-500">
                          <p className="font-bold mb-2 text-blue-800">Step 2: Scan Front (Photo)</p>
                          <FrontIdCapture onCapture={handleFrontCapture} />
                          {/* OCR Status Panel */}
                          {ocrStatus === "scanning" && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                              <ScanSearch className="w-4 h-4 animate-pulse shrink-0" />
                              Cross-checking printed Name &amp; FIN via OCR…
                            </div>
                          )}
                          {(ocrStatus === "mismatch" || ocrStatus === "failed") && (
                            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                              <div className="flex items-start gap-2 text-amber-900">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold">Visual Mismatch Detected</p>
                                  <p className="text-xs mt-0.5 opacity-80">{ocrReason}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setOcrStatus("skipped");
                                  void triggerAutoSubmit(fullName, nationalId.replace(/\s/g, ""), fcn, sex, dateOfBirth);
                                }}
                                className="mt-2 w-full text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                              >
                                Staff Bypass — Register Anyway
                              </button>
                            </div>
                          )}
                          {ocrStatus === "verified" && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              OCR verified — {ocrReason}
                            </div>
                          )}
                        </div>
                      )}

                      {scanStep === "confirmation" && (
                        <div className="flex flex-col items-center justify-center text-center p-6 border-2 border-emerald-500 rounded-2xl bg-emerald-50 shadow-lg mt-4 animate-in zoom-in duration-500">
                          <LogoIcon className="w-16 h-16 mb-4" />
                          <h3 className="text-xl font-black text-emerald-900 tracking-tight">Identity Passport</h3>
                          <div className="mt-4 bg-white p-4 rounded-xl border border-emerald-200 w-full text-left space-y-2 shadow-inner">
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Name</p>
                              <p className="text-lg font-semibold text-slate-800">{fullName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-2">FIN</p>
                              <p className="text-lg font-mono text-slate-800">{nationalId}</p>
                            </div>
                          </div>
                          <Button 
                            type="button"
                            onClick={() => triggerAutoSubmit(fullName, nationalId.replace(/\s/g, ""), fcn, sex, dateOfBirth)}
                            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl h-12 text-lg font-bold transition-all hover:scale-[1.02]"
                          >
                            Confirm Identity
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {nidExistsError && !isVerified && (
                    <div className="text-sm text-red-600 mt-1 font-medium">
                      {nidExistsError}
                    </div>
                  )}

                  {isVerified && nationalId && (
                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-900">
                      <div className="flex items-center font-semibold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                        Verification successful
                      </div>
                      <p className="mt-1 pl-6 text-xs text-emerald-800/90">
                        Your Fayda FIN matched the Verified Registry. Name, date of birth, and sex were filled in automatically.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* No-ID manual demographics (only shown in NO_ID mode) */}
              {identityMode === "NO_ID" && (
                <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                  <div className="text-sm font-semibold text-emerald-900">
                    Manual Registration (No National ID)
                  </div>
                  <div className="text-xs text-emerald-800">
                    A unique <strong>MyHealth ID</strong> (<code className="text-emerald-900">MHID-XXXXXX</code>) will be created securely on the server when you submit.
                  </div>
                </div>
              )}

              {/* No-ID path confirmation badge */}
              {identityMode === "NO_ID" && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800 font-medium">{t.registration.noIdBadgeText}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" name="age" type="number" min="0" placeholder="Age" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">Sex</Label>
                  <Select name="sex" required value={sex} onValueChange={setSex}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={identityMode === "FAYDA" ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    disabled={identityMode === "FAYDA" && isVerified}
                    required
                  />
                </div>
                {identityMode === "FAYDA" && (
                  <div className="space-y-2">
                    <Label htmlFor="fcn">FCN (scan or type)</Label>
                    <Input
                      id="fcn"
                      name="fcn"
                      value={fcn}
                      disabled={isVerified}
                      onChange={(e) => setFcn(e.target.value.replace(/\D/g, "").slice(0, 16))}
                      placeholder="16-digit FCN (front barcode)"
                      className={isVerified ? "bg-slate-50" : ""}
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input 
                    id="phoneNumber" 
                    name="phoneNumber" 
                    type="tel" 
                    placeholder="09... (Optional)" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ''))}
                    pattern="^(09|07)\d{8}$" 
                    title="Phone number must be 10 digits starting with 09 or 07" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select name="maritalStatus">
                    <SelectTrigger><SelectValue placeholder="Select Status..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="educationalStatus">Educational Status</Label>
                  <Select name="educationalStatus">
                    <SelectTrigger><SelectValue placeholder="Select Level..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Primary">Primary</SelectItem>
                      <SelectItem value="Secondary">Secondary</SelectItem>
                      <SelectItem value="Higher Education">Higher Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input id="occupation" name="occupation" placeholder="Occupation" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="religion">Religion</Label>
                  <Input id="religion" name="religion" placeholder="Religion (Optional)" />
                </div>
              </div>
            </div>

            {/* Lock overlay — shown when Fayda path but not yet verified */}
            {identityMode === "FAYDA" && !isVerified ? (
              <div className="py-12 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-70">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-700">{t.registration.faydaVerificationRequired}</h3>
                <p className="text-slate-500 max-w-sm mt-1">{t.registration.faydaUnlockText}</p>
              </div>
            ) : isVerified ? (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-8">
                {/* 2. Address & Contact */}
                <div className="space-y-4 pt-2">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">{t.registration.addressTitle}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressRegion">Region</Label>
                  <Select name="addressRegion">
                    <SelectTrigger><SelectValue placeholder="Select Region..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Addis Ababa">Addis Ababa</SelectItem>
                      <SelectItem value="Afar">Afar</SelectItem>
                      <SelectItem value="Amhara">Amhara</SelectItem>
                      <SelectItem value="Oromia">Oromia</SelectItem>
                      <SelectItem value="Somali">Somali</SelectItem>
                      <SelectItem value="Tigray">Tigray</SelectItem>
                      <SelectItem value="Sidama">Sidama</SelectItem>
                      <SelectItem value="SWEPR">SWEPR</SelectItem>
                      <SelectItem value="Benishangul-Gumuz">Benishangul-Gumuz</SelectItem>
                      <SelectItem value="Gambela">Gambela</SelectItem>
                      <SelectItem value="Harari">Harari</SelectItem>
                      <SelectItem value="Dire Dawa">Dire Dawa</SelectItem>
                      <SelectItem value="Central Ethiopia">Central Ethiopia</SelectItem>
                      <SelectItem value="South Ethiopia">South Ethiopia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressZone">Zone</Label>
                  <Input id="addressZone" name="addressZone" placeholder="Zone / Sub-city" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressWoreda">Woreda</Label>
                  <Select name="addressWoreda">
                    <SelectTrigger><SelectValue placeholder="Select Woreda..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Woreda 01">Woreda 01</SelectItem>
                      <SelectItem value="Woreda 02">Woreda 02</SelectItem>
                      <SelectItem value="Woreda 03">Woreda 03</SelectItem>
                      <SelectItem value="Woreda 04">Woreda 04</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressKebele">Kebele</Label>
                  <Input id="addressKebele" name="addressKebele" placeholder="Kebele" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                  <Input id="emergencyContactName" name="emergencyContactName" placeholder="Full Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                  <Input id="emergencyContactPhone" name="emergencyContactPhone" placeholder="Phone Number" />
                </div>
              </div>
            </div>

            {/* 3. Reason for Visit */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">{t.registration.visitTitle}</h3>

              <ChiefComplaintPicker
                value={chiefComplaint}
                onChange={(label, item) => {
                  if (item) applyStructuredComplaint(label, item.priority);
                  else setChiefComplaint(label);
                }}
                disabled={loading}
              />

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label htmlFor="chiefComplaint">Primary Complaint / Symptoms</Label>
                  <div className="flex gap-2">
                    {suspectedDisease && <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{suspectedDisease}</span>}
                    {visitEmergency && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Emergency intake</span>}
                    {!visitEmergency && chiefComplaint && <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Routine intake</span>}
                  </div>
                </div>
                <Textarea 
                  id="chiefComplaint" 
                  name="chiefComplaint" 
                  value={chiefComplaint}
                  onChange={handleComplaintChange}
                  required 
                  placeholder="Describe the primary reason for the patient's visit..." 
                  className={`min-h-[80px] ${visitEmergency ? 'border-red-300 focus-visible:ring-red-400' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detailedSituation">Detailed Situation (Amharic / English)</Label>
                <Textarea id="detailedSituation" name="detailedSituation" placeholder="Optional background, history of present illness or other notes..." className="min-h-[100px]" />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="preExistingConditions">Pre-Existing Conditions</Label>
                  <Textarea id="preExistingConditions" name="preExistingConditions" placeholder="Any known chronic conditions (e.g., Peptic Ulcers, Diabetes, Hypertension)..." className="min-h-[60px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergyInformation">Allergies</Label>
                  <Textarea id="allergyInformation" name="allergyInformation" placeholder="Any known drug/food allergies (e.g., Penicillin, Ibuprofen)..." className="min-h-[60px]" />
                </div>
              </div>
            </div>
          </div>
          ) : null}
          </>
          )}

          </CardContent>

          <CardFooter>
            <Button className="w-full" size="lg" disabled={loading || !isVerified || !identityMode} type="submit">
              {loading ? t.registration.registering : t.registration.completeRegistration}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}