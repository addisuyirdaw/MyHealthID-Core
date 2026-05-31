"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2, LogIn } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

export function ReceptionPortal() {
  const [formData, setFormData] = useState({
    fullName: "",
    sex: "",
    dateOfBirth: "",
    phoneNumber: "",
    region: "Amhara",
    zone: "",
    woreda: "",
    kebele: "",
    reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    patientId: string;
    cardNumber: string;
    queuePosition: number;
  } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Add toast notification
  const showToast = (type: "success" | "error" | "info", title: string, message: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimeouts.current.delete(id);
    }, 5000);

    toastTimeouts.current.set(id, timeout);
  };

  // Input change handler
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calculate age from DOB
  const calculateAge = (dob: string): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 && age <= 150 ? age : null;
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      showToast("error", "Validation Error", "Full name is required");
      return false;
    }

    if (formData.fullName.trim().length < 2) {
      showToast("error", "Validation Error", "Full name must be at least 2 characters");
      return false;
    }

    if (!formData.sex) {
      showToast("error", "Validation Error", "Sex must be selected");
      return false;
    }

    if (!formData.dateOfBirth) {
      showToast("error", "Validation Error", "Date of birth is required");
      return false;
    }

    const age = calculateAge(formData.dateOfBirth);
    if (age === null) {
      showToast("error", "Validation Error", "Invalid date of birth");
      return false;
    }

    if (formData.phoneNumber.trim()) {
      const cleanPhone = formData.phoneNumber.replace(/\D/g, "");
      if (cleanPhone.length < 7) {
        showToast("error", "Validation Error", "Phone number must be at least 7 digits");
        return false;
      }
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/registration/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          sex: formData.sex,
          dateOfBirth: formData.dateOfBirth,
          phoneNumber: formData.phoneNumber.trim(),
          region: formData.region,
          zone: formData.zone.trim(),
          woreda: formData.woreda.trim(),
          kebele: formData.kebele.trim(),
          reason: formData.reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast("error", "Registration Failed", data.error || "An error occurred");
        return;
      }

      setResult({
        patientId: data.patientId,
        cardNumber: data.cardNumber,
        queuePosition: data.queuePosition,
      });
      setSubmitted(true);
      showToast("success", "Success", `Patient registered: ${data.patientId}`);

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          fullName: "",
          sex: "",
          dateOfBirth: "",
          phoneNumber: "",
          region: "Amhara",
          zone: "",
          woreda: "",
          kebele: "",
          reason: "",
        });
        setSubmitted(false);
        setResult(null);
      }, 2000);
    } catch (error: any) {
      showToast("error", "Error", error.message || "Failed to register patient");
    } finally {
      setLoading(false);
    }
  };

  // Toast Notification Display
  const ToastNotification = ({ toast }: { toast: Toast }) => (
    <div
      className={`fixed right-4 top-4 p-4 rounded-lg shadow-lg animate-slide-in mb-2 ${
        toast.type === "success"
          ? "bg-emerald-50 border border-emerald-200"
          : toast.type === "error"
            ? "bg-red-50 border border-red-200"
            : "bg-blue-50 border border-blue-200"
      }`}
    >
      <div className="flex gap-3">
        {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
        {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
        <div>
          <p className={`font-semibold ${toast.type === "success" ? "text-emerald-900" : toast.type === "error" ? "text-red-900" : "text-blue-900"}`}>
            {toast.title}
          </p>
          <p className={`text-sm ${toast.type === "success" ? "text-emerald-700" : toast.type === "error" ? "text-red-700" : "text-blue-700"}`}>
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  );

  // Success Screen
  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-emerald-200 shadow-lg">
          <CardHeader className="bg-emerald-50 border-b border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <CardTitle className="text-emerald-900">Registration Successful</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-8 pb-8 text-center">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">Patient ID</p>
                <p className="text-2xl font-bold text-slate-900">{result.patientId}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Card Number</p>
                <p className="text-3xl font-bold text-blue-600">{result.cardNumber}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Queue Position</p>
                <p className="text-lg font-semibold text-slate-900">#{result.queuePosition}</p>
              </div>
              <p className="text-xs text-slate-500 pt-4">Patient is now in the queue and waiting for triage</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 space-y-2 z-50 max-w-sm">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} />
        ))}
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <Card className="mb-6 border-blue-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3 text-white">
              <LogIn className="w-6 h-6" />
              <div>
                <CardTitle className="text-white">Reception Desk Registration</CardTitle>
                <CardDescription className="text-blue-100">
                  Quick patient intake and queue initialization
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Form Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
            <CardDescription>Enter patient details to initialize queue tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName" className="text-slate-700 font-medium">
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  placeholder="First, Middle, Last Name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  className="mt-2 border-slate-200"
                  disabled={loading}
                />
              </div>

              {/* Sex & DOB Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sex" className="text-slate-700 font-medium">
                    Sex *
                  </Label>
                  <Select value={formData.sex} onValueChange={(value) => handleInputChange("sex", value)} disabled={loading}>
                    <SelectTrigger className="mt-2 border-slate-200">
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dateOfBirth" className="text-slate-700 font-medium">
                    Date of Birth *
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className="mt-2 border-slate-200"
                    disabled={loading}
                  />
                  {formData.dateOfBirth && (
                    <p className="text-xs text-slate-500 mt-1">Age: {calculateAge(formData.dateOfBirth)} years</p>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">
                  Contact Number
                </Label>
                <Input
                  id="phoneNumber"
                  placeholder="+251 9XX XXX XXX or 9XX XXX XXX"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  className="mt-2 border-slate-200"
                  disabled={loading}
                />
              </div>

              {/* Address Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-800 mb-4">Address Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="region" className="text-slate-700 font-medium">
                      Region
                    </Label>
                    <Input
                      id="region"
                      placeholder="Region (Kilil)"
                      value={formData.region}
                      onChange={(e) => handleInputChange("region", e.target.value)}
                      className="mt-2 border-slate-200"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="zone" className="text-slate-700 font-medium">
                      Zone
                    </Label>
                    <Input
                      id="zone"
                      placeholder="Zone / Sub-city"
                      value={formData.zone}
                      onChange={(e) => handleInputChange("zone", e.target.value)}
                      className="mt-2 border-slate-200"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="woreda" className="text-slate-700 font-medium">
                      Woreda
                    </Label>
                    <Input
                      id="woreda"
                      placeholder="Woreda / District"
                      value={formData.woreda}
                      onChange={(e) => handleInputChange("woreda", e.target.value)}
                      className="mt-2 border-slate-200"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="kebele" className="text-slate-700 font-medium">
                      Kebele
                    </Label>
                    <Input
                      id="kebele"
                      placeholder="Kebele / Village"
                      value={formData.kebele}
                      onChange={(e) => handleInputChange("kebele", e.target.value)}
                      className="mt-2 border-slate-200"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Reason for Visit */}
              <div>
                <Label htmlFor="reason" className="text-slate-700 font-medium">
                  Chief Complaint / Reason for Visit
                </Label>
                <Input
                  id="reason"
                  placeholder="e.g., Routine checkup, Fever, Pain"
                  value={formData.reason}
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  className="mt-2 border-slate-200"
                  disabled={loading}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-11"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Register Patient & Initialize Queue
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">ℹ️ System Generated:</span> Patient ID and 5-digit Card Number will be automatically assigned on registration.
              The patient will be placed in the queue for triage.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
