"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { getLiveQueueStatus } from "@/lib/actions/queue.actions";
import { Users, Loader2 } from "lucide-react";

interface QueueHandoffProps {
  patientId: string;
  priorityLevel: string;
  ward: string;
}

export function QueueHandoff({ patientId, priorityLevel, ward }: QueueHandoffProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [queueStatus, setQueueStatus] = useState<{
    inQueue: boolean;
    queuePosition?: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    async function fetchQueue() {
      try {
        const res = await getLiveQueueStatus(patientId);
        setQueueStatus(res);
      } catch (err) {
        setQueueStatus({ inQueue: false, error: "Failed to load queue." });
      } finally {
        setLoading(false);
      }
    }
    fetchQueue();
  }, [patientId]);

  // Translate Priority Level
  const getPriorityLabel = (level: string) => {
    switch (level) {
      case "EMERGENCY": return t.registrationV2.priorityEmergency;
      case "URGENT": return t.registrationV2.priorityUrgent;
      case "ROUTINE": return t.registrationV2.priorityRoutine;
      default: return level;
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 w-full">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
        <div className="flex items-center gap-2 text-slate-700">
          <Users className="w-5 h-5" />
          <span className="font-bold">{t.registrationV2.queueLabel}</span>
        </div>
        <div className="text-sm font-medium px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700">
          {ward === "OPD_OUTPATIENT" ? "OPD" : ward}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t.registrationV2.queuePosition}</p>
          {loading ? (
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin mt-1" />
          ) : queueStatus?.inQueue && queueStatus.queuePosition ? (
            <p className="text-2xl font-black text-slate-900">#{queueStatus.queuePosition}</p>
          ) : (
            <p className="text-sm font-semibold text-slate-700 mt-1">{t.registrationV2.queueAdded}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{t.registrationV2.priorityLabel}</p>
          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold border max-w-full overflow-hidden text-ellipsis whitespace-nowrap" style={{
            backgroundColor: priorityLevel === "EMERGENCY" ? "#fef2f2" : priorityLevel === "URGENT" ? "#fefce8" : "#f0fdf4",
            borderColor: priorityLevel === "EMERGENCY" ? "#fecdd3" : priorityLevel === "URGENT" ? "#fef08a" : "#bbf7d0",
            color: priorityLevel === "EMERGENCY" ? "#be123c" : priorityLevel === "URGENT" ? "#a16207" : "#15803d",
          }}>
            {getPriorityLabel(priorityLevel)}
          </div>
        </div>
      </div>
    </div>
  );
}
