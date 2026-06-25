/**
 * MyHealthID Localization Library
 * Bilingual (English/Amharic) Enums & Static Content
 * 
 * ✅ Use this file for: Static enum translations, role descriptions, facility types
 * ✅ Pattern: Store in i18n JSON, use helper function to access
 */

// ═════════════════════════════════════════════════════════════════════════════
// Healthcare Professional Roles (21+ Roles with Amharic Translations)
// ═════════════════════════════════════════════════════════════════════════════

export const HEALTHCARE_ROLES = {
  // ─── Clinical Medical Roles ───
  GENERAL_PRACTITIONER: {
    en: "General Practitioner (GP / Medical Doctor)",
    am: "አጠቃላይ ሐኪም",
    shortEn: "GP / Doctor",
    shortAm: "ሐኪም",
  },
  MEDICAL_SPECIALIST: {
    en: "Medical Specialist / Consultant",
    am: "ስፔሻሊስት ሐኪም",
    shortEn: "Specialist",
    shortAm: "ስፔሻሊስት",
  },
  SUB_SPECIALIST: {
    en: "Sub-Specialist Doctor",
    am: "ሰብ-ስፔሻሊስት ሐኪም",
    shortEn: "Sub-Specialist",
    shortAm: "ሰብ-ስፔሳሊስት",
  },

  // ─── Nursing & Midwifery ───
  CLINICAL_NURSE: {
    en: "Clinical Nurse",
    am: "ክሊኒካል ነርስ",
    shortEn: "Nurse",
    shortAm: "ነርስ",
  },
  SPECIALIZED_NURSE: {
    en: "Specialized Nurse",
    am: "ልዩ ነርስ",
    shortEn: "Specialized Nurse",
    shortAm: "ልዩ ነርስ",
  },
  MIDWIFE: {
    en: "Midwife / Maternal & Child Health Nurse",
    am: "ወሊድ ባለሙያ / ማሕፀናና ሕፃናት ነርስ",
    shortEn: "Midwife",
    shortAm: "ወሊድ ባለሙያ",
  },

  // ─── Public Health ───
  HEALTH_EXTENSION_WORKER: {
    en: "Health Extension Worker (HEW)",
    am: "የጤና ኤክስቴንሽን ባለሙያ",
    shortEn: "HEW",
    shortAm: "ጤና ባለሙያ",
  },
  HEALTH_OFFICER: {
    en: "Health Officer (HO)",
    am: "ጤና መኮንን",
    shortEn: "Health Officer",
    shortAm: "ጤና መኮንን",
  },

  // ─── Diagnostic Services ───
  LABORATORY_TECHNICIAN: {
    en: "Laboratory Technician",
    am: "የላቦራቶሪ ቴክኒሻን",
    shortEn: "Lab Technician",
    shortAm: "ላቦራቶሪ ቴክኒሻን",
  },
  LABORATORY_TECHNOLOGIST: {
    en: "Laboratory Technologist",
    am: "የላቦራቶሪ ቴክኖሎጂስት",
    shortEn: "Lab Technologist",
    shortAm: "ላቦራቶሪ ቴክኖሎጂስት",
  },
  RADIOGRAPHER: {
    en: "Radiographer / X-Ray Technician",
    am: "የራጅ ባለሙያ",
    shortEn: "Radiographer",
    shortAm: "ራጅ ባለሙያ",
  },

  // ─── Specialized Clinical ───
  ANESTHETIST: {
    en: "Anesthetist / Anesthesiologist",
    am: "ማደንዘዣ ባለሙያ",
    shortEn: "Anesthetist",
    shortAm: "ማደንዘዣ",
  },
  INTEGRATED_EMERGENCY_SURGICAL_OFFICER: {
    en: "Integrated Emergency Surgical Officer (IESO)",
    am: "የተቀናጀ ድንገተኛ ቀዶ ጥገና ባለሙያ",
    shortEn: "IESO",
    shortAm: "ኦፔሬ ባለሙያ",
  },

  // ─── Pharmacy ───
  PHARMACIST: {
    en: "Pharmacist",
    am: "ፋርማሲስት",
    shortEn: "Pharmacist",
    shortAm: "ፋርማሲስት",
  },

  // ─── Administration & Management ───
  HOSPITAL_CEO: {
    en: "Hospital CEO",
    am: "ሆስፒታል ሲኢኦ",
    shortEn: "CEO",
    shortAm: "ሲኢኦ",
  },
  IT_HIS_ADMIN: {
    en: "IT / HIS Administrator",
    am: "አይቲ / የጤና መረጃ ስርዓት አስተዳደር",
    shortEn: "IT Admin",
    shortAm: "አይቲ አስተዳደር",
  },
  FINANCE_INSURANCE: {
    en: "Finance & Insurance Officer",
    am: "የፋይናንስ እና ኢንሹራንስ ሠራተኛ",
    shortEn: "Finance Officer",
    shortAm: "የፋይናንስ ሠራተኛ",
  },

  // ─── Support Services ───
  RECEPTIONIST: {
    en: "Receptionist",
    am: "አስተናጋጅ",
    shortEn: "Receptionist",
    shortAm: "አስተናጋጅ",
  },
  CARD_ROOM_CLERK: {
    en: "Card Room Clerk / Medical Records Clerk",
    am: "የካርድ ክፍል ሰራተኛ",
    shortEn: "Card Room Clerk",
    shortAm: "ካርድ ክፍል ሰራተኛ",
  },
  AMBULANCE_DRIVER: {
    en: "Ambulance Driver",
    am: "የአምቡላንስ አሽከርካሪ",
    shortEn: "Driver",
    shortAm: "አሽከርካሪ",
  },
  SECURITY_GUARD: {
    en: "Security Guard",
    am: "የጥበቃ ሰራተኛ",
    shortEn: "Security",
    shortAm: "ጥበቃ",
  },
  CLEANER: {
    en: "Cleaner / Janitor",
    am: "የፅዳት ሰራተኛ",
    shortEn: "Cleaner",
    shortAm: "ዝናብ ሰራተኛ",
  },
  SYSTEM_ADMINISTRATOR: {
    en: "System Administrator",
    am: "ስርዓት አስተዳዳሪ",
    shortEn: "Sys Admin",
    shortAm: "ስርዓት አስተዳዳሪ",
  },
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// Facility Ownership Classification
// ═════════════════════════════════════════════════════════════════════════════

export const FACILITY_OWNERSHIP_TYPES = {
  PUBLIC: {
    en: "Public",
    am: "የመንግስት",
    description: {
      en: "Government-owned health facility",
      am: "የመንግስት የጤና ተቋም",
    },
  },
  PRIVATE: {
    en: "Private",
    am: "የግል",
    description: {
      en: "Privately-owned health facility",
      am: "ግል ባለቤትነት ያለበት የጤና ተቋም",
    },
  },
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// Facility Service Type Classification (9 Categories)
// ═════════════════════════════════════════════════════════════════════════════

export const FACILITY_SERVICE_TYPES = {
  HEALTH_POST: {
    en: "Health Post",
    am: "ጤና ኬላ",
    shortEn: "Health Post",
    shortAm: "ጤና ኬላ",
    tier: "primary",
    capacity: "Small",
  },
  HEALTH_CENTER: {
    en: "Health Center",
    am: "ጤና ጣቢያ",
    shortEn: "Health Center",
    shortAm: "ጤና ጣቢያ",
    tier: "secondary",
    capacity: "Medium",
  },
  PRIMARY_HOSPITAL: {
    en: "Primary Hospital",
    am: "የመጀመሪያ ደረጃ ሆስፒታል",
    shortEn: "Primary Hospital",
    shortAm: "የመጀመሪያ ደረጃ ሆስፒታል",
    tier: "secondary",
    capacity: "Medium",
  },
  GENERAL_HOSPITAL: {
    en: "General Hospital",
    am: "አጠቃላይ ሆስፒታል",
    shortEn: "General Hospital",
    shortAm: "አጠቃላይ ሆስፒታል",
    tier: "tertiary",
    capacity: "Large",
  },
  SPECIALIZED_HOSPITAL: {
    en: "Specialized Hospital",
    am: "ልዩ ሆስፒታል",
    shortEn: "Specialized Hospital",
    shortAm: "ልዩ ሆስፒታል",
    tier: "tertiary",
    capacity: "Large",
  },
  REFERRAL_HOSPITAL: {
    en: "Referral Hospital",
    am: "ሪፈራል ሆስፒታል",
    shortEn: "Referral Hospital",
    shortAm: "ሪፈራል ሆስፒታል",
    tier: "quaternary",
    capacity: "Large",
  },
  PRIMARY_CLINIC: {
    en: "Primary Clinic",
    am: "መካከለኛ ክሊኒክ",
    shortEn: "Primary Clinic",
    shortAm: "መካከለኛ ክሊኒክ",
    tier: "primary",
    capacity: "Small",
  },
  SPECIALTY_CLINIC: {
    en: "Specialty Clinic",
    am: "ልዩ ክሊኒክ",
    shortEn: "Specialty Clinic",
    shortAm: "ልዩ ክሊኒክ",
    tier: "secondary",
    capacity: "Small-Medium",
  },
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get translated value for healthcare role
 */
export function getHealthcareRoleTranslation(
  roleKey: keyof typeof HEALTHCARE_ROLES,
  lang: "en" | "am" | "EN" | "AM" = "en",
  format: "full" | "short" = "full"
): string {
  const role = HEALTHCARE_ROLES[roleKey];
  if (!role) return roleKey;

  const normalizedLang = lang.toLowerCase() as "en" | "am";

  if (format === "short") {
    return normalizedLang === "en" ? role.shortEn : role.shortAm;
  }
  return normalizedLang === "en" ? role.en : role.am;
}

/**
 * Get translated value for facility ownership type
 */
export function getFacilityOwnershipTranslation(
  ownershipKey: keyof typeof FACILITY_OWNERSHIP_TYPES,
  lang: "en" | "am" | "EN" | "AM" = "en"
): string {
  const ownership = FACILITY_OWNERSHIP_TYPES[ownershipKey];
  if (!ownership) return ownershipKey;
  const normalizedLang = lang.toLowerCase() as "en" | "am";
  return normalizedLang === "en" ? ownership.en : ownership.am;
}

/**
 * Get translated value for facility service type
 */
export function getFacilityServiceTypeTranslation(
  serviceTypeKey: keyof typeof FACILITY_SERVICE_TYPES,
  lang: "en" | "am" | "EN" | "AM" = "en",
  format: "full" | "short" = "full"
): string {
  const serviceType = FACILITY_SERVICE_TYPES[serviceTypeKey];
  if (!serviceType) return serviceTypeKey;

  const normalizedLang = lang.toLowerCase() as "en" | "am";

  if (format === "short") {
    return normalizedLang === "en" ? serviceType.shortEn : serviceType.shortAm;
  }
  return normalizedLang === "en" ? serviceType.en : serviceType.am;
}

export const FACILITY_SERVICE_TYPE_KEYS = Object.keys(FACILITY_SERVICE_TYPES) as Array<keyof typeof FACILITY_SERVICE_TYPES>;

export const HEALTHCARE_ROLE_KEYS = Object.keys(HEALTHCARE_ROLES) as Array<keyof typeof HEALTHCARE_ROLES>;

export const CLINICAL_ROLES = [
  "GENERAL_PRACTITIONER",
  "MEDICAL_SPECIALIST",
  "SUB_SPECIALIST",
  "HEALTH_OFFICER",
  "IESO",
] as const;

export const TRIAGE_ROLES = [
  "CLINICAL_NURSE",
  "SPECIALIZED_NURSE",
  "MIDWIFE",
] as const;

export const LAB_ROLES = [
  "LABORATORY_TECHNICIAN",
  "LABORATORY_TECHNOLOGIST",
] as const;

export const PHARMACY_ROLES = ["PHARMACIST"] as const;

export const REGISTRATION_ROLES = ["RECEPTIONIST", "CARD_ROOM_CLERK"] as const;

export const ADMIN_ROLES = ["IT_HIS_ADMIN", "HOSPITAL_CEO"] as const;

export const SYSTEM_ADMIN_ROLES = ["SYSTEM_ADMINISTRATOR"] as const;

export const LEGACY_ROLE_MAP: Record<string, keyof typeof HEALTHCARE_ROLES> = {
  ADMIN: "HOSPITAL_CEO",
  DOCTOR: "GENERAL_PRACTITIONER",
  NURSE: "CLINICAL_NURSE",
  LAB_TECH: "LABORATORY_TECHNICIAN",
  RECEPTIONIST: "RECEPTIONIST",
  PHARMACIST: "PHARMACIST",
};

export function normalizeHealthcareRole(role: string): string {
  if (!role) return "";
  if (Object.prototype.hasOwnProperty.call(HEALTHCARE_ROLES, role)) {
    return role;
  }
  return LEGACY_ROLE_MAP[role] || role;
}

export const FACILITY_SERVICE_TYPE_FALLBACK: Record<string, keyof typeof FACILITY_SERVICE_TYPES> = {
  "Referral Hospital": "REFERRAL_HOSPITAL",
  "Regional Clinic": "PRIMARY_CLINIC",
  "Private Lab": "HEALTH_CENTER",
  Pharmacy: "SPECIALTY_CLINIC",
  PHCU: "HEALTH_POST",
};

export function normalizeFacilityServiceType(serviceType: string): string {
  if (!serviceType) return "";
  if (Object.prototype.hasOwnProperty.call(FACILITY_SERVICE_TYPES, serviceType)) {
    return serviceType;
  }
  return FACILITY_SERVICE_TYPE_FALLBACK[serviceType] || serviceType;
}

// ═════════════════════════════════════════════════════════════════════════════
// Bilingual Status/Appointment Labels
// ═════════════════════════════════════════════════════════════════════════════

export const APPOINTMENT_STATUS_LABELS = {
  PENDING_CONFIRMATION: { en: "Pending Confirmation", am: "ማረጋገጫ በመጠባበቅ ላይ" },
  SCHEDULED: { en: "Scheduled", am: "ቀጠሮ ተይዟል" },
  ARRIVED: { en: "Arrived", am: "ደርሷል" },
  CANCELLED: { en: "Cancelled", am: "ተሰርዟል" },
} as const;

export const APPOINTMENT_PRIORITY_LABELS = {
  ROUTINE: { en: "Routine", am: "ተራ" },
  URGENT: { en: "Urgent", am: "አስቸኳይ" },
  EMERGENCY: { en: "Emergency", am: "ድንገተኛ" },
} as const;

export const TRIAGE_STATUS_LABELS = {
  RED: { en: "Emergency (Red)", am: "ድንገተኛ (ቀይ)" },
  YELLOW: { en: "Urgent (Yellow)", am: "አስቸኳይ (ቢጫ)" },
  GREEN: { en: "Routine (Green)", am: "ተራ (አረንጓዴ)" },
  WAITING_FOR_TRIAGE: { en: "Waiting for Triage", am: "ለተሳሳት በመጠባበቅ ላይ" },
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// Region/Zone/Woreda Hierarchies (Sample - Expand as needed)
// ═════════════════════════════════════════════════════════════════════════════

export const REGIONS = {
  "Addis Ababa": { en: "Addis Ababa", am: "አዲስ አበባ" },
  "Amhara": { en: "Amhara", am: "አማራ" },
  "Oromia": { en: "Oromia", am: "ኦሮሞ" },
  "SNNPR": { en: "SNNPR", am: "ደቡብ ምስራቅ" },
  "Tigray": { en: "Tigray", am: "ትግራይ" },
  "Somali": { en: "Somali", am: "ሱማሌ" },
  "Djibouti": { en: "Djibouti", am: "ጂቡቲ" },
  "Harari": { en: "Harari", am: "ሐረሪ" },
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// Export All Enums as Single Object for easy access
// ═════════════════════════════════════════════════════════════════════════════

export const BILINGUAL_TRANSLATIONS = {
  healthcareRoles: HEALTHCARE_ROLES,
  facilityOwnershipTypes: FACILITY_OWNERSHIP_TYPES,
  facilityServiceTypes: FACILITY_SERVICE_TYPES,
  appointmentStatusLabels: APPOINTMENT_STATUS_LABELS,
  appointmentPriorityLabels: APPOINTMENT_PRIORITY_LABELS,
  triageStatusLabels: TRIAGE_STATUS_LABELS,
  regions: REGIONS,
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// Usage Examples
// ═════════════════════════════════════════════════════════════════════════════

/*
// Example 1: Get role translation in component
import { getHealthcareRoleTranslation } from "@/lib/locales/enums";

const roleLabel = getHealthcareRoleTranslation("GENERAL_PRACTITIONER", "am");
// Returns: "አጠቃላይ ሐኪም"

// Example 2: Get facility type translation
import { getFacilityServiceTypeTranslation } from "@/lib/locales/enums";

const facilityLabel = getFacilityServiceTypeTranslation("GENERAL_HOSPITAL", "en", "short");
// Returns: "General Hospital"

// Example 3: Use in component rendering
function UserBadge({ role, lang }) {
  const label = getHealthcareRoleTranslation(role, lang, "short");
  return <Badge>{label}</Badge>;
}

// Example 4: Use in form select options
const roleOptions = Object.entries(HEALTHCARE_ROLES).map(([key, value]) => ({
  value: key,
  label: lang === "am" ? value.am : value.en,
}));
*/
