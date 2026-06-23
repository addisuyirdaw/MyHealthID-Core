"use client";

import React, { useState, useEffect, useTransition, useDeferredValue, useMemo } from "react";
import {
  HeartPulse,
  Stethoscope,
  FlaskConical,
  Pill,
  FileText,
  Search,
  Filter,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { getPatientHealthTimeline, type TimelineEvent } from "@/lib/actions/timeline.actions";

interface PatientTimelineProps {
  patientId: string;
}

const TYPE_CONFIG = {
  VITALS: {
    label: "Vitals",
    color: "text-blue-400 border-blue-500/35 bg-blue-500/10",
    badgeColor: "bg-blue-900/50 text-blue-300 border-blue-500/30",
    icon: HeartPulse,
    dotColor: "bg-blue-500"
  },
  EXAMINATION: {
    label: "Examination",
    color: "text-emerald-400 border-emerald-500/35 bg-emerald-500/10",
    badgeColor: "bg-emerald-900/50 text-emerald-300 border-emerald-500/30",
    icon: Stethoscope,
    dotColor: "bg-emerald-500"
  },
  DIAGNOSTIC: {
    label: "Diagnostic",
    color: "text-purple-400 border-purple-500/35 bg-purple-500/10",
    badgeColor: "bg-purple-900/50 text-purple-300 border-purple-500/30",
    icon: FlaskConical,
    dotColor: "bg-purple-500"
  },
  PRESCRIPTION: {
    label: "Prescription",
    color: "text-amber-400 border-amber-500/35 bg-amber-500/10",
    badgeColor: "bg-amber-900/50 text-amber-300 border-amber-500/30",
    icon: Pill,
    dotColor: "bg-amber-500"
  },
  RECORD: {
    label: "Medical Record",
    color: "text-indigo-400 border-indigo-500/35 bg-indigo-500/10",
    badgeColor: "bg-indigo-900/50 text-indigo-300 border-indigo-500/30",
    icon: FileText,
    dotColor: "bg-indigo-500"
  }
};

export function PatientTimeline({ patientId }: PatientTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [rawSearchText, setRawSearchText] = useState("");
  const [isPending, startTransition] = useTransition();

  // Collapsed Encounter Dates state
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

  const deferredSearch = useDeferredValue(rawSearchText.trim().toLowerCase());

  // 1. Fetch patient timeline from the polymorphic query layer
  const loadTimeline = () => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      try {
        const data = await getPatientHealthTimeline(patientId);
        setEvents(data);
      } catch (err: any) {
        setError(err.message ?? "Failed to retrieve clinical timeline logs.");
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    loadTimeline();
  }, [patientId]);

  // 2. Client-side filtration & search logic
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Category filter
      const matchesCategory =
        activeCategories.length === 0 || activeCategories.includes(e.type);

      // Search term match (checks title, clinician, descriptions, medications, diagnoses, and results)
      const matchesSearch =
        !deferredSearch ||
        e.title.toLowerCase().includes(deferredSearch) ||
        e.clinicianName.toLowerCase().includes(deferredSearch) ||
        (e.metadata?.summary && e.metadata.summary.toLowerCase().includes(deferredSearch)) ||
        (e.metadata?.clinicalNotes && e.metadata.clinicalNotes.toLowerCase().includes(deferredSearch)) ||
        (e.metadata?.provisionalDiagnosis && e.metadata.provisionalDiagnosis.toLowerCase().includes(deferredSearch)) ||
        (e.metadata?.medicationName && e.metadata.medicationName.toLowerCase().includes(deferredSearch)) ||
        (e.metadata?.result && e.metadata.result.toLowerCase().includes(deferredSearch)) ||
        (e.metadata?.recordType && e.metadata.recordType.toLowerCase().includes(deferredSearch));

      return matchesCategory && matchesSearch;
    });
  }, [events, activeCategories, deferredSearch]);

  // 3. Group filtered events by Calendar Date (YYYY-MM-DD)
  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    filteredEvents.forEach((event) => {
      const dateKey = event.date.split("T")[0]; // "YYYY-MM-DD"
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    return groups;
  }, [filteredEvents]);

  // Sorting date keys descending
  const sortedDates = useMemo(() => {
    return Object.keys(groupedEvents).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedEvents]);

  // Toggle single date group collapse status
  const toggleDateGroup = (dateKey: string) => {
    setCollapsedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  // Toggle filter categories
  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Clear all filters
  const resetFilters = () => {
    setActiveCategories([]);
    setRawSearchText("");
  };

  return (
    <div className="w-full bg-[#121212] border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden text-neutral-100">
      
      {/* ── Background accents ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[35%] h-[50%] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[35%] h-[50%] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-neutral-850 pb-5 relative z-10">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Longitudinal Health Timeline
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Chronological log of triage vitals, examinations, diagnostic results, and prescriptions.
          </p>
        </div>

        <button
          onClick={loadTimeline}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800 hover:text-white transition text-xs font-semibold text-neutral-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload Logs
        </button>
      </div>

      {/* ── Filter Matrix Panel ── */}
      <div className="space-y-4 mb-6 relative z-10 bg-neutral-900/40 border border-neutral-850/80 p-4 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Filter Clinical Events
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((type) => {
            const conf = TYPE_CONFIG[type];
            const isActive = activeCategories.includes(type);
            const Icon = conf.icon;
            return (
              <button
                key={type}
                onClick={() => toggleCategory(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  isActive
                    ? "bg-neutral-800 border-neutral-600 text-white shadow-md shadow-black/10"
                    : "bg-neutral-900/30 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${conf.dotColor}`} />
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {conf.label}
              </button>
            );
          })}

          {(activeCategories.length > 0 || rawSearchText) && (
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition px-2.5 py-1.5"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search matching diagnosis, drug names, doctors, vitals..."
            value={rawSearchText}
            onChange={(e) => setRawSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-neutral-950/80 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
          />
        </div>
      </div>

      {/* ── Loading Overlay ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Clock className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs text-neutral-500 font-semibold animate-pulse">
            Loading longitudinal health history...
          </p>
        </div>
      )}

      {/* ── Error State ── */}
      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/20 text-red-300 rounded-xl p-4 my-8">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Query Failure</p>
            <p className="text-xs text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* ── Timeline Track List ── */}
      {!loading && !error && (
        <div className="relative z-10">
          {sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/10">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-neutral-600" />
              </div>
              <p className="text-sm font-bold text-neutral-400">No timeline events found</p>
              <p className="text-xs text-neutral-600 mt-1.5 max-w-xs">
                No history entries match your filter configuration. Try adjusting search queries.
              </p>
            </div>
          ) : (
            <div className="relative pl-4 sm:pl-6 border-l-2 border-neutral-800 space-y-8 ml-2">
              
              {/* Chronological spine track wrapper */}
              {sortedDates.map((dateKey) => {
                const dayEvents = groupedEvents[dateKey];
                const isCollapsed = collapsedDates[dateKey] ?? false;

                // Formatted display date (e.g. "June 22, 2026")
                const displayDate = new Date(dateKey).toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                });

                return (
                  <div key={dateKey} className="relative group">
                    
                    {/* Node marker on the spine */}
                    <div className="absolute -left-[25px] sm:-left-[33px] top-1 w-[18px] h-[18px] rounded-full border-2 border-neutral-800 bg-neutral-950 flex items-center justify-center group-hover:border-blue-500 transition-colors z-20">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:bg-blue-400 transition-colors" />
                    </div>

                    {/* Date Block Header */}
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <button
                        onClick={() => toggleDateGroup(dateKey)}
                        className="flex items-center gap-2 group/btn focus:outline-none"
                      >
                        <h4 className="text-sm font-bold text-white group-hover/btn:text-blue-400 transition-colors">
                          {displayDate}
                        </h4>
                        <span className="text-[10px] font-bold bg-neutral-800 border border-neutral-700/60 text-neutral-400 px-2 py-0.5 rounded-md">
                          {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                        </span>
                        {isCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
                        )}
                      </button>
                    </div>

                    {/* Events inside this calendar day */}
                    {!isCollapsed && (
                      <div className="space-y-4">
                        {dayEvents.map((event) => {
                          const conf = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.RECORD;
                          const EventIcon = conf.icon;

                          return (
                            <div
                              key={event.id}
                              className="bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700/80 rounded-xl p-4 transition-all duration-200 hover:bg-neutral-900 flex flex-col md:flex-row gap-4 justify-between items-start"
                            >
                              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                {/* Type icon indicator */}
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 mt-0.5 ${conf.color}`}>
                                  <EventIcon className="w-4 h-4" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  {/* Title & Metadata badges */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="text-sm font-bold text-white truncate">
                                      {event.title}
                                    </h5>
                                    <span className="text-[9px] font-bold bg-neutral-800 border border-neutral-750 text-neutral-400 px-1.5 py-0.5 rounded-md">
                                      {new Date(event.date).toLocaleTimeString(undefined, {
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </span>
                                    <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-md ${conf.badgeColor}`}>
                                      {conf.label}
                                    </span>
                                  </div>

                                  {/* Main Description */}
                                  <p className="text-xs text-neutral-300 mt-2 leading-relaxed whitespace-pre-line">
                                    {event.description}
                                  </p>

                                  {/* Render Category-Specific details (Polymorphic details metadata) */}
                                  {event.type === "VITALS" && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-neutral-800/60 text-[10px] font-mono">
                                      {event.metadata.bmi && (
                                        <div className="bg-neutral-950/40 px-2 py-1 rounded border border-neutral-850">
                                          <span className="text-neutral-500">BMI:</span> <span className="text-blue-400 font-bold">{event.metadata.bmi}</span>
                                        </div>
                                      )}
                                      {event.metadata.weightKg && (
                                        <div className="bg-neutral-950/40 px-2 py-1 rounded border border-neutral-850">
                                          <span className="text-neutral-500">Weight:</span> <span className="text-blue-400 font-bold">{event.metadata.weightKg} kg</span>
                                        </div>
                                      )}
                                      {event.metadata.heightCm && (
                                        <div className="bg-neutral-950/40 px-2 py-1 rounded border border-neutral-850">
                                          <span className="text-neutral-500">Height:</span> <span className="text-blue-400 font-bold">{event.metadata.heightCm} cm</span>
                                        </div>
                                      )}
                                      {event.metadata.painLevel !== undefined && (
                                        <div className="bg-neutral-950/40 px-2 py-1 rounded border border-neutral-850">
                                          <span className="text-neutral-500">Pain Level:</span> <span className="text-blue-400 font-bold">{event.metadata.painLevel}/10</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {event.type === "EXAMINATION" && event.metadata.systems && (
                                    <div className="mt-3 pt-3 border-t border-neutral-800/60">
                                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                        System Inspection Notes
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-neutral-450 leading-relaxed font-medium">
                                        {Object.entries(event.metadata.systems)
                                          .filter(([_, val]) => val)
                                          .map(([key, val]) => (
                                            <div key={key} className="bg-neutral-950/20 px-2 py-1 rounded border border-neutral-850/40">
                                              <span className="capitalize text-neutral-500">{key.replace(/([A-Z])/g, " $1")}:</span>{" "}
                                              <span className="text-neutral-300 font-medium">{val as string}</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  {event.type === "DIAGNOSTIC" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-neutral-800/60 text-[10px] font-mono">
                                      <div className="bg-neutral-950/40 px-2.5 py-1 rounded border border-neutral-850">
                                        <span className="text-neutral-500">Order ID:</span> <span className="text-purple-400 font-bold">{event.metadata.orderNumber.slice(0, 8)}...</span>
                                      </div>
                                      <div className="bg-neutral-950/40 px-2.5 py-1 rounded border border-neutral-850">
                                        <span className="text-neutral-500">Priority:</span> <span className="text-purple-400 font-bold">{event.metadata.priority || "ROUTINE"}</span>
                                      </div>
                                      {event.metadata.clinicalIndication && (
                                        <div className="col-span-1 sm:col-span-2 bg-neutral-950/40 px-2.5 py-1.5 rounded border border-neutral-850 text-neutral-400 text-[10px] leading-relaxed">
                                          <span className="text-neutral-500 font-bold uppercase tracking-wider block mb-1">Clinical Indication:</span>
                                          {event.metadata.clinicalIndication}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Clinician metadata column */}
                              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2.5 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-850/60 text-[10px] text-neutral-500">
                                <div className="flex items-center gap-1.5 bg-neutral-800/30 border border-neutral-800 px-2.5 py-1 rounded-full">
                                  <User className="w-3 h-3 text-neutral-500 shrink-0" />
                                  <span className="font-semibold text-neutral-450">{event.clinicianName}</span>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                );
              })}

            </div>
          )}
        </div>
      )}

    </div>
  );
}
