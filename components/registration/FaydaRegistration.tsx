"use client";

import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { ScanFeedback, ScanStep, RegistrationFormData } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseFaydaScanPayload } from "@/lib/fayda-scan";
import { FrontIdCapture } from "@/components/FrontIdCapture";
import dynamic from "next/dynamic";
import { CheckCircle2, ShieldAlert, ArrowRight, Loader2 } from "lucide-react";
import { isFaydaFin12, isFaydaFcn16 } from "@/lib/fayda-format";

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

interface FaydaRegistrationProps {
  onVerified: (data: Partial<RegistrationFormData>) => void;
  onCancel: () => void;
}

export function FaydaRegistration({ onVerified, onCancel }: FaydaRegistrationProps) {
  const { t } = useLanguage();
  
  const [scanStep, setScanStep] = useState<ScanStep>("scan_back");
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>({ variant: "idle" });
  
  const [fin, setFin] = useState("");
  const [fcn, setFcn] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  const lastUploadedFile = useRef<File | null>(null);

  // Auto-fill state extracted from Fayda
  const [fullName, setFullName] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const verifyFayda = async (scannedFin: string, scannedFcn: string) => {
    setIsVerifying(true);
    setScanFeedback({ variant: "info", title: "Verifying identity", detail: "Checking registry…" });
    try {
      const res = await fetch("/api/fayda/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fin: scannedFin, fcn: scannedFcn }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Verification failed.");

      const cleanFcn = scannedFcn.replace(/\D/g, "").slice(0, 16);
      const gender = String(data.gender || "").toLowerCase();
      const resolvedSex = gender.startsWith("m") ? "Male" : gender.startsWith("f") ? "Female" : "";
      const dobIso = String(data.dateOfBirth || "");
      const dateOnly = dobIso.includes("T") ? dobIso.split("T")[0] : dobIso;
      const resolvedName = data.fullName || "";

      setFin(formatFinDigits(scannedFin));
      setFcn(cleanFcn);
      setFullName(resolvedName);
      setSex(resolvedSex);
      setDateOfBirth(dateOnly);
      
      // Move immediately to front scan (no artificial 1500ms delay)
      setScanStep("scan_front");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Verification failed.";
      setScanFeedback({ variant: "error", title: "Verification failed", detail: msg });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyManualFayda = async () => {
    const cleanFin = fin.replace(/\s/g, "");
    const cleanFcn = fcn.replace(/\s/g, "");
    
    if (cleanFin.length !== 12) {
      setScanFeedback({ variant: "error", title: "Invalid FIN", detail: "FIN must be 12 digits." });
      return;
    }
    if (cleanFcn.length !== 16) {
      setScanFeedback({ variant: "error", title: "Invalid FCN", detail: "FCN must be 16 digits." });
      return;
    }
    await verifyFayda(cleanFin, cleanFcn);
  };

  const handleDecodedQr = async (text: string, sourceFile?: File) => {
    if (sourceFile) lastUploadedFile.current = sourceFile;
    setScanFeedback({ variant: "info", title: "Code read", detail: "Extracting FIN and FCN…" });
    
    const parsed = parseFaydaScanPayload(text);
    if (!parsed) {
      setScanFeedback({
        variant: "error",
        title: "Could not parse ID data",
        detail: "Please try scanning again, or use manual entry.",
      });
      return;
    }
    
    if (parsed.kind === "pair") {
      await verifyFayda(parsed.fin, parsed.fcn);
      return;
    }
    if (parsed.kind === "fcn_only") {
      setFcn(parsed.fcn);
      setScanFeedback({ variant: "info", title: "FCN captured", detail: "Now enter the 12-digit FIN." });
      return;
    }
    if (parsed.kind === "fin_only") {
      setFin(formatFinDigits(parsed.fin));
      setScanFeedback({ variant: "info", title: "FIN captured", detail: "Now enter the 16-digit FCN." });
    }
  };

  const runOcrCrosscheck = useCallback(async (file: File) => {
    lastUploadedFile.current = file;
    setScanFeedback({ variant: "info", title: "Cross-checking printed card", detail: "Reading name and FIN via OCR…" });
    try {
      const { runFaydaOcr, matchOcrVsQr } = await import("@/lib/fayda-ocr");
      const extract = await runFaydaOcr(file);
      const matchResult = matchOcrVsQr(extract, fin.replace(/\s/g, ""), fullName);
      
      if (matchResult.match) {
        setScanFeedback({ variant: "success", title: "Identity Confirmed", detail: matchResult.reason });
        setScanStep("confirmation");
      } else {
        setScanFeedback({ variant: "error", title: "Visual Mismatch", detail: "The printed card does not match the QR data." });
      }
    } catch {
      // Graceful fallback if OCR fails — allow them to proceed anyway
      setScanFeedback({ variant: "success", title: "Identity Confirmed", detail: "OCR unavailable, proceeding with registry data." });
      setScanStep("confirmation");
    }
  }, [fin, fullName]);

  const handleFinalize = () => {
    onVerified({
      faydaId: fin.replace(/\s/g, ""),
      fcn: fcn.replace(/\s/g, ""),
      fullName,
      sex,
      dateOfBirth,
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t.registrationV2.modeFayda}</h2>
          <p className="text-sm text-slate-500">
            {scanStep === "scan_back" && t.registrationV2.faydaStepBack}
            {scanStep === "scan_front" && t.registrationV2.faydaStepFront}
            {scanStep === "confirmation" && t.registrationV2.faydaStepConfirm}
            {scanStep === "idle" && t.registrationV2.manualBypass}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500 hover:text-slate-700">
          Cancel
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="p-6 flex-1">
        {scanFeedback.variant !== "idle" && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
            scanFeedback.variant === "info" ? "bg-blue-50 border-blue-100 text-blue-800" :
            scanFeedback.variant === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
            "bg-rose-50 border-rose-100 text-rose-800"
          }`}>
            {scanFeedback.variant === "info" && <Loader2 className="w-5 h-5 mt-0.5 animate-spin" />}
            {scanFeedback.variant === "success" && <CheckCircle2 className="w-5 h-5 mt-0.5" />}
            {scanFeedback.variant === "error" && <ShieldAlert className="w-5 h-5 mt-0.5" />}
            <div>
              <p className="font-semibold text-sm">{scanFeedback.title}</p>
              {scanFeedback.detail && <p className="text-sm opacity-90 mt-1">{scanFeedback.detail}</p>}
            </div>
          </div>
        )}

        {scanStep === "scan_back" && (
          <div className="space-y-6">
            <FaydaQrScanner
              onDecodedText={handleDecodedQr}
              onManualBypass={() => setScanStep("idle")}
            />
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setScanStep("idle")}
                className="text-sm text-slate-500 hover:text-blue-600 font-medium underline underline-offset-4"
              >
                {t.registrationV2.manualBypass}
              </button>
            </div>
          </div>
        )}

        {scanStep === "scan_front" && (
          <div className="space-y-6">
            <FrontIdCapture onCapture={runOcrCrosscheck} />
            <div className="text-center">
              <button 
                type="button"
                onClick={() => {
                  setScanFeedback({ variant: "success", title: "Identity Confirmed", detail: "Front scan bypassed." });
                  setScanStep("confirmation");
                }}
                className="text-sm text-slate-500 hover:text-blue-600 font-medium underline underline-offset-4"
              >
                Skip OCR check (manual verify)
              </button>
            </div>
          </div>
        )}

        {scanStep === "idle" && (
          <div className="space-y-5">
            <div>
              <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.finLabel}</Label>
              <Input
                value={fin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setFin(formatFinDigits(val));
                }}
                placeholder={t.registrationV2.finPlaceholder}
                className="h-12 font-mono text-lg placeholder:text-slate-300"
                maxLength={14}
              />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold mb-2">{t.registrationV2.fcnLabel}</Label>
              <Input
                value={fcn}
                onChange={(e) => setFcn(e.target.value.replace(/\D/g, "").slice(0, 16))}
                placeholder={t.registrationV2.fcnPlaceholder}
                className="h-12 font-mono text-lg placeholder:text-slate-300"
                maxLength={16}
              />
            </div>
            <div className="pt-4 flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12" 
                onClick={() => setScanStep("scan_back")}
              >
                {t.registrationV2.scanBack}
              </Button>
              <Button 
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={verifyManualFayda}
                disabled={isVerifying}
              >
                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : t.registrationV2.verifyManual}
              </Button>
            </div>
          </div>
        )}

        {scanStep === "confirmation" && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">{t.registrationV2.fullNameLabel}</p>
                <p className="text-lg font-bold text-slate-900">{fullName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t.registrationV2.sexLabel}</p>
                  <p className="font-medium text-slate-900">{sex}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t.registrationV2.dobLabel}</p>
                  <p className="font-medium text-slate-900">{dateOfBirth}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-1 mt-2">
              <p className="text-sm text-center text-slate-500">
                {t.registrationV2.verifiedFrom}
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest mt-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                Fayda Sandbox Environment
              </div>
            </div>
            
            <Button 
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-base"
              onClick={handleFinalize}
            >
              Continue to Registration <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
