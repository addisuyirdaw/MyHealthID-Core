"use client";

import { useEffect, useState } from "react";
import { getReadyForPharmacyPatients, dispensePrescription } from "@/lib/actions/pharmacy.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, CheckCircle2, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PharmacyPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("PHARMACIST");
  const [isBypass, setIsBypass] = useState(false);
  const [dispensing, setDispensing] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
    const roleMatch = document.cookie.split('; ').find(row => row.startsWith('userRole='));
    if (roleMatch) {
      setRole(roleMatch.split('=')[1]);
    } else {
      setRole("PHARMACIST");
      setIsBypass(true);
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
      setTimeout(() => {
        fetchPending();
      }, 500);
    } catch (e) {
      alert("Failed to dispense prescription");
    } finally {
      setDispensing(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <header className="mb-8 flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-xl">
          <Pill className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pharmacy Portal</h1>
          <p className="text-slate-500">Manage pending prescriptions and dispense medication.</p>
          <p className="text-slate-500 mt-1 font-medium">Logged in as: <span className="text-primary">{role} {isBypass && "(Bypass Mode)"}</span></p>
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
          {patients.map((patient) => (
            patient.prescriptions && patient.prescriptions.length > 0 && (
              <Card key={patient.id} className="border-l-4 border-l-blue-400 flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                     <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {patient.prescriptions.length} PENDING
                     </Badge>
                     <span className="text-xs text-slate-400 flex items-center gap-1">
                       <Clock className="h-3 w-3" />
                       Ready
                     </span>
                  </div>
                  <CardTitle className="text-xl text-slate-800 flex flex-col mt-0">
                     <div className="flex items-center gap-2 mb-1">
                        <User className="h-5 w-5 text-slate-500" />
                        {patient.fullName}
                     </div>
                     <span className="text-sm font-normal text-slate-500">ID: {patient.nationalId || patient.healthId}</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
