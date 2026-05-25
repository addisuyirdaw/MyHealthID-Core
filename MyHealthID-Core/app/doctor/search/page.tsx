import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, AlertCircle } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicActivityChart } from "@/components/ClinicActivityChart";

export default async function DoctorSearchPage({ searchParams }: { searchParams: { query?: string } }) {
  const query = searchParams.query?.trim();

  let patient = null;
  let searched = false;

  if (query) {
    searched = true;
    patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { healthId: query },
          { nationalId: query }
        ]
      }
    });

    // Auto-Redirect directly to the doctor's view if a match is successfully found
    if (patient) {
      redirect(`/doctor/patient/${patient.id}`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row p-4 md:p-8 justify-center items-start pt-[10vh]">
      <Card className="w-full max-w-lg shadow-xl border-slate-200 bg-white">
        <form action="/doctor/search" method="GET">
          <CardHeader className="text-center pb-6 border-b border-slate-100">
            <div className="mx-auto bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
              <Search className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Patient Lookup Portal</CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              Scan or enter the patient's Fayda National ID or System Health ID to securely access their active medical record.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8 pb-4 space-y-4">
            <div className="space-y-2">
              <Input 
                name="query" 
                defaultValue={query}
                autoFocus
                className="text-lg py-6 text-center font-mono placeholder:font-sans" 
                placeholder="Enter ID here..." 
                required 
              />
            </div>
            
            {searched && !patient && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3 border border-red-100 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">No patient found matching "{query}". Please verify the code and try again.</p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md">
              Search Database
            </Button>
            <Link href="/doctor/dashboard" className="w-full">
              <Button type="button" variant="ghost" className="w-full text-slate-500 hover:text-slate-800">
                Cancel & Return to Queue
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>

      {/* Analytics Component */}
      <div className="w-full max-w-lg mt-8 hidden md:block animate-in fade-in duration-700">
        <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2 px-2">Weekly Clinic Activity</h4>
        <Card className="shadow-lg border-slate-200 bg-white/60 backdrop-blur-sm p-4">
          <ClinicActivityChart />
        </Card>
      </div>
    </div>
  );
}
