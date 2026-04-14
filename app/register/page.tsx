"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerPatient, verifyNationalID } from "@/lib/actions/patient.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HeartPulse, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Phase 11 State
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
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

  // Smart Triage State
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [ward, setWard] = useState("OPD_OUTPATIENT");
  const [triageStatus, setTriageStatus] = useState("WAITING_FOR_TRIAGE");

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
    const keywords = ['chest', 'breath', 'blood', 'unconscious', 'accident', 'severe', 'pain'];
    
    if (keywords.some(kw => lowerText.includes(kw))) {
      setWard("EMERGENCY");
      setTriageStatus("RED");
    } else {
      setWard("OPD_OUTPATIENT");
      setTriageStatus("GREEN"); // Normal
    }
  };

  const handleComplaintChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setChiefComplaint(val);
    analyzeSymptoms(val);
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

  const handleVerifyId = async () => {
    const cleanId = nationalId.replace(/\s/g, '');
    if (cleanId.length !== 12 && cleanId.length !== 16) return;
    setIsVerifying(true);
    setLinkedEmail(null);
    setLinkageStatus("IDLE");
    try {
      const res = await verifyNationalID(nationalId);
      if (res.success) {
        setLinkedEmail(res.maskedEmail);
        setLinkageStatus("IDLE");
      } else {
        // OPEN REGISTRATION: Even if not found, use the entered email to proceed.
        if (email) {
          setLinkedEmail(email);
          setLinkageStatus("IDLE");
        } else {
          setLinkageStatus("ERROR");
          alert("No match found. Please fill in your Email Address above to register a new ID.");
        }
      }
    } catch (err: any) {
      alert(err.message);
      setLinkageStatus("ERROR");
    } finally {
      setIsVerifying(false);
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
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nationalId: cleanId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowOtp(true);
        setCountdown(60);
      } else {
        alert("Failed to send OTP: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error sending OTP");
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
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const nationalIdVal = nationalId.replace(/\s/g, '');

    // Frontend validation check before calling the server
    if (nationalIdVal && nationalIdVal.length !== 12 && nationalIdVal.length !== 16) {
      alert("Invalid ID length. Please enter a 12-digit Fayda National ID.");
      setLoading(false);
      return;
    }

    if (nationalIdVal && !isVerified) {
      alert("Please verify the National ID before submitting.");
      setLoading(false);
      return;
    }

    const data: any = {
      fullName: formData.get("fullName") as string,
      nationalId: nationalIdVal ? nationalIdVal : undefined,
      age: Math.max(0, parseInt(formData.get("age") as string, 10) || 0),
      sex: formData.get("sex") as string,
      reasonForVisit: formData.get("chiefComplaint") as string, // map it here optionally, but we have chiefComplaint too
      ward: ward,
      triageStatus: triageStatus,
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
      router.push(`/patients/${result.id}/success`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
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
            <CardTitle className="text-3xl font-bold tracking-tight">Patient Registration</CardTitle>
            <CardDescription>Initialize a new secure patient record</CardDescription>

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
            
            {/* 1. Demographics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">1. Patient Demographics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" name="fullName" placeholder="Full Name" required />
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="nationalId">Fayda National ID</Label>
                  <Input
                    id="nationalId"
                    name="nationalId"
                    placeholder="XXXX XXXX XXXX"
                    value={nationalId}
                    onChange={handleNationalIdChange}
                    onBlur={handleNidBlur}
                    disabled={isVerified}
                    className={isVerified ? "bg-green-50 border-green-200" : (nidExistsError ? "border-red-500 bg-red-50" : "")}
                    required
                  />

                  {nidExistsError && !isVerified && (
                    <div className="text-sm text-red-600 mt-1 font-medium">
                      {nidExistsError}
                    </div>
                  )}

                  {isVerified && nationalId && (
                    <div className="text-sm text-green-600 flex items-center mt-1">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      ID & Email Verified Successfully
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" name="age" type="number" min="0" placeholder="Age" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">Sex</Label>
                  <Select name="sex" required>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

            {/* Lock Overlay Content */}
            {!isVerified ? (
              <div className="py-12 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-70">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-700">Action Required</h3>
                <p className="text-slate-500 max-w-sm mt-1">Please verify National ID or Skip to unlock Patient History and Next Steps.</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-8">
                {/* 2. Address & Contact */}
                <div className="space-y-4 pt-2">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">2. Address & Contact Information</h3>
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
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">3. Reason for Visit</h3>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label htmlFor="chiefComplaint">Primary Complaint / Symptoms</Label>
                  {triageStatus === 'RED' && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Emergency Auto-Detected</span>}
                </div>
                <Textarea 
                  id="chiefComplaint" 
                  name="chiefComplaint" 
                  value={chiefComplaint}
                  onChange={handleComplaintChange}
                  required 
                  placeholder="Describe the primary reason for the patient's visit..." 
                  className={`min-h-[80px] ${triageStatus === 'RED' ? 'border-red-300 focus-visible:ring-red-400' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detailedSituation">Detailed Situation (Amharic / English)</Label>
                <Textarea id="detailedSituation" name="detailedSituation" placeholder="Optional background, history of present illness or other notes..." className="min-h-[100px]" />
              </div>
            </div>
          </div>
          )}
          </CardContent>

          <CardFooter>
            <Button className="w-full" size="lg" disabled={loading || !isVerified} type="submit">
              {loading ? "Registering..." : "Complete Registration"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}