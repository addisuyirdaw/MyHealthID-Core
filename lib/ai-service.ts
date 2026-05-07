/**
 * MyHealthID AI Intelligence Layer
 * Simulates clinical reasoning algorithms for the Doctor Dashboard.
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

export function generateAIBrief(patient: any) {
  // Aggregate data from legacy bridge and current session
  const legacyProvider = patient.legacyProviderName || "Standard Network";
  const recentLabs = patient.investigations?.length > 0 
    ? patient.investigations[0].testName 
    : "No recent labs";
    
  const recentMeds = patient.prescriptions?.length > 0
    ? patient.prescriptions[0].drugName
    : "No current medications";

  const bullets = [
    `Patient data synthesized from ${legacyProvider} and current triage session.`,
    `Recent Medical Action: Prescribed ${recentMeds}.`,
    `Laboratory Context: ${recentLabs} processed. Follow-up may be required.`
  ];

  return bullets;
}
