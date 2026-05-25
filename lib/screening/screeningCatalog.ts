/**
 * MyHealthID structured screening pathways — English + አማርኛ.
 * Aligns to internal “Clinical Precision” directives (TB sections, HTN red screens, ADA FPG bands, etc.).
 * Amharic should still be reviewed against your institution’s signed source PDFs where wording must match exactly.
 */
import type { ScreeningProgramDef, ScreeningSectionDef } from "./types";

const L = (en: string, am: string) => ({ en, am });

export function visibleSections(prog: ScreeningProgramDef, patientAge: number): ScreeningSectionDef[] {
  return prog.sections.filter((sec) => {
    if (sec.showWhenPatientAgeLessThan != null && patientAge >= sec.showWhenPatientAgeLessThan) return false;
    return true;
  });
}

/** ─── TB (4 sections) ─────────────────────────────────────────────────────── */
const TB: ScreeningProgramDef = {
  type: "TB",
  title: L("Tuberculosis (TB) screening", "የትቢርኩሎዝ (TB) ምርመራ"),
  sections: [
    {
      id: "tb_basic",
      title: L("Section 1 — Basic information", "ክፍል 1 — መሰረታዊ መረጃ"),
      questions: [
        {
          id: "tb_s1_age",
          label: L("Age (years)", "ዕድሜ (በዓመት)"),
          input: "number",
          min: 0,
          max: 120,
          step: 1,
        },
        {
          id: "tb_s1_female",
          label: L("Are you female?", "ሴት ነዎት?"),
          hint: L("(Sex for TB risk context — Yes = Female, No = Male)", "(ለ TB አደጋ መግቢያ — አዎ=ሴት፣ አይ=ወንድ)"),
          input: "yesno",
        },
        {
          id: "tb_s1_weight_loss",
          label: L("Unexplained weight loss in the past few months?", "ባለፉት ወራት ያልታወቀ የክብደት መቀነስ?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
      ],
    },
    {
      id: "tb_high_risk",
      title: L("Section 2 — High-risk conditions & exposures", "ክፍል 2 — ከፍተኛ አደጋ ሁኔቶች እና ተጋላጭነት"),
      questions: [
        {
          id: "tb_rf_hiv",
          label: L("HIV infection, or unknown HIV status with ongoing risk?", "የኤችአይቪ ዕድሳት፣ ወይም ከአደጋ ጋር ያልታወቀ የኤችአይቪ ሁኔታ?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "tb_rf_diabetes",
          label: L("Diabetes mellitus?", "የስኳር በሽታ (ዲያቢትስ)?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "tb_rf_ckd",
          label: L("Chronic kidney disease?", "የረጅም ጊዜ የኩላሊት በሽታ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "tb_rf_silica",
          label: L("Silicosis or heavy silica / coal dust exposure at work?", "ሲሊኮሲስ ወይም በስራ ላይ ከባድ የሲሊካ/ከሰል አቧራ ተጋላጭነት?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "tb_rf_gi_surgery",
          label: L("Prior gastrectomy or jejuno-ileal bypass for weight loss?", "የሆድ ክፍል መቆረጥ ወይም ለክብደት መቀነስ የተደረገ ጅግኑ-ኢሌዋል ባይፓስ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "tb_rf_transplant",
          label: L("Solid organ or bone-marrow transplant recipient?", "የአካል ኦርጋን ወይም የአጥንት ማህደር ሽግግር ተቀባይ?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "tb_rf_tnf",
          label: L("TNF-alpha inhibitor (e.g. infliximab, adalimumab) in the past year?", "ባለፈው ዓመት TNF-አልፋ መከላከያ (ለምሳሌ ኢንፍሊክሲማብ፣ አዳሊሙማብ)?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "tb_rf_steroids",
          label: L("Oral corticosteroids ≥15 mg prednisolone daily (or equivalent) for ≥1 month?", "የአፍ ኮርቲኮስቴሮይድ ≥15 ሚግ ፕሬድኒሶሎን በቀን (ወይም ተመሳሳይ) ለ≥1 ወር?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "tb_rf_contact",
          label: L("Close household or workplace contact with a person who has TB?", "ከ TB ያለበት ሰው ጥብቅ የቤት ወይም የስራ ቦታ ግንኙነት?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "tb_rf_underweight",
          label: L("Body weight clearly below normal / malnutrition?", "ክብደት ከመደበኛ በታች / የአመጋገብ እጥረት?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "tb_rf_smoking",
          label: L("Current cigarette smoking or other inhaled substance use?", "የአሁኑ የሲጃራ ጨረር ወይም ሌላ የማስተናገጃ ተግባር?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
      ],
    },
    {
      id: "tb_symptoms",
      title: L("Section 3 — TB symptom triggers", "ክፍል 3 — የ TB ምልክት መለያዎች"),
      questions: [
        {
          id: "tb_s3_cough_gt_2w",
          label: L("Cough lasting more than 2 weeks?", "ከ2 ሳምንት በላይ የሚቆይ ሳል?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "tb_s3_cough_blood",
          label: L("Cough with blood (haemoptysis)?", "የደም ሳል (ሄሞፕቲዝስ)?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
      ],
    },
    {
      id: "tb_child",
      title: L("Section 4 — Child & adolescent (under 18)", "ክፍል 4 — ሕፃናት እና ታዳጊዎች (ከ18 በታች)"),
      showWhenPatientAgeLessThan: 18,
      questions: [
        {
          id: "tb_s4_poor_weight_gain",
          label: L("Poor weight gain or growth faltering (compared with peers)?", "ዝቅተኛ የክብደት ጨመር ወይም እድገት መዘግየት (ከዕድሜ ጓደኞች ጋር ሲወዳደር)?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "tb_s4_lethargy",
          label: L("Marked lethargy — child much less active than usual?", "ከባድ ድካም — ልጁ ከተለመደው በጣም کم ንቁ ነው?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 2,
        },
      ],
    },
  ],
};

/** ─── Hypertension ───────────────────────────────────────────────────────── */
const HYPERTENSION: ScreeningProgramDef = {
  type: "HYPERTENSION",
  title: L("Hypertension smart screening", "የደም ጫና ምርመራ (ስማርት)"),
  trackCardioRenalVitals: true,
  sections: [
    {
      id: "htn_screen1",
      title: L("Screen 1 — Vitals & anthropometry", "ስክሪን 1 — ሕይወት ምልክቶች እና አካላዊ መለኪያ"),
      questions: [
        {
          id: "sbp",
          label: L("Systolic BP (mmHg)", "ሲስቶሊክ የደም ጫና (mmHg)"),
          input: "number",
          clinicalRole: "sbp",
          min: 60,
          max: 260,
          step: 1,
        },
        {
          id: "dbp",
          label: L("Diastolic BP (mmHg)", "ዳያስቶሊክ የደም ጫና (mmHg)"),
          input: "number",
          clinicalRole: "dbp",
          min: 40,
          max: 180,
          step: 1,
        },
        {
          id: "weight_kg",
          label: L("Weight (kg)", "ክብደት (ኪግ)"),
          input: "number",
          clinicalRole: "weight_kg",
          min: 20,
          max: 300,
          step: 0.1,
        },
        {
          id: "height_cm",
          label: L("Height (cm)", "ቁመት (ሴሜ)"),
          input: "number",
          clinicalRole: "height_cm",
          min: 50,
          max: 230,
          step: 0.5,
        },
      ],
    },
    {
      id: "htn_screen2",
      title: L("Screen 2 — Background (non-emergency)", "ስክሪን 2 — ዳራ (አስቸኳይ አይደለም)"),
      questions: [
        {
          id: "htn_fhx",
          label: L("Family history of high blood pressure or stroke before age 60?", "ከ60 በፊት ከፍተኛ የደም ጫና ወይም ስትሮክ የቤተሰብ ታሪክ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "htn_known",
          label: L("Already told you have hypertension but not on regular treatment?", "የደም ጫና እንዳለብዎ ተነግሮአል ግን ዘወታዊ ሕክምና የሉም?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
      ],
    },
    {
      id: "htn_screen3_red",
      title: L("Screen 3 — Red alert symptoms (any YES = emergency stop)", "ስክሪን 3 — አደጋ ምልክቶች (ማንኛውም አዎ = አስቸኳይ ማቆም)"),
      questions: [
        {
          id: "ht_red_chest_rest",
          label: L("Resting chest pain or pressure lasting >10 minutes?", "በእረፍት የደረት ህመም ወይም ጭንቅል >10 ደቂቃ ይቆያል?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "ht_red_vision_loss",
          label: L("Sudden vision loss in one or both eyes?", "በአንድ ወይም በሁለቱም ዓይኖች ድንገተኛ የማየት መጣል?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "ht_red_neuro",
          label: L("Sudden weakness on one side of the body, facial droop, or slurred speech?", "በአንድ በኩል ድንገተኛ ድካም፣ የፊት መውረድ፣ ወይም የተዛባ ንግግር?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "ht_red_thunderclap_ha",
          label: L("Sudden, worst-ever (“thunderclap”) headache reaching peak in <1 minute?", "ድንገተኛ “ከመቼውም በላይ” ራስ ምታት በ<1 ደቂቃ ውስጥ ከፍተኛ?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "ht_red_sob_rest",
          label: L("Severe shortness of breath at rest (cannot lie flat comfortably)?", "በእረፍት ከባድ የመተንፈስ እጥረት (በአግባቡ ሆነው መኖር አይችሉም)?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
      ],
    },
  ],
};

/** ─── Diabetes ────────────────────────────────────────────────────────────── */
const DIABETES: ScreeningProgramDef = {
  type: "DIABETES",
  title: L("Diabetes screening & classification", "የስኳር በሽታ ምርመራ እና ምድብ"),
  sections: [
    {
      id: "dm_screen1",
      title: L("Screen 1 — Fasting labs", "ስክሪን 1 — የጾም ፈተና"),
      questions: [
        {
          id: "fp_mg_dl",
          label: L("Fasting plasma glucose — FPG (mg/dL)", "ከመመገብ በፊት የደም ስኳር (FPG) በ mg/dL"),
          hint: L("≥126 mg/dL → diabetes; 100–125 → prediabetes", "≥126 mg/dL → ስኳር በሽታ፤ 100–125 → ቅድመ-ስኳር"),
          input: "number",
          clinicalRole: "fp_mg_dl",
          min: 40,
          max: 500,
          step: 1,
        },
        {
          id: "hba1c",
          label: L("HbA1c (%)", "HbA1c (%)"),
          hint: L("≥6.5% → diabetes; 5.7–6.4% → prediabetes", "≥6.5% → ስኳር በሽታ፤ 5.7–6.4% → ቅድመ-ስኳር"),
          input: "number",
          clinicalRole: "hba1c_percent",
          min: 3,
          max: 18,
          step: 0.1,
        },
      ],
    },
    {
      id: "dm_screen2",
      title: L("Screen 2 — Classic hyperglycaemia symptoms", "ስክሪን 2 — የስኳር ከፍተኛ ምልክቶች"),
      questions: [
        {
          id: "dm_polyuria",
          label: L("Heavy thirst with frequent urination?", "ከፍተኛ ጥማት ከተደጋጋሚ ሽንት ጋር?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "dm_weight_loss",
          label: L("Rapid unexplained weight loss?", "ፈጥኖ ያልታወቀ የክብደት መቀነስ?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "dm_foot_ulcer",
          label: L("Foot wound or ulcer that is not healing?", "የእግር ቁስል ወይም ደረሰሽ ሳይድን?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
      ],
    },
    {
      id: "dm_screen3",
      title: L("Screen 3 — Risk factors", "ስክሪን 3 — አደጋ ምክንያቶች"),
      questions: [
        {
          id: "dm_gdm_hx",
          label: L("History of diabetes in pregnancy (gestational diabetes)?", "በእርግዝና ወቅት የስኳር በሽታ ታሪክ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "dm_pc_os",
          label: L("Polycystic ovary syndrome (PCOS) diagnosis?", "የፖሊስስቲክ ኦቫሪ ሲንድሮም (PCOS) መዝገብ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
      ],
    },
    {
      id: "dm_screen4_emergency",
      title: L("Screen 4 — Emergency override (any YES = immediate hospital referral)", "ስክሪን 4 — አስቸኳይ (ማንኛውም አዎ = ወዲያውኑ ሆስፒታል)"),
      questions: [
        {
          id: "dm_s4_confusion",
          label: L("New confusion, drowsiness you cannot wake from, or coma?", "አዲስ ግራራ፣ ከማንቃት በላይ እንቅልፍ፣ ወይም ኮማ?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 4,
        },
        {
          id: "dm_s4_rapid_breathing",
          label: L("Very fast breathing (Kussmaul-type) with fruity breath or severe vomiting?", "በጣም ፈጣን መተንፈስ ከፍራፍራ ሽታ ወይም ከባድ ማስወጣት ጋር?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 4,
        },
      ],
    },
  ],
};

/** ─── Respiratory ─────────────────────────────────────────────────────────── */
const RESPIRATORY: ScreeningProgramDef = {
  type: "RESPIRATORY",
  title: L("Respiratory triage screening", "የመተንፈስ ስርዓት ምርመራ"),
  sections: [
    {
      id: "resp_screen1",
      title: L("Screen 1 — Severity & emergency signs", "ስክሪን 1 — ክብደት እና አስቸኳይ ምልክቶች"),
      questions: [
        {
          id: "resp_dyspnea_scale",
          label: L("Breathing difficulty today (1 = mild, 10 = worst imaginable)", "ዛሬ የመተንፈስ ክብደት (1 ቀላል፣ 10 ከፍተኛ)"),
          hint: L("1–10 scale", "ስኬል 1–10"),
          input: "number",
          clinicalRole: "dyspnea_scale_1_10",
          min: 1,
          max: 10,
          step: 1,
        },
        {
          id: "resp_bluish_lips",
          label: L("Bluish lips, tongue, or fingertips (possible hypoxia)?", "የሰማያዊ ከንፈር፣ ምላስ፣ ወይም ጣት ጫፎች (የኦክስጅን እጥረት)?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 4,
        },
        {
          id: "resp_stridor_rest",
          label: L("Noisy breathing at rest (stridor) or unable to swallow saliva?", "በእረፍት ድምፅ ያለው መተንፈት (ስትራይደር) ወይም ላቤ መዋሻ አይቻልም?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
      ],
    },
  ],
};

/** ─── Cardiac ─────────────────────────────────────────────────────────────── */
const CARDIAC: ScreeningProgramDef = {
  type: "CARDIAC",
  title: L("Cardiac screening (NYHA & congestion clues)", "የልብ ምርመራ (NYHA እና ጭልመት ምልክቶች)"),
  trackCardioRenalVitals: true,
  sections: [
    {
      id: "card_screen1",
      title: L("Screen 1 — Vitals", "ስክሪን 1 — ሕይወት ምልክቶች"),
      questions: [
        {
          id: "sbp",
          label: L("Systolic BP (mmHg)", "ሲስቶሊክ የደም ጫና (mmHg)"),
          input: "number",
          clinicalRole: "sbp",
          min: 60,
          max: 260,
          step: 1,
        },
        {
          id: "dbp",
          label: L("Diastolic BP (mmHg)", "ዳያስቶሊክ የደም ጫና (mmHg)"),
          input: "number",
          clinicalRole: "dbp",
          min: 40,
          max: 180,
          step: 1,
        },
        {
          id: "weight_kg",
          label: L("Weight (kg)", "ክብደት (ኪግ)"),
          input: "number",
          clinicalRole: "weight_kg",
          min: 20,
          max: 300,
          step: 0.1,
        },
        {
          id: "height_cm",
          label: L("Height (cm)", "ቁመት (ሴሜ)"),
          input: "number",
          clinicalRole: "height_cm",
          min: 50,
          max: 230,
          step: 0.5,
        },
      ],
    },
    {
      id: "card_screen2_nyha",
      title: L("Screen 2 — NYHA functional class (I–IV)", "ስክሪን 2 — የ NYHA ስራ ክፍል (I–IV)"),
      questions: [
        {
          id: "nyha_class",
          label: L("NYHA class that best matches your usual limits (enter 1–4)", "ከተለመደው ገደብ ጋር የሚስማማው NYHA ክፍል (1–4 ያስገቡ)"),
          hint: L(
            "I: ordinary activity no symptoms. II: slight limit. III: marked limit. IV: symptoms at rest.",
            "I፡ መደበኛ እንቅስቃሴ ምልክት የለም። II፡ ትንሽ ገደብ። III፡ ከባድ ገደብ። IV፡ በእረፍት ምልክቶች።"
          ),
          input: "number",
          clinicalRole: "nyha_class",
          min: 1,
          max: 4,
          step: 1,
        },
      ],
    },
    {
      id: "card_screen3_jvp",
      title: L("Screen 3 — Volume overload clues (JVP)", "ስክሪን 3 — የፈሳሽ ጭልመት ምልክቶች (JVP)"),
      questions: [
        {
          id: "card_jvp_elevated",
          label: L(
            "When lying at ~45°, does your neck vein visibly bulge above the collarbone (raised JVP)?",
            "በ~45° ሲተኛ፣ የአንገት ወየን ከብራቱ አካባቢ በላይ በግልጽ ይታይ (ከፍተኛ JVP)?"
          ),
          hint: L(
            "Student tip: JVP reflects right-atrial pressure — look along the sternocleidomastoid with tangential light.",
            "ለተማሪ፡ JVP የቀኝ የአትሪያም ጫና ያሳያል — ከስተርኖክሌይዶማስቶይድ አቅጣጫ ብርሃን በመጠቀም ይመልከቱ።"
          ),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "card_orthopnea",
          label: L("Need ≥2 pillows to breathe comfortably when lying down?", "ለመተንፈስ በአግባቡ መኖር ≥2 ትራስ መስራት ያስፈልግዎታል?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "card_pedal_edema",
          label: L("New or worsening ankle / leg swelling over days?", "በቀናት ውስጥ አዲስ ወይም እየጨመረ የእግር እብጠት?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
      ],
    },
    {
      id: "card_screen4_red",
      title: L("Screen 4 — Emergency cardiac symptoms", "ስክሪን 4 — አስቸኳይ የልብ ምልክቶች"),
      questions: [
        {
          id: "card_red_chest_radiation",
          label: L("Tearing chest or back pain radiating to abdomen?", "ወደ ሆድ የሚሰራ የደረት/የጀርባ መቆረጥ ያለ ህመም?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "card_red_syncope_exertion",
          label: L("Fainting during exertion or new palpitations with chest discomfort?", "በጥረት መደንዘዝ ወይም ከደረት ህመም ጋር አዲስ የልብ ድካም?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
      ],
    },
  ],
};

/** ─── Universal risk programs (0–1 / 2–3 / ≥4 + red flags) ─────────────── */
const HIV: ScreeningProgramDef = {
  type: "HIV",
  title: L("HIV risk & symptom screen", "የኤችአይቪ አደጋ እና ምልክት ምርመራ"),
  universalRiskTriage: true,
  sections: [
    {
      id: "hiv_risk",
      title: L("Section A — Exposure & prevention gaps", "ክፍል ሀ — ተጋላጭነት እና ጥበቃ ክፍተት"),
      questions: [
        {
          id: "hiv_unprotected",
          label: L("Sex without condoms with a new or casual partner in past 3 months?", "ባለፉት 3 ወራት ከአዲስ ወይም አጋጣሚ ጋር ያለ ኮንደም ግብረ ሥጋ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "hiv_needle",
          label: L(
            "Shared needles, syringes, or unsterile skin piercing?",
            "ጉድጓድ፣ ስሪንጅ፣ ወይም ያልተጠረጠረ የቆዳ ማለፊያ መሳሪያ መጋራት?"
          ),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "hiv_pep",
          label: L("High-risk exposure in past 72h without PEP visit?", "ባለፉት 72 ሰዓት ከፍተኛ አደጋ ያለ PEP ጉብኝት?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "hiv_tb_contact",
          label: L("Living with someone diagnosed with TB in past year?", "ባለፈው ዓመት ከ TB የተገኘለት ሰው ጋር መኖር?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
      ],
    },
    {
      id: "hiv_sym",
      title: L("Section B — HIV-associated symptoms", "ክፍል ለ — ከኤችአይቪ ጋር የተያያዙ ምልክቶች"),
      questions: [
        {
          id: "hiv_weight",
          label: L("Unintentional weight loss >10% in 6 months?", "በ6 ወራት ውስጥ >10% ያልታሰበ የክብደት መቀነስ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "hiv_thrush",
          label: L("Oral thrush or painful swallowing for >2 weeks?", "የአፍ ትራሽ ወይም >2 ሳምንት የሚያሳብ የመዋሻ ህመም?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "hiv_rash_fever",
          label: L("Current fever with widespread rash?", "ከፍተኛ ሙቀት ከሰፊ ራሽ ጋር?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "hiv_neuro",
          label: L("New confusion, severe headache, or stiff neck?", "አዲስ ግራራ፣ ከባድ ራስ ምታት፣ ወይም ጠንካራ አንገት?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
      ],
    },
  ],
};

const LIVER: ScreeningProgramDef = {
  type: "LIVER",
  title: L("Liver health screening", "የጉበት ጤና ምርመራ"),
  universalRiskTriage: true,
  sections: [
    {
      id: "liver_all",
      title: L("Liver warning & risk screen", "የጉበት ማስጠንቀቂያ እና አደጋ ምርመራ"),
      questions: [
        {
          id: "liv_jaundice",
          label: L("Yellow eyes or skin?", "የአይን ወይም ቆዳ ቢጫ?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "liv_ascites",
          label: L("Rapidly increasing abdominal girth / fluid wave feeling?", "ፈጥኖ እየጨመረ የሆድ ይዞታ / የፈሳሽ ሞገድ ስሜት?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "liv_encephalopathy",
          label: L("Sleep reversal, confusion, or hand tremor (asterixis)?", "የእንቅልፍ መገልበጥ፣ ግራራ፣ ወይም የእጅ ተንቀጣቅጦ?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "liv_varices",
          label: L("Vomiting large amounts of blood or black tarry stool?", "ብዙ ደም ማስወጣት ወይም ጥቁር ሽንት?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "liv_alcohol",
          label: L("Daily heavy alcohol use in past year?", "ባለፈው ዓመት ዕለታዊ ከባድ አልኮል አጠቃቀም?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "liv_hep_b",
          label: L("Known hepatitis B or C?", "የታወቀ ሄፓታይትስ ቢ ወይም ሲ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
      ],
    },
  ],
};

const KIDNEY: ScreeningProgramDef = {
  type: "KIDNEY",
  title: L("Kidney health screening", "የኩላሊት ጤና ምርመራ"),
  universalRiskTriage: true,
  sections: [
    {
      id: "kid_all",
      title: L("Kidney failure warning screen", "የኩላሊት ችግር ማስጠንቀቂያ ምርመራ"),
      questions: [
        {
          id: "kid_anuria",
          label: L("No urine for 12 hours or very little despite drinking fluids?", "12 ሰዓት ሽንት የለም ወይም ቢጠጣም በጣም ጥቂት?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "kid_edema",
          label: L("Sudden facial swelling or puffiness around eyes?", "ድንገተኛ የፊት እብጠት ወይም በዓይኖች ዙሪያ ብዥታ?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "kid_uremic",
          label: L("Severe nausea with confusion or seizure?", "ከግራራ ወይም ከፍልስልስ ጋር ከባድ ማረር?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "kid_hematuria",
          label: L("Visible blood in urine?", "በሽንት ውስጥ የሚታይ ደም?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "kid_htn_uncontrolled",
          label: L("Known kidney disease or uncontrolled hypertension?", "የታወቀ የኩላሊት በሽታ ወይም ያልተቆጣጠረ የደም ጫና?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
      ],
    },
  ],
};

const CANCER: ScreeningProgramDef = {
  type: "CANCER",
  title: L("General cancer warning symptom screen", "አጠቃላይ የካንሰር ማስጠንቀቂያ ምርመራ"),
  universalRiskTriage: true,
  sections: [
    {
      id: "ca_all",
      title: L("Red-flag & persistent symptom review", "የአደጋ እና የረጅም ምልክት ግምገማ"),
      questions: [
        {
          id: "ca_lump",
          label: L("New lump or lymph node enlargement growing over weeks?", "በሳምንታት እየጨመረ አዲስ ክፍለ ነገር ወይም የሊምፍ ኖድ መጎዳዳ?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "ca_bleed",
          label: L("Unexplained bleeding (cough, stool, urine, vaginal) >2 weeks?", "ያልታወቀ ደም (ሳል፣ ሽንት፣ ሽንት፣ ወር አባባይ) >2 ሳምንት?"),
          input: "yesno",
          redFlagOnYes: true,
          riskPointsOnYes: 3,
        },
        {
          id: "ca_night_sweats",
          label: L("Drenching night sweats unrelated to room heat?", "ከክፍል ሙቀት ጋር ያልተያያዘ የሌሊት ላብ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "ca_voice",
          label: L("Hoarseness or voice change >3 weeks?", ">3 ሳምንት የድምፅ ለውጥ ወይም ጠንካራ ድምፅ?"),
          input: "yesno",
          riskPointsOnYes: 1,
        },
        {
          id: "ca_dysphagia",
          label: L("Progressive difficulty swallowing solids or liquids?", "የመዋሻ እንቅፋት እየጨመረ?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
        {
          id: "ca_weight",
          label: L("Unexplained weight loss >5 kg in 6 months?", "በ6 ወራት ውስጥ >5 ኪግ ያልታወቀ ክብደት መቀነስ?"),
          input: "yesno",
          riskPointsOnYes: 2,
        },
      ],
    },
  ],
};

const CATALOG: Record<string, ScreeningProgramDef> = {
  TB,
  HYPERTENSION,
  DIABETES,
  RESPIRATORY,
  CARDIAC,
  HIV,
  LIVER,
  KIDNEY,
  CANCER,
};

export function getScreeningProgram(type: string): ScreeningProgramDef | null {
  const key = type.trim().toUpperCase();
  return CATALOG[key] ?? null;
}

export function listScreeningPrograms(): ScreeningProgramDef[] {
  return Object.values(CATALOG);
}
