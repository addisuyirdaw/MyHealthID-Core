"use client";

import React, { useState } from "react";
import { Activity, Pill, FlaskConical, Calendar, HeartPulse, ShieldAlert } from "lucide-react";

interface VitalsEntry {
  bp: string;
  pulse: number;
  rr: number;
  temp: number;
  spO2: number;
  bmi?: number | null;
  painLevel?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  createdAt: string;
}

interface MedsEntry {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string | null;
  createdAt: string;
}

interface LabEntry {
  testName: string;
  result: string;
  completedAt: string | null;
  facilityName: string;
  priority: string;
}

interface ReferralSummaryTabsProps {
  clinicalSnapshot: {
    vitals: VitalsEntry[];
    activeMeds: MedsEntry[];
    certifiedLabs: LabEntry[];
  };
}

export default function ReferralSummaryTabs({ clinicalSnapshot }: ReferralSummaryTabsProps) {
  const [activeTab, setActiveTab] = useState<"vitals" | "meds" | "labs">("vitals");

  const { vitals = [], activeMeds = [], certifiedLabs = [] } = clinicalSnapshot || {};

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
      {/* Tabs Header */}
      <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-2">
        <button
          onClick={() => setActiveTab("vitals")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
            activeTab === "vitals"
              ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-extrabold"
              : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/40 border border-transparent"
          }`}
        >
          <Activity className="w-4 h-4" />
          Vitals History ({vitals.length})
        </button>
        <button
          onClick={() => setActiveTab("meds")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
            activeTab === "meds"
              ? "bg-amber-600/15 text-amber-400 border border-amber-500/30 font-extrabold"
              : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/40 border border-transparent"
          }`}
        >
          <Pill className="w-4 h-4" />
          Active Medications ({activeMeds.length})
        </button>
        <button
          onClick={() => setActiveTab("labs")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
            activeTab === "labs"
              ? "bg-cyan-600/15 text-cyan-400 border border-cyan-500/30 font-extrabold"
              : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/40 border border-transparent"
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          Diagnostic Labs ({certifiedLabs.length})
        </button>
      </div>

      {/* Tabs Content */}
      <div className="p-6 min-h-[320px]">
        {/* VITALS TAB */}
        {activeTab === "vitals" && (
          <div className="space-y-6 animate-fade-in">
            {vitals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-neutral-500 gap-2">
                <HeartPulse className="w-12 h-12 opacity-25 text-neutral-400" />
                <p className="text-sm font-medium">No recorded vitals found</p>
              </div>
            ) : (
              <div className="relative border-l border-neutral-800 pl-6 ml-3 space-y-6">
                {vitals.map((entry, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle Node */}
                    <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-neutral-900 border border-blue-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    </div>

                    <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-2xl p-5 hover:border-neutral-700/60 transition-all">
                      <div className="flex justify-between items-center flex-wrap gap-2 mb-4 border-b border-neutral-800/60 pb-3">
                        <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/10">
                          Reading #{vitals.length - idx}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateTime(entry.createdAt)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800/40 text-center">
                          <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">BP</p>
                          <p className="text-lg font-black font-mono text-neutral-200 mt-1">{entry.bp}</p>
                          <p className="text-[9px] text-neutral-500 mt-0.5">mmHg</p>
                        </div>
                        <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800/40 text-center">
                          <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Pulse</p>
                          <p className="text-lg font-black font-mono text-neutral-200 mt-1">{entry.pulse}</p>
                          <p className="text-[9px] text-neutral-500 mt-0.5">bpm</p>
                        </div>
                        <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800/40 text-center">
                          <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">Temp</p>
                          <p className="text-lg font-black font-mono text-neutral-200 mt-1">{entry.temp}°C</p>
                          <p className="text-[9px] text-neutral-500 mt-0.5">Celsius</p>
                        </div>
                        <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800/40 text-center">
                          <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">SpO₂</p>
                          <p className="text-lg font-black font-mono text-neutral-200 mt-1">{entry.spO2}%</p>
                          <p className="text-[9px] text-neutral-500 mt-0.5">Oxygen</p>
                        </div>
                      </div>

                      {/* Secondary metrics */}
                      {(entry.weightKg || entry.heightCm || entry.bmi || entry.rr) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-neutral-800/40">
                          {entry.rr && (
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase font-semibold">Resp. Rate:</span>
                              <span className="text-xs font-bold text-neutral-300 font-mono ml-1.5">{entry.rr} rpm</span>
                            </div>
                          )}
                          {entry.weightKg && (
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase font-semibold">Weight:</span>
                              <span className="text-xs font-bold text-neutral-300 font-mono ml-1.5">{entry.weightKg} kg</span>
                            </div>
                          )}
                          {entry.heightCm && (
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase font-semibold">Height:</span>
                              <span className="text-xs font-bold text-neutral-300 font-mono ml-1.5">{entry.heightCm} cm</span>
                            </div>
                          )}
                          {entry.bmi && (
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase font-semibold">BMI:</span>
                              <span className="text-xs font-bold text-neutral-300 font-mono ml-1.5">{entry.bmi}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE MEDS TAB */}
        {activeTab === "meds" && (
          <div className="space-y-4 animate-fade-in">
            {activeMeds.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-neutral-500 gap-2">
                <Pill className="w-12 h-12 opacity-25 text-neutral-400" />
                <p className="text-sm font-medium">No active medications prescribed</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {activeMeds.map((med, idx) => (
                  <div
                    key={idx}
                    className="bg-neutral-950/40 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700/60 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <h4 className="font-bold text-base text-amber-400">{med.drugName}</h4>
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">
                          Active Presc
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs border-b border-neutral-900 pb-3 mb-3">
                        <div>
                          <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Dosage</p>
                          <p className="text-neutral-300 font-medium mt-0.5">{med.dosage}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Frequency</p>
                          <p className="text-neutral-300 font-medium mt-0.5">{med.frequency}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Duration</p>
                          <p className="text-neutral-300 font-medium mt-0.5">{med.duration}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Prescribed</p>
                          <p className="text-neutral-400 font-mono mt-0.5 text-[10px]">{formatDateTime(med.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {med.notes && (
                      <div className="bg-neutral-900/40 p-3 rounded-lg border border-neutral-900 text-xs text-neutral-400 leading-relaxed">
                        <span className="font-semibold text-neutral-300 block mb-0.5">Instructions:</span>
                        {med.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DIAGNOSTIC LABS TAB */}
        {activeTab === "labs" && (
          <div className="space-y-4 animate-fade-in">
            {certifiedLabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-neutral-500 gap-2">
                <FlaskConical className="w-12 h-12 opacity-25 text-neutral-400" />
                <p className="text-sm font-medium">No diagnostic lab results found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {certifiedLabs.map((lab, idx) => (
                  <div
                    key={idx}
                    className="bg-neutral-950/40 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700/60 transition-all"
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                      <div>
                        <h4 className="font-bold text-base text-white">{lab.testName}</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-1.5">
                          <span>🔬 Verified Facility:</span>
                          <span className="font-semibold text-neutral-400">{lab.facilityName}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {lab.priority === "URGENT" && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-950/40 border border-red-500/30 px-2 py-0.5 rounded-full">
                            <ShieldAlert className="w-3 h-3" /> Urgent
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/15">
                          Certified Result
                        </span>
                      </div>
                    </div>

                    <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800/40 mt-4">
                      <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-wider">Diagnostic Result / Findings</p>
                      <pre className="text-xs font-mono text-neutral-200 mt-2 whitespace-pre-wrap leading-relaxed font-sans">
                        {lab.result}
                      </pre>
                    </div>

                    <div className="flex justify-end mt-4 text-[10px] text-neutral-500 font-mono">
                      Completed: {formatDateTime(lab.completedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
