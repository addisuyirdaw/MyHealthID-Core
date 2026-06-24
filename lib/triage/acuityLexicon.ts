/**
 * HIGH-ACUITY SYMPTOM LEXICON
 *
 * Deterministic, LLM-free string matching for multi-tier severity detection.
 * Used by the registration form's real-time boundary guard to:
 *   1. Flag the symptom input container with a coloured border (red / amber / green).
 *   2. Render a persistent warning or verification banner.
 *   3. Force-select and lock the "Triage / Emergency" ward on CRITICAL match.
 *   4. Override the booking submission with emergencyFlag = true on CRITICAL.
 *
 * Severity tiers:
 *   CRITICAL — life-threatening; triggers ward lock + red UI.
 *   MODERATE — urgent but non-life-threatening; amber UI only.
 *   NORMAL   — no match; green verification indicator.
 *
 * Rules:
 *   - Phrases are matched case-insensitively and trimmed.
 *   - Amharic strings are matched via Unicode substring search (no normalisation needed).
 *   - CRITICAL check always runs before MODERATE (short-circuit).
 *   - Add new terms by appending to the relevant array below.
 */

/** English high-acuity target phrases (exact substring match, case-insensitive) */
const EN_PHRASES: string[] = [
  // Haemorrhage / bleeding
  "bleeding",
  "hemorrhage",
  "haemorrhage",
  "blood loss",
  "heavy bleeding",
  "uncontrolled bleeding",
  "internal bleeding",
  "coughing blood",
  "vomiting blood",
  "blood in stool",
  "rectal bleeding",

  // Cardiac / respiratory
  "chest pain",
  "chest tightness",
  "heart attack",
  "cardiac arrest",
  "shortness of breath",
  "cannot breathe",
  "difficulty breathing",
  "respiratory failure",
  "stopped breathing",

  // Neurological
  "head injury",
  "skull fracture",
  "brain injury",
  "unconscious",
  "loss of consciousness",
  "unresponsive",
  "seizure",
  "stroke",
  "paralysis",
  "sudden weakness",

  // Neurological (extended)
  "severe headache",
  "sudden numbness",
  "loss of speech",

  // Pain / pressure (extended)
  "unbearable stomach pain",
  "severe chest pressure",

  // Haemorrhage (extended)
  "profuse bleeding",

  // Trauma / acute emergencies
  "severe trauma",
  "road accident",
  "road traffic accident",
  "stabbed",
  "gunshot",
  "amputation",
  "crushed",
  "drowning",
  "anaphylaxis",
  "anaphylactic shock",
  "severe allergic reaction",
  "overdose",
  "poisoning",
  "sepsis",
  "coma",
  "heat stroke",

  // Obstetric
  "eclampsia",
  "preeclampsia",
  "heavy postpartum bleeding",
  "placenta previa",
];

/** Amharic high-acuity target phrases (Unicode substring match, as-is) */
const AM_PHRASES: string[] = [
  // ደም (blood / bleeding)
  "ደም",
  "ደም መፍሰስ",
  "ከባድ ደም",
  "የደም መፍሰስ",
  "ደም ማስታወክ",

  // ጭንቅላት (head)
  "የጭንቅላት ጉዳት",
  "ጭንቅላት ጉዳት",
  "የራስ ጉዳት",

  // ደረት (chest)
  "የደረት ህመም",
  "ደረት ህመም",
  "የልብ ህመም",

  // ንቃት / ንቃተ ህሊና (consciousness)
  "ንቃት ማጣት",
  "ሳያቃጥቡ ወደ ቀር",
  "ንቃተ ህሊና ማጣት",
  "ሳይነቃ ተቀምጧል",

  // መተንፈስ (breathing)
  "የመተንፈስ ችግር",
  "ለመተንፈስ ይቸግረኛል",
  "አልተነፈሰም",

  // ሌሎች ድንገተኛ (other critical)
  "ድንገተኛ ሽባ",
  "የስትሮክ ምልክት",
  "ከባድ አደጋ",
  "የትራፊክ አደጋ",
  "መርዝ",
  "ሴፕሲስ",
  "ኮማ",

  // ማዞር / ከባድ ደም / ከባድ ሆድ (extended critical — Amharic)
  "ማዞር",
  "ከፍተኛ ደም መፍሰስ",
  "ከባድ የሆድ ህመም",
];

// ─────────────────────────────────────────────────────────────────────────────
// MODERATE TIER
// ─────────────────────────────────────────────────────────────────────────────

/** English moderate-acuity target phrases (exact substring match, case-insensitive) */
const MODERATE_EN_PHRASES: string[] = [
  // Fever / temperature
  "persistent fever",

  // Pain (non-critical)
  "moderate pain",

  // GI
  "vomiting",

  // Respiratory (non-critical)
  "chronic cough",
];

/** Amharic moderate-acuity target phrases (Unicode substring match, as-is) */
const MODERATE_AM_PHRASES: string[] = [
  // ትኩሳት (fever)
  "ትኩሳት",

  // ማስመለስ (vomiting)
  "ማስመለስ",
];

/**
 * Evaluates whether a symptom string contains one or more high-acuity (CRITICAL) phrases.
 *
 * @param text - Raw symptom input from the form field.
 * @returns `{ matched: boolean; terms: string[] }` where `terms` lists every
 *           matched phrase for display in the warning banner.
 */
export function detectHighAcuity(text: string): { matched: boolean; terms: string[] } {
  if (!text || !text.trim()) return { matched: false, terms: [] };

  const lower = text.toLowerCase();
  const matchedTerms: string[] = [];

  // English — case-insensitive
  for (const phrase of EN_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      matchedTerms.push(phrase);
    }
  }

  // Amharic — direct Unicode substring (case doesn't apply)
  for (const phrase of AM_PHRASES) {
    if (text.includes(phrase)) {
      matchedTerms.push(phrase);
    }
  }

  return {
    matched: matchedTerms.length > 0,
    terms: [...new Set(matchedTerms)], // deduplicate
  };
}

/**
 * Three-tier severity classifier.
 *
 * Runs the CRITICAL lexicon first; only if no CRITICAL match is found does it
 * check the MODERATE lexicon. This guarantees CRITICAL always wins.
 *
 * @param text - Raw symptom input from the form field.
 * @returns `'CRITICAL' | 'MODERATE' | 'NORMAL'`
 */
export function detectSeverity(text: string): "CRITICAL" | "MODERATE" | "NORMAL" {
  if (!text || !text.trim()) return "NORMAL";

  const lower = text.toLowerCase();

  // ── CRITICAL check ───────────────────────────────────────────────────────
  for (const phrase of EN_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) return "CRITICAL";
  }
  for (const phrase of AM_PHRASES) {
    if (text.includes(phrase)) return "CRITICAL";
  }

  // ── MODERATE check ───────────────────────────────────────────────────────
  for (const phrase of MODERATE_EN_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) return "MODERATE";
  }
  for (const phrase of MODERATE_AM_PHRASES) {
    if (text.includes(phrase)) return "MODERATE";
  }

  return "NORMAL";
}
