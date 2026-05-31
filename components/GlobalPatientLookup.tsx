"use client";

import React, { useState, useTransition } from "react";
import { Search, ExternalLink, Hospital, Clock, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchPatientMasterRecord } from "@/lib/actions/patient.actions";

type GlobalPatientLookupProps = {
  onOpenPatient?: (patientId: string) => void;
};

function formatPatientId(patient: any) {
  return patient.healthId || patient.faydaId || patient.nationalId || patient.hospitalId || patient.internalId || "Unknown";
}

function getSummaryValue(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function formatUpdatedAt(raw?: string | null) {
  if (!raw) return "Unknown";
  return new Date(raw).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GlobalPatientLookup({ onOpenPatient }: GlobalPatientLookupProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const scan = query.trim();
    setHasSearched(true);
    if (scan.length < 2) {
      setResults([]);
      setMessage("Enter at least 2 characters to lookup a patient.");
      return;
    }

    startTransition(async () => {
      try {
        const matches = await searchPatientMasterRecord(scan);
        setResults(matches || []);
        if (!matches || matches.length === 0) {
          setMessage("No patient history found across facilities for this query.");
        } else {
          setMessage(null);
        }
      } catch (error) {
        console.error("Global patient lookup failed", error);
        setResults([]);
        setMessage("Lookup failed. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search by Health ID, FIN, NID, name, or card number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Searching..." : "Lookup patient history"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery("");
              setResults([]);
              setMessage(null);
              setHasSearched(false);
            }}
          >
            Clear
          </Button>
        </div>
      </form>

      {hasSearched && !isPending && message ? (
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {message}
        </div>
      ) : null}

      <div className="space-y-4">
        {results.map((patient) => {
          const latestVital = patient.vitals?.[0];
          const latestInvestigation = patient.investigations?.[0];
          const latestPrescription = patient.prescriptions?.[0];
          return (
            <div key={patient.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">{patient.fullName || "Unnamed patient"}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="font-mono text-slate-700">{formatPatientId(patient)}</span>
                    {patient.organizationId ? (
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200">{patient.organizationId}</Badge>
                    ) : null}
                    {patient.status ? (
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200">{patient.status}</Badge>
                    ) : null}
                    {patient.ward ? (
                      <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">{patient.ward.replace(/_/g, " ")}</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {getSummaryValue(patient.sex)} • {getSummaryValue(patient.age)} yrs
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Updated {formatUpdatedAt(patient.updatedAt)}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-3">
                    <Hospital className="w-3.5 h-3.5" /> Patient summary
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div>
                      <p className="text-slate-500">Chief complaint</p>
                      <p>{patient.chiefComplaint || patient.clinicalExam?.chiefAssessment || "Not recorded"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Last clinic note</p>
                      <p>{patient.clinicalExam?.progressNotes || patient.detailedSituation || "None"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Facility</p>
                      <p>{patient.facilityName || patient.organizationId || "Unknown"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold mb-3">
                    <Clock className="w-3.5 h-3.5" /> Latest activity
                  </div>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div>
                      <p className="text-slate-500">Vitals</p>
                      <p>{latestVital ? `${latestVital.bp || "—"}, ${latestVital.temp ?? "—"}°C, ${latestVital.pulse ?? "—"} bpm` : "No vitals recorded"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Investigation</p>
                      <p>{latestInvestigation ? latestInvestigation.testName || latestInvestigation.type || "Unknown" : "None"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Prescription</p>
                      <p>{latestPrescription ? latestPrescription.drugName : "None"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 bg-slate-100 p-4">
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {patient.nationalId ? <Badge className="bg-slate-100 text-slate-700 border-slate-200">NID {patient.nationalId}</Badge> : null}
                  {patient.faydaId ? <Badge className="bg-slate-100 text-slate-700 border-slate-200">FIN {patient.faydaId}</Badge> : null}
                  {patient.healthId ? <Badge className="bg-slate-100 text-slate-700 border-slate-200">MHID {patient.healthId}</Badge> : null}
                </div>
                {onOpenPatient ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenPatient(patient.id)}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Open full record
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
