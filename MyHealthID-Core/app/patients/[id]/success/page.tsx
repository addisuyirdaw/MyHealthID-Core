import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, QrCode, Home } from "lucide-react";
import { PatientQR } from "@/components/PatientQR";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function SuccessPage({ params }: { params: { id: string } }) {
  // Fetch the Patient record using the id from the URL
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [
        { id: params.id },
        { healthId: params.id }
      ]
    }
  });

  if (!patient) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-green-500/10 blur-3xl" />
      
      {/* Digital ID Card container with green border and white background */}
      <Card className="w-full max-w-md border-green-500 bg-white shadow-2xl relative z-10 text-center py-8">
        <CardHeader className="flex flex-col items-center pb-2">
          <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Registration Complete</CardTitle>
          <CardDescription className="text-slate-500">Patient securely added to registry</CardDescription>

          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 mt-4 px-3 py-1 space-x-1.5 shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Profile</span>
          </Badge>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center gap-6 pt-4">
          <div className="text-center w-full">
            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Digital Health Passport</p>
            <h2 className="text-2xl font-bold text-slate-800">{patient.fullName}</h2>
            {patient.nationalId && (
              <p className="text-sm text-slate-500 mt-1">Fayda ID: <span className="font-mono text-slate-700">{patient.nationalId}</span></p>
            )}
          </div>
          
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm inline-block">
            <PatientQR value={patient.healthId} size={160} />
          </div>

          <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 w-full text-center">
            <p className="text-xs font-semibold text-green-600/80 mb-1 uppercase tracking-wider">System Health ID</p>
            {/* Display the ETH-MH-XXXXXX Health ID prominently */}
            <p className="text-3xl font-mono font-bold text-green-700 tracking-widest">{patient.healthId}</p>
          </div>
          
          <div className="w-full space-y-3 mt-4">
            <Link href={`/patients/${patient.id}/dashboard`} className="block w-full">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                View Live Queue & Dashboard
              </Button>
            </Link>
            <Link href="/register" className="block w-full">
              <Button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-sm border border-slate-200">
                <Home className="w-4 h-4 mr-2" />
                New Registration
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
