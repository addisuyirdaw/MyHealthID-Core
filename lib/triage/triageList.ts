/**
 * Structured chief-complaint list for registration + triage display.
 *
 * **Replace labels with the exact English — አማርኛ strings from `emergecy term.doc` when available.**
 * Items 1–50: URGENT (Priority 1). Items 51–100: STANDARD (Priority 2).
 * Format: `"English — Amharic"` (em dash between languages).
 */

export type TriagePriority = 1 | 2;

export type TriageComplaintItem = {
  id: string;
  priority: TriagePriority;
  /** Bilingual display label: English — Amharic */
  label: string;
};

const dash = (en: string, am: string) => `${en} — ${am}`;

/** Priority 1 (URGENT): items 1–50 — first entries match the spec examples where provided. */
const URGENT_EN_AM: [string, string][] = [
  ["Loss of consciousness", "ንቃት ማጣት"],
  ["Chest pain", "የደረት ህመም"],
  ["Severe shortness of breath", "ከባድ የመተንፈስ ችግር"],
  ["Heavy or uncontrolled bleeding", "ከባድ ወይም የማይቆም ደም መፍሰስ"],
  ["Stroke symptoms (sudden weakness, speech trouble)", "የስትሮክ ምልክቶች (ድንገተኛ ድካም፣ ንግግር ችግር)"],
  ["Severe abdominal pain", "ከባድ የሆድ ህመም"],
  ["High fever with confusion", "ከፍተኛ ሙቀት ከማወቅ ችግር ጋር"],
  ["Suspected poisoning or overdose", "የመርዝ መጠቃት ወይም ከመጠን በላይ መድሃኒት"],
  ["Major trauma or road traffic accident", "ከባድ ጉዳት ወይም የመንገድ አደጋ"],
  ["Seizure lasting more than 5 minutes", "ከ5 ደቂቃ በላይ የሚቆይ ኮንቭልሽን"],
  ["Severe allergic reaction / anaphylaxis", "ከባድ አለርጂ ምላሽ"],
  ["Sudden severe headache (“thunderclap”)", "ድንገተኛ ከባድ የራስ ህመም"],
  ["Suicidal ideation with plan", "የራስ ግድያ ሀሳብ ከአቅድ ጋር"],
  ["Acute psychosis or aggression risk", "አካታች ስነ-ልቦና ወይም aggression አደጋ"],
  ["Pregnancy: severe pain or heavy bleeding", "እርጉት፦ ከባድ ህመም ወይም ከባድ ደም"],
  ["Newborn breathing difficulty", "ለአዲስ ልጅ የመተንፈስ ችግር"],
  ["Severe dehydration with shock signs", "ከባድ የውሃ ማጣት ከሽክ ችግር ምልክቶች"],
  ["Acute severe asthma attack", "አካታች ከባድ የአስም ጥቃት"],
  ["Crushing chest injury", "የደረት ከባድ ጉዳት"],
  ["Penetrating eye injury", "የዓይን ሹካ ጉዳት"],
  ["Amputation or digit partially severed", "አካል መቆረጥ ወይም ጣት ከፊል መቆረጥ"],
  ["Severe burns (face, airway, large area)", "ከባድ ቃጫ (ፊት፣ የመተንፈስ መንገድ፣ ሰፊ ቦታ)"],
  ["Drowning or near-drowning", "መስተጋብ ወይም ከመስተጋብ አጠገብ"],
  ["Electrical injury with loss of consciousness", "የኤሌክትሪክ ጉዳት ከንቃት መጣት ጋር"],
  ["Heat stroke", "የሙቀት ስትሮክ"],
  ["Hypoglycemia with confusion", "ዝቅተኛ የደም ስኳር ከማወቅ ችግር ጋር"],
  ["Acute severe vomiting with blood", "ከባድ ማስታወክ ከደም ጋር"],
  ["Acute urinary retention", "ድንገተኛ የሽንት ማቆም"],
  ["Testicular torsion suspected", "የትስቲስ ማዞር ተጠራጣሪ"],
  ["Acute flank pain with fever (possible sepsis)", "የጎን ህመም ከሙቀት (ሴፕሲስ ተጠራጣሪ)"],
  ["Immunocompromised with high fever", "የመከላከያ ስርዓት ድካም ከከፍተኛ ሙቀት"],
  ["Sickle cell crisis suspected", "የሲክል ሴል ቀውስ ተጠራጣሪ"],
  ["Acute severe back pain after fall", "ከመውደቅ በኋላ ከባድ የጀርባ ህመም"],
  ["Rapidly spreading skin infection", "በፍጥነት የሚስፋፋ የቆዳ ኢንፌክሽን"],
  ["Animal bite with deep wound", "የእንስሳት ክር ከጥልቅ ጉዳት"],
  ["Snake or venomous bite", "የእባብ ወይም መርዝ ያለ ክር"],
  ["Acute vision loss (one eye)", "ድንገተኛ የማየት ክብደት (አንድ ዓይን)"],
  ["Acute hearing loss", "ድንገተኛ የመስማት ክብደት"],
  ["Foreign body airway obstruction", "የመተንፈስ መንገድ መዝጋት"],
  ["Severe vertigo with neurological signs", "ከባድ ተራራማነት ከነርቮ ምልክቶች"],
  ["Acute limb ischemia (cold, pale, pulseless)", "የአካል ክፍል ደም መጥፋት (ቀዝ፣ ጨለማ፣ ምት የለም)"],
  ["Priapism", "ፕሪያፒዝም"],
  ["Acute severe pelvic pain (non-obstetric)", "ከባድ የወገብ ህመም (ከእርጉት ውጭ)"],
  ["Acute severe ear pain with fever", "ከባድ የጆሮ ህመም ከሙቀት"],
  ["Acute severe sore throat with drooling", "ከባድ የጉሮሮ ህመም ከ saliva መፍሰስ"],
  ["Acute jaundice with confusion", "ድንገተኛ ቢራቢሮ ከማወቅ ችግር"],
  ["Acute severe joint swelling after injury", "ከጉዳት በኋላ ከባድ የመጋጠሚያ ስፋፋ"],
  ["Acute monoarthritis with fever", "የአንድ መጋጠሚያ ህመም ከሙቀት"],
  ["Severe epistaxis not controlled", "የማይቆም ከፍተኛ የአፍንጫ ደም"],
  ["Acute severe dental abscess with swelling", "ከባድ የጥርስ ቁስል ከስፋት"],
  ["Acute corneal ulcer / chemical eye splash", "የኮርኒያ ቁስል / ኬሚካል ወደ ዓይን"],
  ["Acute severe dehydration in infant", "በሕፃን ላይ ከባድ የውሃ ማጣት"],
  ["Acute severe diarrhea in infant", "በሕፃን ላይ ከባድ ሰልስ"],
  ["Acute severe cough with cyanosis", "ከባድ ሳል ከሳይኖሲስ"],
  ["Acute chest tightness with sweating", "የደረት መጨቅቅ ከላብ ጋር"],
  ["Acute severe leg swelling one-sided", "በአንድ እግር ከባድ ስፋፋ"],
  ["Acute severe neck stiffness with fever", "ከባድ የአንገት ጥንካሬ ከሙቀት"],
  ["Acute severe fatigue with pallor", "ከባድ ድካም ከፈዛዛ"],
];

/** Priority 2 (STANDARD): items 51–100 — includes the spec “Common cold” example. */
const STANDARD_EN_AM: [string, string][] = [
  ["Common cold", "ቀላል ጉንፋን"],
  ["Mild cough without distress", "ቀላል ሳል ያለ ህመም"],
  ["Chronic medication refill", "የረጅም ጊዜ መድሃኒት እንደገና ማዘዣ"],
  ["Routine follow-up visit", "መደበኛ የክትትል ጉብኝት"],
  ["Minor skin rash without fever", "ትንሽ የቆዳ ራሽ ያለ ሙቀት"],
  ["Mild headache without red flags", "ቀላል የራስ ህመም ያለ አደጋ ምልክት"],
  ["Mild sore throat", "ቀላል የጉሮሮ ህመም"],
  ["Ear wax or mild ear discomfort", "የጆሮ ሰም ወይም ቀላል ህመም"],
  ["Minor sprain (able to bear weight)", "ትንሽ ስፕሪን (ክብደት ማቆም ይቻላል)"],
  ["Minor cut controlled with pressure", "ትንሽ ቁስል በመጫን የተቆጠጠ"],
  ["Dental check-up", "የጥርስ ምርመራ"],
  ["Vision test / glasses update", "የማየት ፈተና / የመነጽር ማዘመን"],
  ["Chronic stable hypertension follow-up", "የረጅም ጊዜ ጸደቅ የደም ጫና ክትትል"],
  ["Diabetes routine review", "የስኳር በሽታ መደበኛ ክትትል"],
  ["Thyroid routine labs discussion", "የታይሮይድ መደበኛ ላብ ውይይት"],
  ["Asthma stable review", "የአስም የተረጋጋ ክትትል"],
  ["Eczema mild flare", "ኢክዜማ ቀላል flare"],
  ["Acne follow-up", "አክኒ ክትትል"],
  ["Minor constipation", "ቀላል ኮንስቲፓሽን"],
  ["Mild heartburn", "ቀላል ሃርትበርን"],
  ["Travel vaccination question", "የጉዞ ክትባት ጥያቄ"],
  ["Work medical certificate", "የስራ የህክምና ሰርተፊኬት"],
  ["BPH urinary symptoms stable", "BPH የሽንት ምልክቶች የተረጋጉ"],
  ["Mild joint ache chronic", "የረጅም ጊዜ ቀላል የመጋጠሚያ ህመም"],
  ["Vitamin deficiency screening request", "ቫይታሚን እጥረት ምርመራ ጥያቄ"],
  ["Weight management advice", "የክብደት አስተዳደር ምክር"],
  ["Smoking cessation counseling", "ሲጃራ ማቆም ምክር"],
  ["Sleep hygiene advice", "የእንቅልፍ ጤና ምክር"],
  ["Mild anxiety without crisis", "ቀላል አደንዳን ያለ ቀውስ"],
  ["Minor dyspepsia", "ትንሽ ዲስፔፕሲያ"],
  ["Hemorrhoids mild symptoms", "ሄሞሮይድ ቀላል ምልክቶች"],
  ["Mild urinary frequency without pain", "ቀላል የሽንት ብዛት ያለ ህመም"],
  ["Routine antenatal visit", "መደበኛ የእርጉት ክትትል"],
  ["Routine child growth monitoring", "መደበኛ የሕፃን እድገት ክትትል"],
  ["Minor insect bite local reaction", "ትንሽ የሚስ አንባቢ አካባቢ ምላሽ"],
  ["Mild sunburn", "ቀላል የፀሐይ ቃጫ"],
  ["Minor fungal skin infection", "ትንሽ ፈንጋዊ የቆዳ ኢንፌክሽን"],
  ["Routine cervical screening discussion", "መደበኛ የሴት ምርመራ ውይይት"],
  ["Contraception counseling", "የመከላከያ ምክር"],
  ["Minor lip dryness / cheilitis", "ትንሽ የከንፈር ደረቅ"],
  ["Mild nasal allergy symptoms", "ቀላል የአፍንጫ አለርጂ ምልክቶች"],
  ["Foot care for diabetes (no ulcer)", "ለስኳር የእግር እንክብካቤ (ቁስል የለም)"],
  ["Routine lipid review", "መደበኛ የሊፒድ ክትትል"],
  ["Mild anemia follow-up stable", "ቀላል እንድም ያለው ክትትል"],
  ["Physiotherapy referral stable pain", "ፊዚዮቴራፒ ማስላለፍ የተረጋጋ ህመም"],
  ["Minor wart removal consult", "የማህተም removal ውይይት"],
  ["Mild gastritis symptoms", "ቀላል ጋስትራይቲስ ምልክቶች"],
  ["Routine TB contact query", "መደበኛ የቲቢ ኮንታክት ጥያቄ"],
  ["Travel diarrhea resolved query", "የጉዞ ሰልስ ተፈውሶ ጥያቄ"],
  ["Minor bruise after minor trauma", "ከትንሽ ጉዳት በኋላ ቀላል ሰምባራ"],
  ["Mild eye irritation (no injury)", "ቀላል የዓይን ማቃጠል (ጉዳት የለም)"],
  ["Routine HIV test request", "መደበኛ HIV ፈተና ጥያቄ"],
  ["Hepatitis B vaccine dose", "ሄፓታይቲስ B ክትባት"],
  ["Minor back strain without neuro signs", "ትንሽ የጀርባ ጭንንብል ያለ ነርቮ ምልክት"],
];

function padPairs(
  base: [string, string][],
  target: number,
  prefixEn: string,
  prefixAm: string
): [string, string][] {
  const out = [...base];
  let i = base.length;
  while (out.length < target) {
    i += 1;
    out.push([`${prefixEn} ${i}`, `${prefixAm} ${i}`]);
  }
  return out.slice(0, target);
}

const URGENT_50 =
  URGENT_EN_AM.length >= 50
    ? URGENT_EN_AM.slice(0, 50)
    : padPairs(URGENT_EN_AM, 50, "Urgent symptom (replace from doc)", "አስቸኳይ ምልክት (ከሰነድ ይተኩ)");
const STANDARD_50 =
  STANDARD_EN_AM.length >= 50
    ? STANDARD_EN_AM.slice(0, 50)
    : padPairs(STANDARD_EN_AM, 50, "Routine symptom (replace from doc)", "መደበኛ ምልክት (ከሰነድ ይተኩ)");

export const TRIAGE_LIST: TriageComplaintItem[] = [
  ...URGENT_50.map(([en, am], i) => ({
    id: `cc-${String(i + 1).padStart(3, "0")}`,
    priority: 1 as TriagePriority,
    label: dash(en, am),
  })),
  ...STANDARD_50.map(([en, am], i) => ({
    id: `cc-${String(i + 51).padStart(3, "0")}`,
    priority: 2 as TriagePriority,
    label: dash(en, am),
  })),
];

export function findTriageComplaintByLabel(label: string): TriageComplaintItem | undefined {
  return TRIAGE_LIST.find((t) => t.label === label);
}
