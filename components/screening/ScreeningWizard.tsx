"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Languages, Activity } from "lucide-react";
import type { Lang, ScreeningProgramDef, ScreeningQuestionDef, ScreeningSectionDef } from "@/lib/screening/types";
import { getScreeningProgram, listScreeningPrograms, visibleSections } from "@/lib/screening/screeningCatalog";
import { submitScreening } from "@/lib/actions/screening.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Props = {
  patientId: string;
  patientHealthId: string;
  fullName: string;
  /** Registration age — used to show/hide pediatric-only sections (e.g. TB Section 4). */
  patientAge: number;
  initialType?: string | null;
};

type ScreeningOutcome = {
  triageResult: string;
  interruptedEmergency: boolean;
  riskScore: number;
  guidance: { en: string; am: string };
  bmi?: number | null;
  bmiClass?: { en: string; am: string } | null;
  bpStage?: { en: string; am: string } | null;
  /** SBP >180 or DBP >120 — same band as vitals / clinicalEngine. */
  bpCrisis?: boolean;
  diabetesNote?: { en: string; am: string } | null;
};

function labelOf(q: ScreeningQuestionDef, lang: Lang) {
  return lang === "am" ? q.label.am : q.label.en;
}

function titleOf(p: ScreeningProgramDef, lang: Lang) {
  return lang === "am" ? p.title.am : p.title.en;
}

function sectionTitle(s: ScreeningSectionDef, lang: Lang) {
  return lang === "am" ? s.title.am : s.title.en;
}

export default function ScreeningWizard({ patientId, patientHealthId, fullName, patientAge, initialType }: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const programs = useMemo(() => listScreeningPrograms(), []);

  const normalizedInitial = initialType?.trim().toUpperCase() ?? "";
  const initialProgram = normalizedInitial ? getScreeningProgram(normalizedInitial) : null;

  const [screeningType, setScreeningType] = useState<string | null>(initialProgram?.type ?? null);
  const [step, setStep] = useState(0); // 0 = first section index when type chosen
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [hardStop, setHardStop] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<ScreeningOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const program = screeningType ? getScreeningProgram(screeningType) : null;

  const activeSections = useMemo(
    () => (program ? visibleSections(program, patientAge) : []),
    [program, patientAge]
  );

  const t = useCallback(
    (en: string, am: string) => (lang === "am" ? am : en),
    [lang]
  );

  const hasAnyRedFlag = (next: Record<string, unknown>, p: ScreeningProgramDef) => {
    for (const s of p.sections) {
      for (const qq of s.questions) {
        if (qq.input === "yesno" && qq.redFlagOnYes && next[qq.id] === true) return true;
      }
    }
    return false;
  };

  useEffect(() => {
    if (!program) return;
    setHardStop(hasAnyRedFlag(answers, program));
  }, [answers, program]);

  const setAnswer = (id: string, v: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: v }));
  };

  const onYesNo = (q: ScreeningQuestionDef, yes: boolean) => {
    setAnswers((prev) => ({ ...prev, [q.id]: yes }));
  };

  const validateSection = (p: ScreeningProgramDef, sections: ScreeningSectionDef[], sectionIndex: number): string | null => {
    const sec = sections[sectionIndex];
    if (!sec) return t("Invalid step.", "የማይሰራ ደረጃ።");
    for (const q of sec.questions) {
      if (q.input === "yesno") {
        const v = answers[q.id];
        if (v !== true && v !== false) return t("Please answer all questions.", "እባክዎ ሁሉንም ጥያቄዎች ይመልሱ።");
      }
      if (q.input === "number") {
        const raw = answers[q.id];
        if (raw === "" || raw === undefined || raw === null) {
          if (p.trackCardioRenalVitals && q.clinicalRole) {
            return t("Vitals are required for this screening.", "ለዚህ ምርመራ ሕይወት ምልክቶች ያስፈልጋሉ።");
          }
        }
        if (raw !== "" && raw !== undefined && raw !== null) {
          const n = Number(raw);
          if (!Number.isFinite(n)) return t("Invalid number.", "የማይሰራ ቁጥር።");
          if (q.min !== undefined && n < q.min) return t(`Value must be ≥ ${q.min}`, `ከ ${q.min} በላይ መሆን አለበት`);
          if (q.max !== undefined && n > q.max) return t(`Value must be ≤ ${q.max}`, `ከ ${q.max} በታች መሆን አለበት`);
        }
      }
    }
    return null;
  };

  const persist = async () => {
    if (!program) return;
    setSubmitting(true);
    setError(null);
    const res = await submitScreening({ patientId, screeningType: program.type, answers });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(res.outcome as ScreeningOutcome);
    router.refresh();
  };

  const handleNext = async () => {
    if (!program) return;
    if (hardStop) {
      await persist();
      return;
    }
    const err = validateSection(program, activeSections, step);
    if (err) {
      setError(err);
      return;
    }
    if (step < activeSections.length - 1) {
      setStep((s) => s + 1);
      setError(null);
    } else {
      await persist();
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  };

  /* ─── Type picker ─── */
  if (!screeningType) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">MyHealthID Triage</p>
              <h1 className="text-2xl font-bold text-white mt-1">{t("Clinical screening", "ክሊኒካዊ ምርመራ")}</h1>
              <p className="text-slate-400 text-sm mt-1">
                {fullName} · <span className="font-mono text-cyan-300/90">{patientHealthId}</span>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-slate-600 bg-slate-900 text-slate-200"
              onClick={() => setLang((l) => (l === "en" ? "am" : "en"))}
            >
              <Languages className="w-4 h-4 mr-2" />
              {lang === "en" ? "አማርኛ" : "English"}
            </Button>
          </header>

          <p className="text-slate-400 text-sm">{t("Select a screening pathway.", "የምርመራ መንገድ ይምረጡ።")}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            {programs.map((p) => (
              <button
                key={p.type}
                type="button"
                onClick={() => {
                  setScreeningType(p.type);
                  setStep(0);
                  setAnswers({});
                  setHardStop(false);
                  setDone(null);
                }}
                className="text-left rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-800/80 p-5 transition-all"
              >
                <div className="text-xs font-mono text-cyan-500/80 mb-1">{p.type}</div>
                <div className="font-semibold text-white">{titleOf(p, lang)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Result ─── */
  if (done && program) {
    const color =
      done.triageResult === "RED" ? "from-rose-600/30 to-slate-950" : done.triageResult === "YELLOW" ? "from-amber-600/25 to-slate-950" : "from-emerald-600/20 to-slate-950";
    const g = done.guidance;
    const text = lang === "am" ? g.am : g.en;
    return (
      <div className={`min-h-screen bg-gradient-to-b ${color} text-slate-100 p-6`}>
        <div className="max-w-xl mx-auto space-y-6">
          <Button variant="outline" className="border-slate-600" onClick={() => setLang((l) => (l === "en" ? "am" : "en"))}>
            <Languages className="w-4 h-4 mr-2" />
            {lang === "en" ? "አማርኛ" : "English"}
          </Button>
          <Card className="bg-slate-900/90 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                {t("Screening complete", "ምርመራ ተጠናቋል")}
              </CardTitle>
              <CardDescription className="text-slate-400">{titleOf(program, lang)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`text-center text-2xl font-black tracking-wide rounded-xl py-4 border ${
                  done.triageResult === "RED"
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-200"
                    : done.triageResult === "YELLOW"
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-100"
                      : "bg-emerald-500/15 border-emerald-500/40 text-emerald-100"
                }`}
              >
                {done.triageResult}
              </div>
              {done.interruptedEmergency && (
                <div className="flex items-start gap-2 text-rose-300 text-sm bg-rose-950/40 border border-rose-500/30 rounded-lg p-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  {t("Emergency pathway triggered.", "የአስቸኳይ መንገድ ተነሳ።")}
                </div>
              )}
              <p className="text-slate-200 leading-relaxed text-sm">{text}</p>
              {done.bmi != null && (
                <p className="text-xs text-slate-400">
                  BMI: <span className="text-white font-mono">{done.bmi}</span>
                  {done.bmiClass && (
                    <span className="ml-2">{lang === "am" ? done.bmiClass.am : done.bmiClass.en}</span>
                  )}
                </p>
              )}
              {done.bpStage && (
                <p
                  className={`text-xs rounded-md px-2 py-1.5 ${
                    done.bpCrisis
                      ? "bg-red-950/60 text-red-200 border border-red-500/40 font-semibold"
                      : "text-slate-400"
                  }`}
                >
                  BP: {lang === "am" ? done.bpStage.am : done.bpStage.en}
                </p>
              )}
              {done.diabetesNote && (
                <p className="text-xs text-slate-400">{lang === "am" ? done.diabetesNote.am : done.diabetesNote.en}</p>
              )}
              <p className="text-xs text-slate-500">
                {t("Risk score", "የአደጋ ነጥብ")}: {done.riskScore}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ─── Emergency full interrupt ─── */
  if (hardStop && program) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-950 via-slate-950 to-black text-white p-6 flex flex-col items-center justify-center">
        <div className="max-w-lg w-full text-center space-y-6">
          <AlertTriangle className="w-16 h-16 text-rose-400 mx-auto animate-pulse" />
          <h1 className="text-3xl font-black">{t("Emergency referral", "አስቸኳይ ማስላለፍ")}</h1>
          <p className="text-rose-100/90 text-sm leading-relaxed">
            {t(
              "A critical answer was recorded. Seek immediate in-person emergency care. This screening is stopped.",
              "አስፈላጊ መልስ ተመዝግቧል። ወዲያውኑ አስቸኳይ የሰው ምርመራ ይግቡ። ይህ ምርመራ ቆሟል።"
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" className="border-slate-500" onClick={() => setLang((l) => (l === "en" ? "am" : "en"))}>
              <Languages className="w-4 h-4 mr-2" />
              {lang === "en" ? "አማርኛ" : "English"}
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-500" disabled={submitting} onClick={() => persist()}>
              {submitting ? t("Saving…", "በማስቀመጥ…") : t("Save & alert queue", "አስቀምጥ እና ተራ አስታውቅ")}
            </Button>
          </div>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  /* ─── Multi-step form ─── */
  const section = activeSections[step];
  const progress = activeSections.length ? ((step + 1) / activeSections.length) * 100 : 0;

  if (!section) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
        <p>{t("No screening sections available for this patient age.", "ለዚህ ዕድሜ የምርመራ ክፍል የለም።")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">{patientHealthId}</p>
            <h1 className="text-xl font-bold text-white">{titleOf(program!, lang)}</h1>
            <p className="text-slate-500 text-sm">{fullName}</p>
          </div>
          <Button type="button" variant="outline" className="border-slate-600 bg-slate-900" onClick={() => setLang((l) => (l === "en" ? "am" : "en"))}>
            <Languages className="w-4 h-4 mr-2" />
            {lang === "en" ? "አማርኛ" : "English"}
          </Button>
        </header>

        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              {sectionTitle(section, lang)}
            </CardTitle>
            <CardDescription className="text-slate-500">
              {t("Section", "ክፍል")} {step + 1} / {activeSections.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <label className="text-sm font-medium text-slate-200 block">{labelOf(q, lang)}</label>
                {q.hint && (
                  <p className="text-xs text-slate-500 -mt-1 mb-1">{lang === "am" ? q.hint.am : q.hint.en}</p>
                )}
                {q.input === "yesno" ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={answers[q.id] === true ? "default" : "outline"}
                      className={answers[q.id] === true ? "bg-emerald-600 hover:bg-emerald-500 flex-1" : "border-slate-600 flex-1 text-slate-200"}
                      onClick={() => onYesNo(q, true)}
                    >
                      {lang === "en" ? "Yes" : "አዎ"}
                    </Button>
                    <Button
                      type="button"
                      variant={answers[q.id] === false ? "default" : "outline"}
                      className={answers[q.id] === false ? "bg-slate-600 flex-1" : "border-slate-600 flex-1 text-slate-200"}
                      onClick={() => onYesNo(q, false)}
                    >
                      {lang === "en" ? "No" : "አይ"}
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="number"
                    min={q.min}
                    max={q.max}
                    step={q.step ?? 1}
                    value={answers[q.id] === undefined || answers[q.id] === null ? "" : String(answers[q.id])}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAnswer(q.id, v === "" ? "" : Number(v));
                    }}
                    className="bg-slate-950 border-slate-700 text-white h-11"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {error && <p className="text-rose-400 text-sm text-center">{error}</p>}

        <div className="flex justify-between gap-4">
          <Button type="button" variant="ghost" className="text-slate-400" disabled={step === 0} onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("Back", "ተመለስ")}
          </Button>
          <Button type="button" className="bg-cyan-600 hover:bg-cyan-500" onClick={handleNext} disabled={submitting}>
            {step < activeSections.length - 1 ? (
              <>
                {t("Next", "ቀጣይ")}
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            ) : submitting ? (
              t("Saving…", "በማስቀመጥ…")
            ) : (
              t("Finish", "ጨርስ")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
