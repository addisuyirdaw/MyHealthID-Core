"use client";

import { useState } from "react";
import { registerPatient } from "@/lib/actions/patient.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HeartPulse, CheckCircle2, RotateCcw } from "lucide-react";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const nationalId = formData.get("nationalId") as string;

    // Frontend validation check before calling the server
    if (nationalId && nationalId.length !== 16 && nationalId.length !== 12) {
      alert("Invalid ID length. Please enter a 16-digit FCN or 12-digit FIN.");
      setLoading(false);
      return;
    }

    const data: any = {
      fullName: formData.get("fullName") as string,
      nationalId: nationalId,
      age: parseInt(formData.get("age") as string, 10) || 0,
      sex: formData.get("sex") as string,
      reasonForVisit: formData.get("chiefComplaint") as string, // map it here optionally, but we have chiefComplaint too
      ward: formData.get("ward") as string,
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
      setSuccessId(result.healthId);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Registration failed. Check if the National ID is already registered.");
    } finally {
      setLoading(false);
    }
  }

  if (successId) {
    return (
      <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-3xl" />
        <Card className="w-full max-w-lg border-white/50 bg-white/70 backdrop-blur-xl shadow-2xl relative z-10 text-center py-10">
          <CardContent className="flex flex-col items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Success!</h2>
              <p className="text-slate-500 mt-2">Patient registered successfully.</p>
            </div>
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 w-full mt-4">
              <p className="text-sm font-medium text-slate-500 mb-1">Generated Health ID</p>
              <p className="text-3xl font-mono font-bold text-primary">{successId}</p>
            </div>
            <Button onClick={() => setSuccessId(null)} className="mt-4 w-full" variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Register Another Patient
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
                  <Label htmlFor="nationalId">National ID</Label>
                  <Input
                    id="nationalId"
                    name="nationalId"
                    placeholder="16-digit FCN or 12-digit FIN (Optional)"
                    maxLength={16}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, "");
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" name="age" type="number" placeholder="Age" required />
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
                  <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="09... (Optional)" />
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

            {/* 2. Address & Contact */}
            <div className="space-y-4 pt-4">
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

            {/* 3. Clinical & Triage Info */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">3. Initial Clinical Information</h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ward">Ward / Assigned Location</Label>
                  <Select name="ward" required>
                    <SelectTrigger><SelectValue placeholder="Select Ward..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPD_OUTPATIENT">OPD / Outpatient</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency</SelectItem>
                      <SelectItem value="MEDICAL_WARD">Medical Ward</SelectItem>
                      <SelectItem value="SURGICAL_WARD">Surgical Ward</SelectItem>
                      <SelectItem value="MATERNITY_WARD">Maternity Ward</SelectItem>
                      <SelectItem value="GYNECOLOGY">Gynecology</SelectItem>
                      <SelectItem value="PEDIATRIC_WARD">Pediatric Ward</SelectItem>
                      <SelectItem value="NEWBORN_NEONATAL">Newborn / Neonatal</SelectItem>
                      <SelectItem value="INPATIENT_GENERAL_WARD">Inpatient / General Ward</SelectItem>
                      <SelectItem value="LABORATORY">Laboratory</SelectItem>
                      <SelectItem value="PHARMACY">Pharmacy</SelectItem>
                      <SelectItem value="PROCEDURE_MINOR_OPERATION">Procedure / Minor Operation</SelectItem>
                      <SelectItem value="ISOLATION">Isolation</SelectItem>
                      <SelectItem value="SUPPORT_UNITS">Support Units</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bp">Blood Pressure</Label>
                  <Input id="bp" name="bp" placeholder="120/80" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pulse">Pulse (bpm)</Label>
                  <Input id="pulse" name="pulse" type="number" placeholder="bpm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temp">Temp (°C)</Label>
                  <Input id="temp" name="temp" type="number" step="0.1" placeholder="°C" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spO2">SpO2 (%)</Label>
                  <Input id="spO2" name="spO2" type="number" placeholder="%" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                <Textarea id="chiefComplaint" name="chiefComplaint" required placeholder="Describe the primary reason for the patient's visit..." className="min-h-[80px]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detailedSituation">Detailed Situation (Amharic / English)</Label>
                <Textarea id="detailedSituation" name="detailedSituation" placeholder="Optional background, history of present illness or other notes..." className="min-h-[100px]" />
              </div>
            </div>

          </CardContent>

          <CardFooter>
            <Button className="w-full" size="lg" disabled={loading} type="submit">
              {loading ? "Registering..." : "Complete Registration"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}