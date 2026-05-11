import type { ScreeningTriageLevel } from "@prisma/client";

export type Lang = "en" | "am";

export type Bilingual = { en: string; am: string };

export type ScreeningQuestionInput = "yesno" | "number";

export interface ScreeningQuestionDef {
  id: string;
  label: Bilingual;
  /** Short helper under the field (e.g. scale anchors). */
  hint?: Bilingual;
  input: ScreeningQuestionInput;
  /** If patient answers YES, trigger emergency interrupt and RED triage. */
  redFlagOnYes?: boolean;
  /** Extra risk points when answer is YES (yes/no) or when numeric falls in abnormal band (handled in engine for labs). */
  riskPointsOnYes?: number;
  min?: number;
  max?: number;
  step?: number;
  /** For numeric vitals / labs — engine applies clinical rules. */
  clinicalRole?:
    | "sbp"
    | "dbp"
    | "weight_kg"
    | "height_cm"
    | "fp_mg_dl"
    | "hba1c_percent"
    | "nyha_class"
    | "dyspnea_scale_1_10";
}

export interface ScreeningSectionDef {
  id: string;
  title: Bilingual;
  questions: ScreeningQuestionDef[];
  /** If set, this section is shown only when registration age is **strictly less** than this value (e.g. 18 for pediatric TB). */
  showWhenPatientAgeLessThan?: number;
}

export interface ScreeningProgramDef {
  type: string;
  title: Bilingual;
  /** When true, numeric vitals are expected and stored on Screening for longitudinal tracking. */
  trackCardioRenalVitals?: boolean;
  /**
   * HIV / Liver / Kidney / Cancer: triage uses count of risk “yes” answers only
   * (0–1 Low / Green, 2–3 Moderate / Yellow, ≥4 or any red flag → High / Red).
   */
  universalRiskTriage?: boolean;
  sections: ScreeningSectionDef[];
}

export interface ClinicalComputationResult {
  triageResult: ScreeningTriageLevel;
  interruptedEmergency: boolean;
  riskScore: number;
  guidance: Bilingual;
  sbp?: number;
  dbp?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  bmiClass?: Bilingual;
  bpStage?: Bilingual;
  /** True when SBP >180 or DBP >120 (directive-aligned hypertensive crisis band). */
  bpCrisis?: boolean;
  diabetesNote?: Bilingual;
  details: Record<string, unknown>;
}
