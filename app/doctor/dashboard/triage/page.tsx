import { getWaitingForTriagePatients } from "@/lib/actions/patient.actions";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ListTodo, ShieldCheck, ShieldAlert, Cloud, CloudOff } from "lucide-react";
import { cookies } from "next/headers";
import { ClinicalJudgmentModal } from "@/components/ClinicalJudgmentModal";

export default async function TriageDashboardPage() {
  const roleCookie = cookies().get("userRole");
  const role = roleCookie?.value || 'DOCTOR';
  
  // Fetch only patients waiting for triage
  const patients = await getWaitingForTriagePatients();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <ListTodo className="w-8 h-8 text-indigo-700" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Triage Queue
              </h1>
            </div>
            <p className="text-slate-500 mt-2">
              Showing incoming patients awaiting clinical judgment and department assignment.
            </p>
            <p className="text-slate-500 mt-1 font-medium text-sm">
              Logged in as: <span className="text-indigo-600">{role} {!roleCookie?.value && "(Bypass Mode)"}</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 flex space-x-6 text-sm font-medium shrink-0">
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-xs">Waiting</span>
                <span className="text-lg font-bold text-slate-900">{patients.length}</span>
              </div>
            </div>
          </div>
        </header>

        {patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="bg-green-50 p-4 rounded-full mb-4">
              <ListTodo className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-xl font-medium text-slate-900">Queue is Empty</h3>
            <p className="text-slate-500 mt-2">All patients have been triaged and assigned to departments.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <tr>
                    <th className="py-4 px-6 font-semibold whitespace-nowrap">Status</th>
                    <th className="py-4 px-6 font-semibold">Patient</th>
                    <th className="py-4 px-6 font-semibold hidden md:table-cell">Identity</th>
                    <th className="py-4 px-6 font-semibold">Complaint</th>
                    <th className="py-4 px-6 font-semibold hidden sm:table-cell">Vitals</th>
                    <th className="py-4 px-6 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((patient: any) => (
                    <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors border-l-4 border-l-slate-300">
                      <td className="py-4 px-6 align-middle">
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 font-bold px-3 py-1 whitespace-nowrap">
                          Needs Triage
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
                      <td className="py-4 px-6 align-middle hidden md:table-cell">
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
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle max-w-[250px]">
                        <p className="text-sm text-slate-800 font-medium truncate">
                          {patient.chiefComplaint || "No complaint recorded"}
                        </p>
                        {patient.detailedSituation && (
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {patient.detailedSituation}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-6 align-middle hidden sm:table-cell">
                        {patient.vitals && patient.vitals.length > 0 ? (
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-medium text-slate-700">BP: {patient.vitals[0].bp}</span>
                            <span className="font-medium text-slate-700">Temp: {patient.vitals[0].temp}°C</span>
                            <span className="font-medium text-slate-700">PR: {patient.vitals[0].pulse}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None logged</span>
                        )}
                      </td>
                      <td className="py-4 px-6 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <ClinicalJudgmentModal patient={patient} />
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
