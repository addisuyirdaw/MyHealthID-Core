import { getPatientsByWard, searchPatients } from "@/lib/actions/patient.actions";
import { Ward, TriageStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Activity, Clock, MapPin, User, AlertTriangle, CheckCircle2, TestTubeDiagonal, ShieldCheck, ShieldAlert, Cloud, CloudOff, FileQuestion, Pill, Plus, ClipboardList, BellRing, Send } from "lucide-react";
import { OrderTestModal } from "@/components/OrderTestModal";
import { AddVitalsModal } from "@/components/AddVitalsModal";
import { PrescribeModal } from "@/components/PrescribeModal";
import { ClinicalExamModal } from "@/components/ClinicalExamModal";
import { ReferModal } from "@/components/ReferModal";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { ward?: string; search?: string };
}) {
  const currentWard = (searchParams.ward as Ward) || "OPD_OUTPATIENT";
  const searchQuery = searchParams.search || "";
  const roleCookie = cookies().get("userRole");
  // if (!roleCookie || !roleCookie.value) {
  //   redirect("/register");
  // }
  const role = roleCookie?.value || 'DOCTOR';
  
  // List of all available wards to build the sidebar filter
  const wards = [
    { id: "OPD_OUTPATIENT", name: "OPD / Outpatient" },
    { id: "EMERGENCY", name: "Emergency" },
    { id: "MEDICAL_WARD", name: "Medical Ward" },
    { id: "SURGICAL_WARD", name: "Surgical Ward" },
    { id: "MATERNITY_WARD", name: "Maternity Ward" },
    { id: "GYNECOLOGY", name: "Gynecology" },
    { id: "PEDIATRIC_WARD", name: "Pediatric Ward" },
    { id: "NEWBORN_NEONATAL", name: "Newborn / Neonatal" },
    { id: "INPATIENT_GENERAL_WARD", name: "Inpatient / General Ward" },
    { id: "LABORATORY", name: "Laboratory" },
    { id: "PHARMACY", name: "Pharmacy" },
    { id: "PROCEDURE_MINOR_OPERATION", name: "Procedure / Minor Operation" },
    { id: "ISOLATION", name: "Isolation" },
    { id: "SUPPORT_UNITS", name: "Support Units" },
  ];

  // Fetch patients for the selected ward or search query
  const patients = searchQuery 
    ? await searchPatients(searchQuery)
    : await getPatientsByWard(currentWard);

  const getTriageColor = (status: string) => {
    switch (status) {
      case "RED":
        return "bg-red-100 text-red-800 border-red-300";
      case "YELLOW":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "GREEN":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar: Department Filter */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Activity className="h-6 w-6" />
          <h2 className="text-xl font-bold tracking-tight">Departments</h2>
        </div>
        <nav className="flex flex-col gap-2">
          {wards.map((ward) => (
            <Link
              key={ward.id}
              href={`?ward=${ward.id}`}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentWard === ward.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {ward.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content: Patient Queue */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {searchQuery ? "Search Results" : `${currentWard.replace(/_/g, " ")} Queue`}
            </h1>
            <p className="text-slate-500 mt-1">
              {searchQuery ? `Searching for: "${searchQuery}"` : "Showing active patients prioritizing emergency cases."}
            </p>
            <p className="text-slate-500 mt-1 font-medium">
              Logged in as: <span className="text-primary">{role} {!roleCookie?.value && "(Bypass Mode)"}</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <form method="GET" action="/doctor/dashboard" className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                name="search"
                type="text"
                placeholder="Search NID or HealthID..."
                defaultValue={searchQuery}
                className="w-full sm:w-64 bg-white"
              />
              {currentWard && !searchQuery && <input type="hidden" name="ward" value={currentWard} />}
              <Button type="submit" variant="secondary">Search</Button>
              {searchQuery && (
                <Link href="/doctor/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 ml-2 shrink-0">Clear</Link>
              )}
            </form>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex space-x-4 text-sm font-medium shrink-0">
              <span className="flex items-center gap-1 text-red-600"><div className="w-3 h-3 rounded-full bg-red-500"></div> Critical</span>
              <span className="flex items-center gap-1 text-yellow-600"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Urgent</span>
              <span className="flex items-center gap-1 text-green-600"><div className="w-3 h-3 rounded-full bg-green-500"></div> Standard</span>
            </div>
          </div>
        </header>

        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <AlertTriangle className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No Patients Found</h3>
            <p className="text-slate-500">There are currently no patients assigned to this ward.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <tr>
                    <th className="py-4 px-6 font-semibold whitespace-nowrap">Triage</th>
                    <th className="py-4 px-6 font-semibold">Patient</th>
                    <th className="py-4 px-6 font-semibold">Status Badges</th>
                    <th className="py-4 px-6 font-semibold">Vitals Summary</th>
                    <th className="py-4 px-6 font-semibold">Labs & Meds</th>
                    <th className="py-4 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((patient: any) => (
                    <tr key={patient.id} className={`hover:bg-slate-50/50 transition-colors border-l-4 ${
                      patient.triageStatus === 'RED' ? 'border-l-red-500' : 
                      patient.triageStatus === 'YELLOW' ? 'border-l-yellow-400' : 'border-l-green-500'
                    }`}>
                      <td className="py-4 px-6 align-middle">
                        <Badge variant="outline" className={`${getTriageColor(patient.triageStatus)} font-bold px-3 py-1 whitespace-nowrap`}>
                          {patient.triageStatus}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="font-bold text-slate-900">{patient.fullName}</div>
                        <div className="text-xs text-slate-500 font-mono mt-1">
                          {patient.nationalId ? patient.nationalId : patient.healthId}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {patient.age} y/o • {patient.sex}
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="flex flex-col gap-2 items-start">
                          {patient.nationalId ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <ShieldCheck className="w-3 h-3 mr-1"/> Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <ShieldAlert className="w-3 h-3 mr-1"/> Temporary
                            </Badge>
                          )}
                          {patient.isSynced ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Cloud className="w-3 h-3 mr-1"/> Synced
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                              <CloudOff className="w-3 h-3 mr-1"/> Local
                            </Badge>
                          )}
                          {patient.examStatus === 'EXAMINATION_COMPLETE' && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              <ClipboardList className="w-3 h-3 mr-1"/> Examined
                            </Badge>
                          )}
                          {patient.examStatus === 'RESULT_READY' && (
                            <Badge variant="outline" className="bg-orange-500 text-white border-orange-600 font-bold animate-pulse shadow-sm">
                              <BellRing className="w-3 h-3 mr-1"/> Result Ready
                            </Badge>
                          )}
                          {patient.status === 'REFERRED_OUT' && (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold shadow-sm">
                              <Send className="w-3 h-3 mr-1"/> Referred Out
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        {patient.vitals && patient.vitals.length > 0 ? (
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-medium text-slate-700">BP: {patient.vitals[0].bp}</span>
                            <span className="font-medium text-slate-700">Temp: {patient.vitals[0].temp}°C</span>
                            <span className="font-medium text-slate-700">PR: {patient.vitals[0].pulse} bpm</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No vitals yet</span>
                        )}
                      </td>
                      <td className="py-4 px-6 align-middle">
                        {patient.investigations && patient.investigations.length > 0 && (
                          <div className="flex flex-col gap-2 max-w-xs mb-2">
                            {patient.investigations.map((inv: any) => (
                              <div key={inv.id} className="text-xs bg-slate-50 p-2 rounded-md border border-slate-100">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-semibold text-slate-700">{inv.testName}</span>
                                  {inv.status === "COMPLETED" ? (
                                    <Badge variant="outline" className="text-[10px] h-4 text-green-700 bg-green-50 px-1 border-green-200">Completed</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] h-4 text-amber-700 bg-amber-50 px-1 border-amber-200 italic">Pending</Badge>
                                  )}
                                </div>
                                {inv.status === "COMPLETED" && inv.result && (
                                  <div className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                                    <span className="font-semibold">Result: </span>
                                    {inv.result}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {patient.prescriptions && patient.prescriptions.length > 0 && (
                          <div className="flex flex-col gap-2 max-w-xs">
                            {patient.prescriptions.map((script: any) => (
                              <div key={script.id} className="text-xs bg-indigo-50 p-2 rounded-md border border-indigo-100">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-semibold text-indigo-900">{script.medication}</span>
                                  {script.status === "DISPENSED" ? (
                                    <Badge variant="outline" className="text-[10px] h-4 text-green-700 bg-green-50 px-1 border-green-200">Dispensed</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] h-4 text-amber-700 bg-amber-50 px-1 border-amber-200 italic">Pending</Badge>
                                  )}
                                </div>
                                <div className="text-indigo-700 mt-1 whitespace-pre-wrap leading-relaxed">
                                  <span className="font-semibold">Dosage: </span>
                                  {script.dosage}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {(!patient.investigations || patient.investigations.length === 0) && (!patient.prescriptions || patient.prescriptions.length === 0) && (
                          <span className="text-xs text-slate-400 italic">No tests or meds ordered</span>
                        )}
                      </td>
                      <td className="py-4 px-6 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          {role === 'DOCTOR' && (
                            <>
                              <ClinicalExamModal patientId={patient.id} patientName={patient.fullName} />
                              <AddVitalsModal patientId={patient.id} patientName={patient.fullName} />
                              <OrderTestModal patientId={patient.id} patientName={patient.fullName} />
                              <PrescribeModal patientId={patient.id} patientName={patient.fullName} patientAllergies={patient.allergyInformation} />
                              <ReferModal patientId={patient.id} patientName={patient.fullName} />
                            </>
                          )}
                          {role === 'LAB_TECH' && (
                            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm">
                              <TestTubeDiagonal className="w-4 h-4 mr-1"/> Add Lab Result
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
