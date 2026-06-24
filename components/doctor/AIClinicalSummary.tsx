"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Brain,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Pill,
  FlaskConical,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AIClinicalSummaryProps {
  patientId: string;
}

type SectionKey = "alerts" | "medications" | "labs" | "notes";

interface ParsedSections {
  alerts: string;
  medications: string;
  labs: string;
  notes: string;
  raw: string;
}

const SECTION_HEADERS: Record<SectionKey, string[]> = {
  alerts: ["## 🚨 Safety Alerts & Allergies", "## Safety Alerts"],
  medications: ["## 💊 Active Medications & Adherence", "## Active Medications"],
  labs: ["## 🔬 Lab Results & Vitals Trends", "## Lab Results"],
  notes: ["## 📋 Clinical Notes & Timeline Summary", "## Clinical Notes"],
};

function parseSections(rawText: string): ParsedSections {
  const result: ParsedSections = { alerts: "", medications: "", labs: "", notes: "", raw: rawText };

  // Find positions of each section header
  const sectionPositions: { key: SectionKey; index: number }[] = [];
  for (const [key, headers] of Object.entries(SECTION_HEADERS) as [SectionKey, string[]][]) {
    for (const header of headers) {
      const idx = rawText.indexOf(header);
      if (idx !== -1) {
        sectionPositions.push({ key, index: idx });
        break;
      }
    }
  }

  // Sort by position so we can extract content between boundaries
  sectionPositions.sort((a, b) => a.index - b.index);

  for (let i = 0; i < sectionPositions.length; i++) {
    const { key, index } = sectionPositions[i];
    const nextIndex = sectionPositions[i + 1]?.index ?? rawText.length;
    const sectionText = rawText.slice(index, nextIndex).trim();
    // Remove the header line itself
    const lines = sectionText.split("\n");
    result[key] = lines.slice(1).join("\n").trim();
  }

  return result;
}

function SectionCard({
  icon,
  title,
  content,
  colorClass,
  borderClass,
  iconBgClass,
  isLoading,
  isActive,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  colorClass: string;
  borderClass: string;
  iconBgClass: string;
  isLoading: boolean;
  isActive: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const lines = content
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => l.replace(/^-\s*/, "").trim());

  return (
    <div
      className={`rounded-2xl border ${borderClass} bg-neutral-900/70 overflow-hidden transition-all duration-300`}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-800/30 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${iconBgClass} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <span className={`font-bold text-sm ${colorClass}`}>{title}</span>
          {isLoading && isActive && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Streaming…
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-neutral-600" />
        ) : (
          <ChevronUp className="w-4 h-4 text-neutral-600" />
        )}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 pt-1 space-y-2">
          {lines.length === 0 ? (
            <p className="text-neutral-600 text-sm italic">
              {isLoading ? "Analyzing…" : "No data available."}
            </p>
          ) : (
            lines.map((line, i) => {
              const isWarning = line.startsWith("⚠️");
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ${
                    isWarning
                      ? "bg-red-950/50 border border-red-500/20 text-red-300"
                      : "bg-neutral-800/40 text-neutral-300"
                  }`}
                >
                  <span className="shrink-0 mt-0.5 text-neutral-600">•</span>
                  <span
                    className="leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: line
                        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                        .replace(/`(.+?)`/g, "<code class='bg-neutral-700 px-1 rounded text-xs'>$1</code>"),
                    }}
                  />
                </div>
              );
            })
          )}
          {/* Typing cursor during active stream */}
          {isLoading && isActive && content && (
            <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse rounded" />
          )}
        </div>
      )}
    </div>
  );
}

export function AIClinicalSummary({ patientId }: AIClinicalSummaryProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [sections, setSections] = useState<ParsedSections>({ alerts: "", medications: "", labs: "", notes: "", raw: "" });
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey>("alerts");
  const abortRef = useRef<AbortController | null>(null);

  // Reset when patient changes
  useEffect(() => {
    setStatus("idle");
    setSections({ alerts: "", medications: "", labs: "", notes: "", raw: "" });
    setError("");
    abortRef.current?.abort();
  }, [patientId]);

  const analyze = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError("");
    setSections({ alerts: "", medications: "", labs: "", notes: "", raw: "" });
    setActiveSection("alerts");

    try {
      const res = await fetch("/api/ai/patient-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("Access denied. Clinical role required.");
        throw new Error(`Server error: ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        const parsed = parseSections(fullText);
        setSections(parsed);

        // Track which section is currently being written
        if (parsed.notes) setActiveSection("notes");
        else if (parsed.labs) setActiveSection("labs");
        else if (parsed.medications) setActiveSection("medications");
        else if (parsed.alerts) setActiveSection("alerts");
      }

      setStatus("done");
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError(err?.message ?? "Unexpected error occurred.");
      setStatus("error");
    }
  }, [patientId]);

  return (
    <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-slate-950/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-500/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-white text-base">AI Clinical Assistant</h3>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-2.5 h-2.5" /> Gemini
              </span>
            </div>
            <p className="text-xs text-indigo-400/70">
              Grounded analysis — based exclusively on this patient's database records
            </p>
          </div>
        </div>

        {/* Action button */}
        {status === "idle" || status === "error" ? (
          <button
            id="ai-analyze-btn"
            onClick={analyze}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-900/40"
          >
            <Brain className="w-4 h-4" />
            Analyze History
          </button>
        ) : status === "loading" ? (
          <div className="flex items-center gap-2 bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 font-semibold px-5 py-2.5 rounded-xl text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing…
          </div>
        ) : (
          <button
            id="ai-refresh-btn"
            onClick={analyze}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-analyze
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Idle state */}
        {status === "idle" && (
          <div className="text-center py-10">
            <Brain className="w-12 h-12 text-indigo-800 mx-auto mb-3" />
            <p className="text-neutral-500 font-medium">Click <strong className="text-indigo-400">Analyze History</strong> to generate a grounded AI summary.</p>
            <p className="text-neutral-600 text-xs mt-1">The AI reads directly from this patient's hospital records — no hallucination.</p>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-950/30 px-5 py-4">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-300 text-sm">Analysis Failed</p>
              <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Streaming / Done state */}
        {(status === "loading" || status === "done") && (
          <div className="space-y-4">
            <SectionCard
              icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
              title="Safety Alerts & Allergies"
              content={sections.alerts}
              colorClass="text-red-300"
              borderClass="border-red-500/20"
              iconBgClass="bg-red-900/40"
              isLoading={status === "loading"}
              isActive={activeSection === "alerts"}
            />
            <SectionCard
              icon={<Pill className="w-4 h-4 text-sky-400" />}
              title="Active Medications & Adherence"
              content={sections.medications}
              colorClass="text-sky-300"
              borderClass="border-sky-500/20"
              iconBgClass="bg-sky-900/40"
              isLoading={status === "loading"}
              isActive={activeSection === "medications"}
            />
            <SectionCard
              icon={<FlaskConical className="w-4 h-4 text-emerald-400" />}
              title="Lab Results & Vitals Trends"
              content={sections.labs}
              colorClass="text-emerald-300"
              borderClass="border-emerald-500/20"
              iconBgClass="bg-emerald-900/40"
              isLoading={status === "loading"}
              isActive={activeSection === "labs"}
            />
            <SectionCard
              icon={<FileText className="w-4 h-4 text-violet-400" />}
              title="Clinical Notes & Timeline"
              content={sections.notes}
              colorClass="text-violet-300"
              borderClass="border-violet-500/20"
              iconBgClass="bg-violet-900/40"
              isLoading={status === "loading"}
              isActive={activeSection === "notes"}
            />

            {status === "done" && (
              <p className="text-center text-xs text-neutral-600 pt-1">
                ✅ Analysis complete — grounded on real patient data only.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
