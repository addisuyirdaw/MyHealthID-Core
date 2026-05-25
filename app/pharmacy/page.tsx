"use client";

import { useEffect, useState } from "react";
import { getReadyForPharmacyPatients, dispensePrescription } from "@/lib/actions/pharmacy.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, CheckCircle2, Clock, User, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

function getRoleFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((r) => r.startsWith("userRole="));
  return match ? match.split("=")[1] : "";
}

export default function PharmacyPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);
  const [dispensing, setDispensing] = useState<string | null>(null);

  useEffect(() => {
    const r = getRoleFromCookie();
    setRole(r);
    setAuthChecked(true);

    if (r === "PHARMACIST" || r === "ADMIN") {
      fetchPending();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const data = await getReadyForPharmacyPatients();
      setPatients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async (prescriptionId: string) => {
    setDispensing(prescriptionId);
    try {
      await dispensePrescription(prescriptionId);
      setTimeout(() => fetchPending(), 500);
    } catch {
      alert("Failed to dispense prescription");
    } finally {
      setDispensing(null);
    }
  };

  // ── Role guard: block non-PHARMACIST ────────────────────────────
  if (authChecked && role !== "PHARMACIST" && role !== "ADMIN") {
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
            The <span className="font-bold text-amber-400">Pharmacy Portal</span> is only accessible to Pharmacists.
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
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <header className="mb-8 flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-xl">
          <Pill className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pharmacy Portal</h1>
          <p className="text-slate-500">Manage pending prescriptions and dispense medication.</p>
          <p className="text-slate-500 mt-1 font-medium">
            Logged in as: <span className="text-primary font-semibold">{role}</span>
          </p>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading pending prescriptions...</div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-slate-900">All Caught Up!</h3>
          <p className="text-slate-500">There are no pending prescriptions to dispense at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {patients.map((patient) =>
            patient.prescriptions && patient.prescriptions.length > 0 && (
              <Card key={patient.id} className="border-l-4 border-l-blue-400 flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {patient.prescriptions.length} PENDING
                    </Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Ready
                    </span>
                  </div>
                  <CardTitle className="text-xl text-slate-800 flex flex-col mt-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-5 w-5 text-slate-500" />
                      {patient.fullName}
                    </div>
                    <span className="text-sm font-normal text-slate-500">
                      ID: {patient.nationalId || patient.healthId}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col gap-3">
                  {patient.prescriptions.map((px: any) => (
                    <div key={px.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 relative shadow-sm">
                      <p className="font-semibold text-slate-800 text-lg mb-1">{px.drugName}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                        <div><span className="text-slate-400 text-xs block uppercase tracking-wider font-semibold">Dosage</span>{px.dosage}</div>
                        <div><span className="text-slate-400 text-xs block uppercase tracking-wider font-semibold">Frequency</span>{px.frequency}</div>
                        <div className="col-span-2"><span className="text-slate-400 text-xs block uppercase tracking-wider font-semibold">Duration</span>{px.duration}</div>
                      </div>
                      {px.notes && (
                        <div className="mt-2 text-sm text-slate-600 bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-400 text-xs block uppercase tracking-wider font-semibold mb-1">Clinical Notes</span>
                          {px.notes}
                        </div>
                      )}
                      <Button
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        disabled={dispensing === px.id}
                        onClick={() => handleDispense(px.id)}
                      >
                        {dispensing === px.id ? "Dispensing..." : "Complete & Dispense"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
