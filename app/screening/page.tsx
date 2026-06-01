"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePatientIdByIdentifier } from "@/lib/actions/screening.actions";
import { Languages, ShieldAlert, Search, Scan, ArrowRight, Stethoscope, Activity, Loader2 } from "lucide-react";
import { ADMIN_ROLES, TRIAGE_ROLES } from "@/lib/locales/enums";

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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const r = getRoleFromCookie();
    setRole(r);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
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

  // ── Role guard ──────────────────────────────────────────────────────────────
  if (authChecked && !TRIAGE_ROLES.includes(role as any) && !ADMIN_ROLES.includes(role as any)) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 shadow-2xl text-center max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center ring-8 ring-amber-500/5">
              <ShieldAlert className="w-10 h-10 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Access Restricted</h2>
          <p className="text-neutral-400 text-sm mb-2">
            The <span className="font-bold text-teal-400">Triage Screening Portal</span> is only accessible to Nurses.
          </p>
          {role && (
            <p className="text-xs text-neutral-500 mb-6">
              Your current role:{" "}
              <span className="font-mono font-bold text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded">{role}</span>
            </p>
          )}
          <button
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl h-11 border border-neutral-700 text-sm font-semibold transition-all"
            onClick={() => window.history.back()}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center shadow-lg">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">
              {t("Triage Screening Portal", "የምርመራ ፖርታል")}
            </div>
            <div className="text-[10px] text-neutral-500 leading-tight">Patient ID Lookup</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-neutral-400 tabular-nums">
            ⏰ {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <button
            onClick={() => setLang((l) => (l === "en" ? "am" : "en"))}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-lg transition-all"
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "en" ? "አማርኛ" : "EN"}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">

          {/* Title block */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 shadow-xl shadow-teal-900/40 mb-4">
              <Scan className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">
              {t("Patient Lookup", "የታካሚ ፍለጋ")}
            </h1>
            <p className="text-sm text-neutral-500">
              {t(
                "Enter the patient's Health ID, Fayda National ID, or internal card number to begin screening.",
                "ምርመራ ለመጀመር Health ID፣ ፋይዳ ወይም የታካሚ ካርድ ቁጥር ያስገቡ።"
              )}
            </p>
          </div>

          {/* Lookup card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={go} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-teal-400 mb-2">
                  {t("Patient Identifier", "የታካሚ መታወቂያ")}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    autoFocus
                    value={id}
                    onChange={(e) => { setId(e.target.value); setErr(""); }}
                    placeholder={t(
                      "e.g.  MHI-XXXXXXXX  ·  FIN-123456  ·  Card No.",
                      "ምሳሌ MHI-… ወይም ፋይዳ ቁጥር"
                    )}
                    className="w-full bg-neutral-950 border border-neutral-700 text-white text-sm rounded-xl pl-11 pr-4 py-4 outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder:text-neutral-600"
                    required
                  />
                </div>
              </div>

              {/* Error */}
              {err && (
                <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-300">
                  {err}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !id.trim()}
                className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-teal-900/30"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("Looking up…", "በመፈለግ…")}</>
                ) : (
                  <><Search className="w-4 h-4" /> {t("Find Patient & Begin Screening", "ታካሚ ፈልግ")}</>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-neutral-800" />
              <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Accepted Formats</span>
              <div className="flex-1 h-px bg-neutral-800" />
            </div>

            {/* Accepted ID types */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Health ID", example: "MHI-XXXXXXXX", color: "text-cyan-400", bg: "bg-cyan-950/40 border-cyan-500/20" },
                { label: "Fayda NID",  example: "FIN-XXXXXXX",  color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-500/20" },
                { label: "Card No.",   example: "Card #",        color: "text-amber-400", bg: "bg-amber-950/40 border-amber-500/20" },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl border p-3 text-center ${item.bg}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${item.color}`}>{item.label}</div>
                  <div className="text-[9px] text-neutral-600 mt-0.5 font-mono">{item.example}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick tip */}
          <div className="flex items-center gap-2 mt-4 px-1">
            <Activity className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
            <p className="text-[10px] text-neutral-600">
              {t(
                "For walk-in patients without ID, use the patient card number issued at Reception.",
                "ካርድ ከሌለ፣ ቅበላ ክፍሉ ያዘጋጀውን ቁጥር ይጠቀሙ።"
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
