"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TRIAGE_LIST, type TriageComplaintItem } from "@/lib/triage/triageList";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (label: string, item: TriageComplaintItem | null) => void;
  disabled?: boolean;
};

export function ChiefComplaintPicker({ value, onChange, disabled }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return TRIAGE_LIST;
    return TRIAGE_LIST.filter((t) => t.label.toLowerCase().includes(s));
  }, [q]);

  const urgent = filtered.filter((t) => t.priority === 1).slice(0, 24);
  const standard = filtered.filter((t) => t.priority === 2).slice(0, 24);

  const select = (item: TriageComplaintItem) => {
    onChange(item.label, item);
    setQ("");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Search chief complaint (English / አማርኛ)</Label>
        <Input
          placeholder="Type to filter…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
          className="h-9"
        />
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 mb-1.5">
            Quick select — Urgent (Priority 1)
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 rounded-lg border border-red-100 bg-red-50/40">
            {urgent.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => select(item)}
                className={cn(
                  "text-left text-[10px] leading-tight px-2 py-1 rounded-md border transition-colors max-w-[200px]",
                  value === item.label
                    ? "bg-red-700 text-white border-red-800"
                    : "bg-white border-red-200 text-red-900 hover:bg-red-100"
                )}
              >
                {item.label}
              </button>
            ))}
            {urgent.length === 0 && <span className="text-xs text-slate-500 p-2">No matches.</span>}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Quick select — Standard (Priority 2)
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 rounded-lg border border-slate-200 bg-slate-50/80">
            {standard.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => select(item)}
                className={cn(
                  "text-left text-[10px] leading-tight px-2 py-1 rounded-md border transition-colors max-w-[200px]",
                  value === item.label
                    ? "bg-slate-800 text-white border-slate-900"
                    : "bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
                )}
              >
                {item.label}
              </button>
            ))}
            {standard.length === 0 && <span className="text-xs text-slate-500 p-2">No matches.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
