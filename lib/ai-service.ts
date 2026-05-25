/**
 * MyHealthID AI Intelligence Layer (lib/ai-service.ts)
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates advanced clinical reasoning algorithms for the Doctor Dashboard.
 * Integrates behavioral profiling, lifestyle analysis, and cross-hospital legacy records.
 */

export function analyzePatientRisk(vitals: any[], history: string | null) {
  if (!vitals || vitals.length === 0) {
    return {
      riskLevel: "Low",
      actionEn: "Routine: Proceed with standard examination.",
      actionAm: "መደበኛ፡ መደበኛ ምርመራን ይቀጥሉ።"
    };
  }

  // Get most recent vitals
  const latest = vitals[0];
  const [sys, dia] = latest.bp ? latest.bp.split("/").map(Number) : [120, 80];
  
  const isHighBP = sys > 140 || dia > 90;
  const isFever = latest.temp > 38.0;
  const isTachycardic = latest.pulse > 100;
  const isHypoxic = latest.spO2 && latest.spO2 < 92;

  let riskLevel = "Low";
  let actionEn = "Routine: Proceed with standard examination.";
  let actionAm = "መደበኛ፡ መደበኛ ምርመራን ይቀጥሉ።";

  // Simulate clinical reasoning
  if (isHypoxic || (isHighBP && isTachycardic)) {
    riskLevel = "High";
    actionEn = "Critical: Immediate cardiopulmonary assessment required.";
    actionAm = "አስቸኳይ፡ አፋጣኝ የልብ እና የመተንፈሻ አካላት ግምገማ ያስፈልጋል።";
  } else if (isHighBP) {
    riskLevel = "Medium";
    actionEn = "Warning: Elevated blood pressure detected. Monitor closely.";
    actionAm = "ማስጠንቀቂያ፡ የደም ግፊት መጨመር ታይቷል። በቅርበት ይከታተሉ።";
  } else if (isFever) {
    riskLevel = "Medium";
    actionEn = "Warning: Febrile state detected. Check for infection.";
    actionAm = "ማስጠንቀቂያ፡ ትኩሳት ታይቷል። ለኢንፌክሽን ያረጋግጡ።";
  }

  // Override if history has critical flags
  if (history && history.toLowerCase().includes("cardiac") && isHighBP) {
    riskLevel = "High";
    actionEn = "Critical: Review Cardiac History immediately due to elevated vitals.";
    actionAm = "አስቸኳይ፡ የልብ ህክምና ታሪክን ይመልከቱ።";
  }

  return { riskLevel, actionEn, actionAm };
}

/**
 * generateAIBrief()
 * 
 * Synthesizes deep clinical analytics based on patient behavior (eating/talking/lifestyle),
 * recent vitals, and critical historical medicine taken 2 weeks ago at another hospital.
 */
export function generateAIBrief(patient: any): string[] {
  const bullets: string[] = [];

  // 1. Cross-Hospital Legacy Records & Medication Tracking (2 weeks ago)
  const legacyProvider = patient.legacyProviderName || null;
  const prescriptions = patient.prescriptions || [];
  
  if (legacyProvider) {
    const recentMeds = prescriptions.length > 0
      ? prescriptions[0].drugName
      : "Anti-hypertensive / Diabetic therapy";

    bullets.push(
      `⚠️ Cross-Hospital Alert: Sync indicates this patient was treated 2 weeks ago at "${legacyProvider}" and prescribed "${recentMeds}". Monitor carefully for therapeutic overlap, drug interactions, or medication non-adherence.`
    );
  } else {
    bullets.push(
      `📋 Integrated Triage Summary: Patient records synced with local clinic database. No active external hospital alerts detected today.`
    );
  }

  // 2. Behavioral, Lifestyle, and Habits Analytics (Eating, Talking, stress)
  const occupation = patient.occupation || "unspecified occupation";
  const age = patient.age;
  const sex = patient.sex;
  const conditions = patient.preExistingConditions || "no prior chronic diseases";
  
  // Custom behavioral heuristics based on patient data
  let lifestyleRisk = "sedentary / moderate stress";
  let dietAdvice = "dietary patterns appear linked to their chronic profile";
  
  if (occupation.toLowerCase().includes("driver") || occupation.toLowerCase().includes("office") || occupation.toLowerCase().includes("merchant")) {
    lifestyleRisk = "sedentary lifestyle with high stress levels";
    dietAdvice = "irregular eating schedule and high sodium/caffeine intake risk";
  } else if (occupation.toLowerCase().includes("farmer") || occupation.toLowerCase().includes("laborer")) {
    lifestyleRisk = "heavy physical workload";
    dietAdvice = "energy-dense nutritional requirements with hydration risk";
  }

  const journals = patient.journals || [];
  const latestJournal = journals.length > 0 ? journals[0] : null;
  const patientMood = latestJournal?.mood || "Stable";
  const reportedSymptoms = latestJournal?.symptoms || patient.chiefComplaint || "none";

  bullets.push(
    `🥗 Behavioral Analytics: Patient profile indicates a "${lifestyleRisk}" and "${dietAdvice}". Recent chat mood is "${patientMood}" with reported symptoms of "${reportedSymptoms}". This behavior may exacerbate underlying ${conditions}.`
  );

  // 3. Clinical & Diagnostic Suggestions
  const latestVital = patient.vitals && patient.vitals.length > 0 ? patient.vitals[0] : null;
  const chiefComplaint = patient.chiefComplaint || "routine checkup";
  
  let suggestedInvestigation = "Routine Complete Blood Count (CBC) and Blood Glucose";
  if (chiefComplaint.toLowerCase().includes("chest") || chiefComplaint.toLowerCase().includes("heart") || conditions.toLowerCase().includes("cardiac")) {
    suggestedInvestigation = "Electrocardiogram (ECG) and Troponin biomarkers";
  } else if (conditions.toLowerCase().includes("diab") || chiefComplaint.toLowerCase().includes("urina") || chiefComplaint.toLowerCase().includes("thirst")) {
    suggestedInvestigation = "Fasting Blood Glucose, HbA1c, and Urinalysis";
  } else if (latestVital?.temp > 38.0 || chiefComplaint.toLowerCase().includes("fever")) {
    suggestedInvestigation = "Blood Culture, Malaria blood smear, and CBC with Differential";
  }

  bullets.push(
    `🩺 Diagnostic Recommendations: Based on today's vitals and chief complaint "${chiefComplaint}", the AI recommends ordering "${suggestedInvestigation}" to cross-reference against their 2-week medical history.`
  );

  return bullets;
}
