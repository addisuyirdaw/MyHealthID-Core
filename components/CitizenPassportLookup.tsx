"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { lookupCitizenPassport } from "@/lib/actions/verifiedCitizen.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IdCard, Search, User } from "lucide-react";

export function CitizenPassportLookup() {
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupCitizenPassport>> | null>(null);

  const run = () => {
    startTransition(async () => {
      const r = await lookupCitizenPassport(q);
      setResult(r);
    });
  };

  return (
    <Card className="border-emerald-200/80 bg-white/90 shadow-lg text-left">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <IdCard className="w-5 h-5 text-emerald-600" />
          Verified citizen lookup
        </CardTitle>
        <CardDescription>
          Enter a <strong>12-digit FIN</strong> or <strong>phone number</strong> saved at last registration. Shows identity
          passport and recent visit history (bypasses new registration when matched).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Phone or FIN…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), run())}
          />
          <Button type="button" className="h-11 shrink-0 bg-emerald-700 hover:bg-emerald-600" disabled={pending} onClick={run}>
            <Search className="w-4 h-4 mr-2" />
            Lookup
          </Button>
        </div>

        {result && !result.ok && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{result.error}</p>
        )}

        {result && result.ok && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-800 font-semibold">Identity passport</p>
                <p className="text-lg font-bold text-slate-900">{result.citizen.fullName}</p>
                <p className="text-xs font-mono text-slate-600 mt-1">
                  FIN: {result.citizen.nationalFin || "—"} · Phone key: {result.citizen.phoneDigits || "—"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">Recent visits (chief complaint)</p>
              {result.patients.length === 0 ? (
                <p className="text-sm text-slate-600">No active patient charts linked yet.</p>
              ) : (
                <ul className="space-y-2">
                  {result.patients.map((p: any) => (
                    <li key={p.id} className="text-sm border border-white/60 rounded-lg bg-white/80 px-3 py-2">
                      <div className="font-medium text-slate-900">{p.fullName}</div>
                      <div className="text-xs text-slate-500 font-mono">MHI: {p.healthId}</div>
                      <div className="text-xs text-slate-700 mt-1">
                        <span className="font-semibold text-emerald-800">Chief complaint:</span> {p.chiefComplaint || "—"}
                      </div>
                      <Link href={`/patients/${p.id}/dashboard`} className="text-xs text-blue-700 underline mt-1 inline-block">
                        Open chart →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link href="/register" className="text-xs text-slate-600 underline">
              Need a new visit? Continue to registration →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
