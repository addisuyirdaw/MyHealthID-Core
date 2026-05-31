"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getReadyForPharmacyPatients, dispensePrescription } from "@/lib/actions/pharmacy.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlobalPatientLookup from "@/components/GlobalPatientLookup";

const MEDICATION_MASTER_LIST = [
  { category: "Analgesics", name: "Paracetamol" },
  { category: "Analgesics", name: "Ibuprofen" },
  { category: "Analgesics", name: "Diclofenac" },
  { category: "Analgesics", name: "Tramadol" },
  { category: "Analgesics", name: "Aspirin" },
  { category: "Antibiotics", name: "Amoxicillin" },
  { category: "Antibiotics", name: "Amoxicillin + Clavulanic Acid" },
  { category: "Antibiotics", name: "Ampicillin" },
  { category: "Antibiotics", name: "Ceftriaxone" },
  { category: "Antibiotics", name: "Ciprofloxacin" },
  { category: "Antibiotics", name: "Metronidazole" },
  { category: "Antibiotics", name: "Azithromycin" },
  { category: "Antimalarials", name: "Coartem" },
  { category: "Antimalarials", name: "Artesunate" },
  { category: "Antimalarials", name: "Quinine" },
  { category: "Antimalarials", name: "Chloroquine" },
  { category: "Gastrointestinal", name: "Omeprazole" },
  { category: "Gastrointestinal", name: "Pantoprazole" },
  { category: "Gastrointestinal", name: "ORS" },
  { category: "Gastrointestinal", name: "Loperamide" },
  { category: "Antihypertensives", name: "Amlodipine" },
  { category: "Antihypertensives", name: "Enalapril" },
  { category: "Antihypertensives", name: "Nifedipine" },
  { category: "Antihypertensives", name: "Atenolol" },
  { category: "Antihypertensives", name: "Furosemide" },
  { category: "Diabetes", name: "Metformin" },
  { category: "Diabetes", name: "Glibenclamide" },
  { category: "Diabetes", name: "Regular Insulin" },
  { category: "Diabetes", name: "NPH Insulin" },
  { category: "Emergency", name: "Adrenaline" },
  { category: "Emergency", name: "Atropine" },
  { category: "Emergency", name: "Diazepam" },
  { category: "Emergency", name: "Hydrocortisone" },
];

function getRoleFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((r) => r.startsWith("userRole="));
  return match ? match.split("=")[1] : "";
}

export default function PharmacyPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);
  const [dispensing, setDispensing] = useState<string | null>(null);
  const [lookupQuery, setLookupQuery] = useState("");

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

  const normalizedQuery = lookupQuery.trim().toLowerCase();

  const selectedMedication = useMemo(
    () => MEDICATION_MASTER_LIST.find((drug) => drug.name.toLowerCase() === normalizedQuery) || null,
    [normalizedQuery]
  );

  const medicationSuggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return MEDICATION_MASTER_LIST.filter(
      (drug) =>
        drug.name.toLowerCase().includes(normalizedQuery) ||
        drug.category.toLowerCase().includes(normalizedQuery)
    ).slice(0, 8);
  }, [normalizedQuery]);

  const isCustomEntry = Boolean(normalizedQuery && !selectedMedication);

  const pendingCount = patients.reduce((sum, patient) => sum + (patient.prescriptions?.length || 0), 0);
  const emergencyCount = patients.filter(
    (patient) => patient.emergencyFlag || patient.priorityLevel === "EMERGENCY" || patient.triageStatus === "RED"
  ).length;

  const cardNumberFromPatient = (patient: any) => patient.patientCard || patient.hospitalId || patient.nationalId || patient.healthId || "—";

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
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-xl">
            <Pill className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pharmacy Portal</h1>
            <p className="text-slate-500">Receive prescriptions, verify medications, and dispense with confidence.</p>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Signed in as</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{role || "Unknown"}</p>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading pending prescriptions...</div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 opacity-60" />
          <h3 className="text-lg font-medium text-slate-900">All Caught Up!</h3>
          <p className="text-slate-500">There are no pending prescriptions to dispense at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-[0.2em]">Patients waiting</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{patients.length}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-[0.2em]">Prescriptions</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{pendingCount}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-[0.2em]">Emergency queue</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{emergencyCount}</p>
              </div>
            </div>

            <div className="space-y-4">
              {patients.map((patient) => {
                const cardNumber = cardNumberFromPatient(patient);
                const priorityLabel = patient.emergencyFlag || patient.priorityLevel === "EMERGENCY" || patient.triageStatus === "RED" ? "Emergency" : "Normal";
                const priorityClass = priorityLabel === "Emergency" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-emerald-100 text-emerald-700 border-emerald-200";
                return (
                  patient.prescriptions && patient.prescriptions.length > 0 ? (
                    <Card key={patient.id} className="border-slate-200 shadow-sm">
                      <CardHeader className="pb-3 border-b border-slate-100">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-500">{patient.fullName}</p>
                            <p className="text-xs text-slate-400">Patient ID: {patient.healthId || cardNumber}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${priorityClass}`}>
                              {priorityLabel}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                              Card {cardNumber}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        {patient.prescriptions.map((px: any) => (
                          <div key={px.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-lg font-semibold text-slate-900">{px.drugName}</p>
                                <p className="text-sm text-slate-600">{px.dosage} · {px.frequency} · {px.duration}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="rounded-full bg-slate-100 text-slate-700 border-slate-200">{px.status}</Badge>
                                {px.notes && <Badge className="rounded-full bg-amber-100 text-amber-700 border-amber-200">Notes</Badge>}
                              </div>
                            </div>
                            {px.notes && <p className="mt-3 text-sm text-slate-600">{px.notes}</p>}
                            <Button
                              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                              disabled={dispensing === px.id}
                              onClick={() => handleDispense(px.id)}
                            >
                              {dispensing === px.id ? "Dispensing..." : "Mark as Dispensed"}
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : null
                );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle>Patient History Lookup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <GlobalPatientLookup
                  onOpenPatient={role === "ADMIN" ? (patientId) => router.push(`/doctor/patient/${patientId}`) : undefined}
                />
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle>Medication Lookup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="medicationSearch" className="block text-sm font-semibold text-slate-700 mb-2">
                    Search generic medication
                  </label>
                  <input
                    id="medicationSearch"
                    type="text"
                    value={lookupQuery}
                    onChange={(event) => setLookupQuery(event.target.value)}
                    placeholder="Paracetamol, Amoxicillin, Metformin..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                {selectedMedication ? (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    <div className="font-semibold">Generic medication recognized</div>
                    <div className="mt-2 text-sm">
                      <div><span className="font-semibold">Name:</span> {selectedMedication.name}</div>
                      <div><span className="font-semibold">Category:</span> {selectedMedication.category}</div>
                    </div>
                  </div>
                ) : lookupQuery.trim() ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    <div className="font-semibold">Custom Drug Entry</div>
                    <p className="mt-1 text-sm">This medication is not in the master list and should be flagged for admin review.</p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Type a drug name to verify it against the Ethiopian medication master list.
                  </div>
                )}

                {medicationSuggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">Suggestions</p>
                    <div className="grid gap-2">
                      {medicationSuggestions.map((drug) => (
                        <button
                          key={`${drug.category}-${drug.name}`}
                          onClick={() => setLookupQuery(drug.name)}
                          className="text-left rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span>{drug.name}</span>
                            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{drug.category}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle>Smart Pharmacy Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Type any medication name to verify it against the local generic master list.</p>
                <p>If a match is found, the system auto-identifies the generic medication.</p>
                <p>Non-matching entries are allowed but flagged as <span className="font-semibold text-amber-700">Custom Drug Entry</span>.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
