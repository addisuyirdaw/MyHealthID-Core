import { ScreeningTriageLevel } from "@prisma/client";
import type { ScreeningProgramDef, ScreeningQuestionDef, ClinicalComputationResult } from "./types";
import { getScreeningProgram } from "./screeningCatalog";

function classifyBmi(bmi: number): { key: string; label: { en: string; am: string } } {
  if (bmi < 18.5)
    return {
      key: "underweight",
      label: { en: "Underweight", am: "ከመጠን በታች ክብደት" },
    };
  if (bmi < 25)
    return { key: "normal", label: { en: "Normal weight", am: "መደበኛ ክብደት" } };
  if (bmi < 30)
    return { key: "overweight", label: { en: "Overweight", am: "ከመጠን በላይ ክብደት" } };
  if (bmi < 35)
    return { key: "obesity_i", label: { en: "Obesity class I", am: "ወፍራምነት ደረጃ I" } };
  if (bmi < 40)
    return { key: "obesity_ii", label: { en: "Obesity class II", am: "ወፍራምነት ደረጃ II" } };
  return { key: "obesity_iii", label: { en: "Obesity class III", am: "ወፍራምነት ደረጃ III" } };
}

/**
 * Directive-aligned BP bands:
 * - Normal: SBP <120 AND DBP <80
 * - Stage 2: SBP ≥140 OR DBP ≥90 (and not crisis)
 * - Crisis: SBP >180 OR DBP >120
 * - Stage 1 / elevated ranges per ACC/AHA-style layering between normal and stage 2.
 */
function stageBloodPressure(
  sbp: number,
  dbp: number
): { en: string; am: string; crisis: boolean; stage2: boolean; stage1OrElevated: boolean } {
  if (sbp > 180 || dbp > 120) {
    return {
      en: "Hypertensive crisis (SBP >180 or DBP >120)",
      am: "የደም ጫና አደጋ (ሲስቶሊክ >180 ወይም ዳያስቶሊክ >120)",
      crisis: true,
      stage2: true,
      stage1OrElevated: true,
    };
  }
  if (sbp < 120 && dbp < 80) {
    return {
      en: "Normal BP (<120 and <80)",
      am: "መደበኛ የደም ጫና (<120 እና <80)",
      crisis: false,
      stage2: false,
      stage1OrElevated: false,
    };
  }
  if (sbp >= 140 || dbp >= 90) {
    return {
      en: "Stage 2 hypertension (≥140 or ≥90)",
      am: "የደም ጫና ደረጃ 2 (≥140 ወይም ≥90)",
      crisis: false,
      stage2: true,
      stage1OrElevated: true,
    };
  }
  if (sbp >= 130 || dbp >= 80) {
    return {
      en: "Stage 1 hypertension",
      am: "የደም ጫና ደረጃ 1",
      crisis: false,
      stage2: false,
      stage1OrElevated: true,
    };
  }
  if (sbp >= 120 && sbp <= 129 && dbp < 80) {
    return {
      en: "Elevated BP",
      am: "የደም ጫና ከፍ ብሏል",
      crisis: false,
      stage2: false,
      stage1OrElevated: true,
    };
  }
  return {
    en: "Elevated / high-normal BP pattern",
    am: "የደም ጫና ከፍተኛ-መደበኛ ስርዓት",
    crisis: false,
    stage2: false,
    stage1OrElevated: true,
  };
}

function interpretDiabetes(fpg?: number, hba1c?: number): {
  note: { en: string; am: string };
  extraRisk: number;
} {
  let extraRisk = 0;
  const partsEn: string[] = [];
  const partsAm: string[] = [];

  if (fpg !== undefined && !Number.isNaN(fpg)) {
    if (fpg >= 126) {
      extraRisk += 2;
      partsEn.push("FPG ≥126 mg/dL → diabetes range.");
      partsAm.push("FPG ≥126 mg/dL → የስኳር በሽታ ክልል።");
    } else if (fpg >= 100) {
      extraRisk += 1;
      partsEn.push("FPG 100–125 mg/dL → prediabetes.");
      partsAm.push("FPG 100–125 mg/dL → ቅድመ-ስኳር።");
    }
  }
  if (hba1c !== undefined && !Number.isNaN(hba1c)) {
    if (hba1c >= 6.5) {
      extraRisk += 2;
      partsEn.push("HbA1c ≥6.5% → diabetes range.");
      partsAm.push("HbA1c ≥6.5% → የስኳር በሽታ ክልል።");
    } else if (hba1c >= 5.7) {
      extraRisk += 1;
      partsEn.push("HbA1c 5.7–6.4% → prediabetes.");
      partsAm.push("HbA1c 5.7–6.4% → ቅድመ-ስኳር።");
    }
  }

  if (partsEn.length === 0) {
    return {
      note: {
        en: "No FPG/HbA1c values entered for classification.",
        am: "ለምድብ FPG/HbA1c አልተገባም።",
      },
      extraRisk: 0,
    };
  }
  return {
    note: { en: partsEn.join(" "), am: partsAm.join(" ") },
    extraRisk,
  };
}

function readNumberAnswer(answers: Record<string, unknown>, q: ScreeningQuestionDef): number | undefined {
  const v = answers[q.id];
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function readBoolAnswer(answers: Record<string, unknown>, q: ScreeningQuestionDef): boolean | undefined {
  const v = answers[q.id];
  if (v === true || v === "yes") return true;
  if (v === false || v === "no") return false;
  return undefined;
}

/** HIV / Liver / Kidney / Cancer: 0–1 Low, 2–3 Moderate, ≥4 or red flag → High. */
function triageFromUniversalRisk(score: number, interrupted: boolean): ScreeningTriageLevel {
  if (interrupted || score >= 4) return ScreeningTriageLevel.RED;
  if (score >= 2) return ScreeningTriageLevel.YELLOW;
  return ScreeningTriageLevel.GREEN;
}

/** Default pathway (TB, HTN, DM, respiratory, cardiac): 0–1 Green, 2–3 Yellow, ≥4 or crisis/extreme BMI → Red. */
function triageFromScore(score: number, hasCrisisBp: boolean, bmiHighRisk: boolean): ScreeningTriageLevel {
  if (hasCrisisBp || bmiHighRisk || score >= 4) return ScreeningTriageLevel.RED;
  if (score >= 2) return ScreeningTriageLevel.YELLOW;
  return ScreeningTriageLevel.GREEN;
}

function guidanceFor(
  level: ScreeningTriageLevel,
  interrupted: boolean
): { en: string; am: string } {
  if (interrupted) {
    return {
      en: "Immediate hospital referral: go to the nearest emergency department or call emergency services now. Do not continue this questionnaire.",
      am: "ወዲያውኑ ሆስፒታል ማስላለፍ፡ ወደ ቅርብ አስቸኳይ ክፍል ይሂዱ ወይም አስቸኳይ ይደውሉ። ይህን ጥያቄ አይቀጥሉ።",
    };
  }
  switch (level) {
    case ScreeningTriageLevel.GREEN:
      return {
        en: "Low priority / routine: continue healthy habits and routine primary-care follow-up.",
        am: "ዝቅተኛ ቅድሚያ / መደበኛ፡ ጤናማ ልምዶችን ይቀጥሉ እና መደበኛ የጤና ክትትል ይጠብቁ።",
      };
    case ScreeningTriageLevel.YELLOW:
      return {
        en: "Moderate priority: schedule a clinic visit soon for clinician review and targeted tests.",
        am: "መካከለኛ ቅድሚያ፡ በቅርቡ ለሐኪም ምርመራ እና ለፈተናዎች ቀጠሮ ይያዙ።",
      };
    default:
      return {
        en: "High / urgent referral: seek same-day medical assessment at a hospital or urgent-care facility.",
        am: "ከፍተኛ / አስቸኳይ ማስላለፍ፡ በዛው ቀን በሆስፒታል ወይም አስቸኳይ እንክብካቤ ምርመራ ይግቡ።",
      };
  }
}

function collectNumericRoles(
  program: ScreeningProgramDef,
  answers: Record<string, unknown>
): {
  sbp?: number;
  dbp?: number;
  weightKg?: number;
  heightCm?: number;
  fpg?: number;
  hba1c?: number;
  nyha?: number;
  dyspnea?: number;
} {
  const out: {
    sbp?: number;
    dbp?: number;
    weightKg?: number;
    heightCm?: number;
    fpg?: number;
    hba1c?: number;
    nyha?: number;
    dyspnea?: number;
  } = {};
  for (const section of program.sections) {
    for (const q of section.questions) {
      if (q.input !== "number" || !q.clinicalRole) continue;
      const n = readNumberAnswer(answers, q);
      if (n === undefined) continue;
      switch (q.clinicalRole) {
        case "sbp":
          out.sbp = n;
          break;
        case "dbp":
          out.dbp = n;
          break;
        case "weight_kg":
          out.weightKg = n;
          break;
        case "height_cm":
          out.heightCm = n;
          break;
        case "fp_mg_dl":
          out.fpg = n;
          break;
        case "hba1c_percent":
          out.hba1c = n;
          break;
        case "nyha_class":
          out.nyha = n;
          break;
        case "dyspnea_scale_1_10":
          out.dyspnea = n;
          break;
      }
    }
  }
  return out;
}

export function evaluateScreening(
  screeningType: string,
  answers: Record<string, unknown>
): ClinicalComputationResult {
  const program = getScreeningProgram(screeningType);
  if (!program) {
    return {
      triageResult: ScreeningTriageLevel.GREEN,
      interruptedEmergency: false,
      riskScore: 0,
      guidance: {
        en: "Unknown screening type.",
        am: "ያልታወቀ የምርመራ አይነት።",
      },
      details: { error: "unknown_program" },
    };
  }

  let risk = 0;
  let interrupted = false;

  for (const section of program.sections) {
    for (const q of section.questions) {
      if (q.input === "yesno") {
        const a = readBoolAnswer(answers, q);
        if (a === true) {
          if (q.redFlagOnYes) interrupted = true;
          risk += q.riskPointsOnYes ?? 0;
        }
      }
    }
  }

  /* Diabetes Screen 4 — emergency override (any YES bypasses non-emergency triage). */
  if (program.type === "DIABETES") {
    if (answers.dm_s4_confusion === true || answers.dm_s4_rapid_breathing === true) {
      interrupted = true;
    }
  }

  const { sbp, dbp, weightKg, heightCm, fpg, hba1c, nyha, dyspnea } = collectNumericRoles(program, answers);

  let bmi: number | undefined;
  let bmiClass: { en: string; am: string } | undefined;
  if (!program.universalRiskTriage && weightKg && heightCm && heightCm > 0) {
    const m = heightCm / 100;
    bmi = Math.round((weightKg / (m * m)) * 10) / 10;
    bmiClass = classifyBmi(bmi).label;
    if (bmi < 18.5 || bmi >= 35) risk += 2;
    else if (bmi >= 30) risk += 1;
  } else if (program.universalRiskTriage && weightKg && heightCm && heightCm > 0) {
    const m = heightCm / 100;
    bmi = Math.round((weightKg / (m * m)) * 10) / 10;
    bmiClass = classifyBmi(bmi).label;
  }

  let bpStage: { en: string; am: string } | undefined;
  let crisisBp = false;
  if (!program.universalRiskTriage && sbp !== undefined && dbp !== undefined) {
    const st = stageBloodPressure(sbp, dbp);
    bpStage = { en: st.en, am: st.am };
    if (st.crisis) {
      crisisBp = true;
      risk += 3;
    } else if (st.stage2) risk += 2;
    else if (st.stage1OrElevated) risk += 1;
  }

  const dm = interpretDiabetes(fpg, hba1c);
  if (program.type === "DIABETES") risk += dm.extraRisk;

  /* Respiratory: 1–10 dyspnoea scale. */
  if (program.type === "RESPIRATORY" && dyspnea !== undefined) {
    if (dyspnea >= 10) interrupted = true;
    else if (dyspnea >= 8) risk += 2;
    else if (dyspnea >= 6) risk += 1;
  }

  /* Cardiac: NYHA class. */
  if (program.type === "CARDIAC" && nyha !== undefined) {
    if (nyha >= 4) interrupted = true;
    else if (nyha >= 3) risk += 2;
    else if (nyha >= 2) risk += 1;
  }

  if (interrupted) {
    return {
      triageResult: ScreeningTriageLevel.RED,
      interruptedEmergency: true,
      riskScore: risk,
      guidance: guidanceFor(ScreeningTriageLevel.RED, true),
      sbp,
      dbp,
      weightKg,
      heightCm,
      bmi,
      bmiClass,
      bpStage,
      bpCrisis: crisisBp,
      diabetesNote: program.type === "DIABETES" ? dm.note : undefined,
      details: { bmi, bpStage: bpStage?.en, diabetes: dm.note.en, nyha, dyspnea },
    };
  }

  const bmiHighRisk =
    !program.universalRiskTriage && Boolean(bmi && (bmi >= 40 || bmi < 16));

  const triage = program.universalRiskTriage
    ? triageFromUniversalRisk(risk, false)
    : triageFromScore(risk, crisisBp, bmiHighRisk);

  return {
    triageResult: triage,
    interruptedEmergency: false,
    riskScore: risk,
    guidance: guidanceFor(triage, false),
    sbp,
    dbp,
    weightKg,
    heightCm,
    bmi,
    bmiClass,
    bpStage,
    bpCrisis: crisisBp,
    diabetesNote: program.type === "DIABETES" ? dm.note : undefined,
    details: { risk, bmi, bpStage: bpStage?.en, nyha, dyspnea },
  };
}
