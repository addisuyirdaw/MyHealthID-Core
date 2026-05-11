"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePatientIdByIdentifier } from "@/lib/actions/screening.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Languages } from "lucide-react";

export default function ScreeningEntryPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "am">("en");
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
