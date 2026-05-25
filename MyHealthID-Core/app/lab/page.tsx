"use client";

import { useEffect, useState } from "react";
import { getPendingInvestigations } from "@/lib/actions/investigation.actions";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, CheckCircle2, Clock } from "lucide-react";
import { FulfillOrderModal } from "@/components/FulfillOrderModal";

export default function LabPage() {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("DOCTOR");
  const [isBypass, setIsBypass] = useState(false);

  useEffect(() => {
    fetchPending();
    const roleMatch = document.cookie.split('; ').find(row => row.startsWith('userRole='));
    if (roleMatch) {
      setRole(roleMatch.split('=')[1]);
    } else {
      // window.location.href = '/register';
      setRole("LAB_TECH");
      setIsBypass(true);
    }
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const data = await getPendingInvestigations();
      setInvestigations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (id: string) => {
    setInvestigations((prev) => prev.filter((inv) => inv.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <header className="mb-8 flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-xl">
          <FlaskConical className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Laboratory Portal</h1>
          <p className="text-slate-500">Manage pending investigations and enter results.</p>
          <p className="text-slate-500 mt-1 font-medium">Logged in as: <span className="text-primary">{role} {isBypass && "(Bypass Mode)"}</span></p>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading pending tests...</div>
      ) : investigations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-slate-900">All Caught Up!</h3>
          <p className="text-slate-500">There are no pending investigations at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {investigations.map((inv) => (
            <Card key={inv.id} className="border-l-4 border-l-yellow-400 flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    PENDING
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="text-xl text-slate-800">{inv.testName}</CardTitle>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{inv.category}</p>
                  {inv.department && (
                    <p className="text-sm font-medium text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                      {inv.department}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Patient Details</p>
                  <p className="font-semibold text-slate-800">{inv.patient?.fullName}</p>
                  <p className="text-xs text-slate-500 font-mono">{inv.patient?.healthId}</p>
                  <p className="text-xs text-slate-500 mt-1">Age: {inv.patient?.age} • Sex: {inv.patient?.sex}</p>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                {role === 'LAB_TECH' && (
                  <FulfillOrderModal 
                    investigationId={inv.id} 
                    testName={inv.testName} 
                    patientName={inv.patient?.fullName || "Unknown Patient"}
                    onSuccess={() => handleSuccess(inv.id)} 
                  />
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
