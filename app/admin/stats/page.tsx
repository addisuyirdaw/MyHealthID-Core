import React from "react";
import { getHospitalStats, getLiveActivity, getTriageHeatmap } from "@/lib/actions/admin.actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Users, ShieldAlert, BarChart3, TrendingUp, AlertTriangle, ArrowRightCircle } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminStatsPage() {
  const [stats, activities, heatmap] = await Promise.all([
    getHospitalStats(),
    getLiveActivity(),
    getTriageHeatmap()
  ]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 lg:p-16">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl shadow-sm">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hospital Director Dashboard</h1>
            <p className="text-slate-500 font-medium mt-1">Real-time performance and capacity metrics for today.</p>
          </div>
        </div>
        <div className="hidden sm:flex text-sm text-slate-500 items-center gap-2 font-medium bg-white px-4 py-2 rounded-full border border-slate-200">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Updating
        </div>
      </header>

      {/* PERFORMANCE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="border-none shadow-sm ring-1 ring-slate-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Total Patients Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-900">{stats.totalPatientsToday}</div>
            <p className="text-sm font-medium text-emerald-600 mt-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> Operations Normal
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Average Wait Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-900">{stats.avgWaitMinutes} <span className="text-xl text-slate-500 font-medium">min</span></div>
            <p className="text-sm font-medium text-slate-500 mt-2">
              From check-in to consultation
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm ring-1 ring-slate-200/50 bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Ward Saturation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.wardSaturation.length === 0 ? (
              <p className="text-indigo-200 italic mt-2">No active wards</p>
            ) : (
              <div className="space-y-3 mt-2">
                {stats.wardSaturation.map((w: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm font-medium">
                    <span className="truncate pr-4">{w.ward.replace(/_/g, ' ')}</span>
                    <Badge variant="outline" className="bg-white/10 border-white/20 text-white shrink-0">
                      {w.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LIVE ACTIVITY MAP */}
        <div className="lg:col-span-2">
          <Card className="h-full border-none shadow-md">
            <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl pb-4">
              <CardTitle className="text-xl flex items-center gap-2 text-slate-800">
                <Activity className="w-5 h-5 text-indigo-500" /> Live Activity Feed
              </CardTitle>
              <CardDescription>
                The last 10 actions taken across the entire hospital system.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {activities.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No recent activity found.</div>
                ) : (
                  activities.map((act: any, idx: number) => (
                    <div key={idx} className="p-5 flex gap-4 hover:bg-slate-50 transition-colors">
                      <div className="mt-1">
                        <ArrowRightCircle className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                          <h4 className="font-bold text-slate-900">{act.title}</h4>
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{act.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TRIAGE HEATMAP */}
        <div>
          <Card className="h-full border-none shadow-md">
            <CardHeader className="bg-rose-50 border-b border-rose-100 rounded-t-xl pb-4">
              <CardTitle className="text-xl flex items-center gap-2 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Triage Heatmap
              </CardTitle>
              <CardDescription className="text-rose-700/70">
                Today's most common complaints.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {heatmap.length === 0 ? (
                <div className="text-center text-slate-400 py-8 italic">No specific complaint patterns detected today.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {heatmap.map((item: any, idx: number) => {
                    // Calculate visual intensity based on rank/count
                    const intensity = idx === 0 ? 'bg-rose-600 text-white border-rose-700' :
                                      idx === 1 ? 'bg-rose-500 text-white border-rose-600' :
                                      idx === 2 ? 'bg-rose-400 text-white border-rose-500' :
                                      'bg-rose-100 text-rose-800 border-rose-200';
                    const size = idx === 0 ? 'text-lg px-4 py-2' :
                                 idx < 3 ? 'text-base px-3 py-1.5' :
                                 'text-sm px-2.5 py-1';

                    return (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className={`${intensity} ${size} font-bold shadow-sm transition-all hover:scale-105 inline-flex gap-1.5`}
                      >
                        {item.keyword}
                        <span className="opacity-80 font-normal">({item.count})</span>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
