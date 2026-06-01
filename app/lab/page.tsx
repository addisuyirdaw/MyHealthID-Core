"use client";

import { useEffect, useState } from "react";
import { getPendingInvestigations } from "@/lib/actions/investigation.actions";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { FulfillOrderModal } from "@/components/FulfillOrderModal";
import { Button } from "@/components/ui/button";
import { ADMIN_ROLES, LAB_ROLES } from "@/lib/locales/enums";

function getRoleFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((r) => r.startsWith("userRole="));
  return match ? match.split("=")[1] : "";
}

export default function LabPage() {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const r = getRoleFromCookie();
    setRole(r);
    setAuthChecked(true);

    if (LAB_ROLES.includes(r as any) || ADMIN_ROLES.includes(r as any)) {
      fetchPending();
    } else {
      setLoading(false);
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

  // ── Role guard: block non-LAB_TECH ──────────────────────────
  if (authChecked && !LAB_ROLES.includes(role as any) && !ADMIN_ROLES.includes(role as any)) {
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
            The <span className="font-bold text-cyan-400">Laboratory Portal</span> is only accessible to Lab Technicians.
          </p>
          {role && (
            <p className="text-xs text-slate-500 mb-6">
              Your current role: <span className="font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">{role}</span>
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
          <FlaskConical className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Laboratory Portal</h1>
          <p className="text-slate-500">Manage pending investigations and enter results.</p>
          <p className="text-slate-500 mt-1 font-medium">
            Logged in as: <span className="text-primary font-semibold">{role}</span>
          </p>
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
                {role === "LAB_TECH" && (
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
