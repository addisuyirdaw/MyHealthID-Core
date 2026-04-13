import prisma from "@/lib/prisma";
import { Users, Clock, Activity, Send, ShieldCheck, Hospital } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Set to dynamically render on every request because it's a real-time dashboard
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [
    totalPatients,
    avgWaitData,
    pendingTriage,
    activeReferrals,
    recentVerifications
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.aggregate({ _avg: { estimatedWait: true } }),
    prisma.patient.count({ where: { triageStatus: 'WAITING_FOR_TRIAGE' } }),
    prisma.referral.count(),
    prisma.patient.findMany({
      where: { nationalId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, fullName: true, nationalId: true, createdAt: true }
    })
  ]);

  const avgWait = avgWaitData._avg.estimatedWait ? Math.round(avgWaitData._avg.estimatedWait) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Hospital className="h-8 w-8 text-primary" />
            Management Analytics
          </h1>
          <p className="text-slate-500 mt-1">Operational metrics and registry oversight.</p>
        </div>
        
        {/* Live Status Badge */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-200 font-medium text-sm shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          Connected to Fayda National Registry
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalPatients}</div>
            <p className="text-xs text-slate-500 mt-1">Registered in system</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Average Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{avgWait} <span className="text-lg font-medium text-slate-500">min</span></div>
            <p className="text-xs text-slate-500 mt-1">Estimated across queues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending Triage</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{pendingTriage}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting initial assessment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Referrals</CardTitle>
            <Send className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{activeReferrals}</div>
            <p className="text-xs text-slate-500 mt-1">Transferred or referred out</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-4">Recent Fayda Verifications</h2>
      <Card className="col-span-1 border-slate-200">
        <CardContent className="p-0">
          {recentVerifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No recent verifications found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentVerifications.map((patient) => {
                const date = new Date(patient.createdAt);
                const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateString = date.toLocaleDateString();
                // Mask the Fayda ID slightly for privacy (e.g. **** **** **12)
                const visibleId = patient.nationalId ? `**** **** **${patient.nationalId.slice(-2)}` : "Unknown";

                return (
                  <div key={patient.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-100 p-2 rounded-full">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{patient.fullName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-500 font-mono">ID: {visibleId}</p>
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 px-1 py-0 h-4">Verified</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">{timeString}</p>
                      <p className="text-xs text-slate-500">{dateString}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
