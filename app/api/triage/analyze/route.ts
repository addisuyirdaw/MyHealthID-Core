import { NextResponse } from "next/server";
import { TRIAGE_LIST } from "@/lib/triage/triageList";

/**
 * POST /api/triage/analyze
 * Lightweight symptom severity classifier.
 * Returns { severity: 'CRITICAL' | 'MODERATE' | 'NORMAL', ward: string, reasoning: string }
 */
export async function POST(req: Request) {
  try {
    const { symptoms, age, isPregnant } = await req.json();

    if (!symptoms || typeof symptoms !== "string") {
      return NextResponse.json({ success: false, error: "symptoms field is required." }, { status: 400 });
    }

    const lower = symptoms.toLowerCase();

    // Build a lookup from Priority-1 triage labels
    const priority1Labels = TRIAGE_LIST
      .filter((t) => t.priority === 1)
      .map((t) => t.label.toLowerCase());

    // Extract English keywords from Priority-1 labels (words > 3 chars)
    const criticalKeywords = new Set<string>();
    priority1Labels.forEach((label) => {
      label.split(/[\s,()—\-\/]+/).forEach((word) => {
        if (word.length > 3) criticalKeywords.add(word);
      });
    });

    // Hardcoded high-signal emergency keywords not always captured by label extraction
    const hardCritical = [
      "chest pain", "unconscious", "not breathing", "stroke", "seizure",
      "overdose", "poisoning", "anaphylaxis", "severe bleeding", "uncontrolled bleeding",
      "severe burn", "drowning", "crushed", "amputation", "heart attack",
      "cannot breathe", "shortness of breath", "paralysis", "coma",
    ];

    const priority2Labels = TRIAGE_LIST
      .filter((t) => t.priority === 2)
      .map((t) => t.label.toLowerCase());

    const moderateKeywords = new Set<string>();
    priority2Labels.forEach((label) => {
      label.split(/[\s,()—\-\/]+/).forEach((word) => {
        if (word.length > 3) moderateKeywords.add(word);
      });
    });

    // === Evaluate severity ===
    let severity: "CRITICAL" | "MODERATE" | "NORMAL" = "NORMAL";
    let reasoning = "No urgent symptom keywords detected. Routine assessment recommended.";
    let ward = "OPD_OUTPATIENT";

    // Check for hard critical phrases first
    const hasCriticalPhrase = hardCritical.some((phrase) => lower.includes(phrase));
    // Check for critical keywords from triage list
    const criticalKeywordHit = [...criticalKeywords].find((kw) => lower.includes(kw));
    // Check moderate keywords
    const moderateKeywordHit = [...moderateKeywords].find((kw) => lower.includes(kw));

    if (hasCriticalPhrase || criticalKeywordHit) {
      severity = "CRITICAL";
      ward = "EMERGENCY";
      reasoning = `Critical symptom detected: "${hasCriticalPhrase ? hardCritical.find((p) => lower.includes(p)) : criticalKeywordHit}". Immediate emergency attention required.`;
    } else if (moderateKeywordHit) {
      severity = "MODERATE";
      ward = "OPD_OUTPATIENT";
      reasoning = `Moderate symptom detected: "${moderateKeywordHit}". Prompt clinical assessment recommended.`;
    }

    // === Override rules: Age > 65 or Pregnancy ===
    const numericAge = typeof age === "number" ? age : parseInt(String(age ?? "0"), 10);
    const pregnant = Boolean(isPregnant);

    if (pregnant || numericAge > 65) {
      if (severity === "NORMAL") {
        severity = "MODERATE";
        const reason = pregnant ? "Pregnancy status" : "Age over 65";
        reasoning = `${reason} triggers automatic severity upgrade to MODERATE. ${reasoning}`;
      }
      // If already CRITICAL, stay CRITICAL — no downgrade
    }

    return NextResponse.json({ success: true, severity, ward, reasoning });
  } catch (error: any) {
    console.error("[triage/analyze] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
