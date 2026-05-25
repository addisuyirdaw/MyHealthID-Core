/** EMR Manage workspace — eight longitudinal sections (immutable notes + structured entries). */
export const EMR_SECTION_IDS = [
  "identification",
  "past_history",
  "vitals",
  "clinical_exam",
  "nursing_progress",
  "investigations",
  "medications",
  "referrals",
] as const;

export type EmrSectionId = (typeof EMR_SECTION_IDS)[number];

export const EMR_SECTION_LABELS: Record<EmrSectionId, { en: string; am: string }> = {
  identification: { en: "Identification", am: "መለያ" },
  past_history: { en: "Past History", am: "ያለፈ ታሪክ" },
  vitals: { en: "Vitals", am: "ሕይወት ምልክቶች" },
  clinical_exam: { en: "Clinical Examination", am: "ክሊኒካዊ ምርመራ" },
  nursing_progress: { en: "Nursing Progress", am: "የነርስ እድገት" },
  investigations: { en: "Investigations", am: "ምርመራዎች" },
  medications: { en: "Medications", am: "መድኃኒቶች" },
  referrals: { en: "Referrals", am: "ማስላለፎች" },
};

/** Systems review rows for IPPA structured exam notes. */
export const EXAM_SYSTEMS = [
  "general",
  "heent",
  "respiratory",
  "cardiovascular",
  "abdomen",
  "genitourinary",
  "musculoskeletal",
  "neurological",
  "integumentary",
] as const;

export type ExamSystemId = (typeof EXAM_SYSTEMS)[number];

export const EXAM_SYSTEM_LABELS: Record<ExamSystemId, string> = {
  general: "General appearance",
  heent: "HEENT",
  respiratory: "Respiratory",
  cardiovascular: "Cardiovascular",
  abdomen: "Abdomen",
  genitourinary: "Genitourinary",
  musculoskeletal: "Musculoskeletal",
  neurological: "Neurological",
  integumentary: "Integumentary",
};

export const IPPA_PHASES = ["inspection", "palpation", "percussion", "auscultation"] as const;
export type IppaPhase = (typeof IPPA_PHASES)[number];

export const IPPA_PHASE_LABELS: Record<IppaPhase, string> = {
  inspection: "Inspection",
  palpation: "Palpation",
  percussion: "Percussion",
  auscultation: "Auscultation",
};
