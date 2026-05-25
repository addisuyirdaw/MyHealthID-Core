"use client";

import { useEffect, useState, useCallback } from "react";
import { getLiveQueueStatus } from "@/lib/actions/queue.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function LiveQueueStatus({ patientId }: { patientId: string }) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("--:--");
  const [progress, setProgress] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getLiveQueueStatus(patientId);
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds for immediate status sync with Doctor Command Center
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (!status || !status.inQueue) return;

    // Calculate target time = checkInTime + estimatedWait minutes
    const checkInMs = new Date(status.checkInTime).getTime();
    const waitMs = status.estimatedWait * 60 * 1000;
    const targetMs = checkInMs + waitMs;

    const tick = () => {
      const nowMs = Date.now();
      const diffStr = targetMs - nowMs;

      if (diffStr <= 0) {
        setTimeLeftStr("00:00:00");
        setProgress(100);
        return;
      }

      // Calculate progress percentage
      const totalWaitDuration = waitMs || 1000; // avoid divide by 0
      const elapsed = nowMs - checkInMs;
      let currProgress = (elapsed / totalWaitDuration) * 100;
      if (currProgress > 100) currProgress = 100;
      if (currProgress < 0) currProgress = 0;
      
      setProgress(currProgress);

      const hours = Math.floor(diffStr / (1000 * 60 * 60));
      const mins = Math.floor((diffStr % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffStr % (1000 * 60)) / 1000);

      const hStr = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : "";
      const mStr = mins.toString().padStart(2, '0');
      const sStr = secs.toString().padStart(2, '0');

      setTimeLeftStr(`${hStr}${mStr}:${sStr}`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [status]);

  if (loading) {
    return (
      <Card className="animate-pulse bg-slate-50 border-slate-200">
        <CardContent className="h-24"></CardContent>
      </Card>
    );
  }

  if (!status || !status.inQueue) {
    return null; // Don't show anything if not in queue
  }

  // Adaptive UI based on sync status
  if (status.status === "IN_PROGRESS") {
    return (
      <Card className="border-4 border-indigo-500 shadow-xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[200%] bg-indigo-500/10 blur-[100px] rounded-full point-events-none" />
        <CardContent className="p-10 text-center relative z-10">
          <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-pulse ring-4 ring-indigo-500">
            <Users className="w-10 h-10 text-indigo-300" />
          </div>
          <h2 className="text-3xl font-black mb-3">The Doctor is ready for you!</h2>
          <p className="text-indigo-200 text-xl font-medium">Please proceed to the consultation room.</p>
        </CardContent>
      </Card>
    );
  }

  if (status.status === "COMPLETED") {
    return (
      <Card className="border-4 border-indigo-500 shadow-xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[200%] bg-indigo-500/10 blur-[100px] rounded-full point-events-none" />
        <CardContent className="p-10 text-center relative z-10">
          <div className="mx-auto w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-indigo-300" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-white">Consultation Finished.</h2>
          <p className="text-indigo-200 text-lg">Please check your dashboard for prescriptions or lab orders.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-4 border-indigo-500 shadow-xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white overflow-hidden relative">
      {/* Decorative background blur */}
      <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[200%] bg-indigo-500/10 blur-[100px] rounded-full point-events-none" />
      
      <CardHeader className="pb-2 border-b border-indigo-800/50">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-indigo-100">
          <Clock className="w-5 h-5 text-indigo-400" />
          Live Queue Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Position & Wait */}
          <div className="flex flex-col items-center justify-center bg-black/30 rounded-2xl p-6 border border-white/10 backdrop-blur-sm">
            <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> Position in Line
            </p>
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">
              #{status.queuePosition}
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="flex flex-col justify-center space-y-4">
            <div>
              <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-1 flex items-center gap-2">
                <Timer className="w-4 h-4" /> Estimated Wait
              </p>
              <div className="text-4xl font-bold font-mono tracking-wider tabular-nums text-yellow-400">
                {timeLeftStr}
              </div>
              <p className="text-xs text-indigo-300 mt-1">Please be ready at the doctor's door.</p>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-indigo-200">
                <span>Checked In</span>
                <span>Doctor's Room</span>
              </div>
              <Progress value={progress} className="h-3 bg-indigo-950" />
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
