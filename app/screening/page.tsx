"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePatientIdByIdentifier } from "@/lib/actions/screening.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Languages, ShieldAlert } from "lucide-react";

function getRoleFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((r) => r.startsWith("userRole="));
  return match ? match.split("=")[1] : "";
}

export default function ScreeningEntryPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "am">("en");
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [role, setRole] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const r = getRoleFromCookie();
    setRole(r);
    setAuthChecked(true);
  }, []);

  const t = (en: string, am: string) => (lang === "am" ? am : en);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await resolvePatientIdByIdentifier(id.trim());
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.push(`/screening/${res.patient.id}`);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      setErr(
        t(
          `Lookup failed (${msg}). Check your connection or try another ID format.`,
          `ፍለጋ አልተሳካም። አገልግሎት ወይም መታወቂያ ይፈትሹ።`
        )
      );
    } finally {
      setLoading(false);
    }
  };

  if (authChecked && role !== "NURSE" && role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl text-center max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center ring-8 ring-amber-500/5">
              <ShieldAlert className="w-10 h-10 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Access Restricted</h2>
          <p className="text-slate-400 text-sm mb-2">
            The <span className="font-bold text-teal-400">Triage Screening Portal</span> is only accessible to Nurses.
          </p>
          {role && (
            <p className="text-xs text-slate-500 mb-6">
              Your current role:{" "}
              <span className="font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                {role}
              </span>
            </p>
          )}
          <Button
            className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-11 border border-slate-700"
            onClick={() => window.history.back()}
          >
            ← Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-white">{t("Triage screening portal", "የምርመራ ፖርታል")}</CardTitle>
            <CardDescription className="text-slate-400">
              {t("Enter Health ID, Fayda ID, or internal patient ID.", "Health ID፣ ፋይዳ ወይም የታካሚ መታወቂያ ያስገቡ።")}
            </CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" className="border-slate-600 shrink-0" onClick={() => setLang((l) => (l === "en" ? "am" : "en"))}>
            <Languages className="w-4 h-4 mr-1" />
            {lang === "en" ? "አማርኛ" : "EN"}
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={go} className="space-y-4">
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={t("e.g. MHI-… or patient UUID", "ምሳሌ MHI-…")}
              className="bg-slate-950 border-slate-700 text-white h-12"
              required
            />
            {err && <p className="text-sm text-rose-400">{err}</p>}
            <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 h-11" disabled={loading}>
              {loading ? t("Looking up…", "በመፈለግ…") : t("Continue", "ቀጥል")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
