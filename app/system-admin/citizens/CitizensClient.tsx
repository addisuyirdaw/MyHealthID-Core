"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, User, FileText, Phone, Activity, AlertTriangle, MapPin } from "lucide-react";

export default function CitizensClient({ citizens }: { citizens: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = citizens.filter((c: any) =>
    (c.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.faydaId || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Citizens Directory</h1>
          </div>
          <p className="text-neutral-400 text-sm">
            View basic demographic data for platform users. Clinical data is strictly protected.
          </p>
        </div>
      </div>

      {/* DEMO MODE WARNING */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-amber-400 font-bold text-sm">Demo Mode Active</h3>
          <p className="text-amber-200/70 text-xs mt-1 leading-relaxed">
            In a real production environment, IT Administrators cannot see patient clinical records. 
            For the purposes of this pitch demo, a "View Record" button has been enabled to easily demonstrate the patient timeline without needing to log out.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or Fayda ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950/50 border border-neutral-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="text-sm font-medium text-neutral-500 bg-neutral-950/50 px-4 py-2.5 rounded-xl border border-neutral-800/60">
          Total Citizens: <span className="text-white">{citizens.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800/60 bg-neutral-950/50">
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Citizen</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Fayda ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-right">Demo Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-neutral-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400">
                        {c.fullName ? c.fullName.charAt(0) : "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors">
                          {c.fullName || "Unknown Name"}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {c.sex || "Unknown"} • {c.age ? `${c.age} yrs` : "N/A"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/20">
                      {c.faydaId || c.id.substring(0, 8)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-neutral-400 text-xs">
                      <MapPin className="w-3.5 h-3.5" />
                      {c.address 
                        ? (typeof c.address === 'string' 
                            ? c.address 
                            : [c.address.region, c.address.zone].filter(Boolean).join(", ") || "Unknown Location") 
                        : "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/system-admin/citizens/${c.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/20 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      View Record
                    </Link>
                  </td>
                </tr>
              ))}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 text-sm">
                    No citizens found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
