/**
 * Registration V2 — Shared Types
 * Used across RegistrationShell and all sub-components.
 */

export type IdentityMode = "FAYDA" | "NO_ID" | "EMERGENCY" | "MANUAL" | null;

/** Context detected from the session cookie — drives success screen actions. */
export type UserContext = "STAFF" | "CITIZEN" | "UNKNOWN";

export type ScanStep = "idle" | "scan_back" | "transition" | "scan_front" | "confirmation";
export type OcrStatus = "idle" | "scanning" | "verified" | "mismatch" | "failed" | "skipped";

export type ScanFeedback =
  | { variant: "idle" }
  | { variant: "info" | "success" | "error"; title: string; detail?: string };

/** Collected data for a registered patient — returned from the success modal. */
export interface RegisteredPatient {
  id: string;
  name: string;
  /** The patient-facing display ID (e.g. MHID-XXXXXX or FIN). */
  uniqueId: string;
  /** Stored national ID / FIN if applicable. */
  nationalId?: string;
  ward?: string;
  priorityLevel?: "EMERGENCY" | "URGENT" | "ROUTINE";
  organizationId?: string | null;
}

/** Shape of collected form data before calling registerPatient(). */
export interface RegistrationFormData {
  fullName: string;
  sex: string;
  /** ISO yyyy-mm-dd */
  dateOfBirth: string;
  /** Calculated from DOB if present, otherwise manually entered. */
  age: number;
  phoneNumber: string;
  addressRegion: string;
  addressZone: string;
  addressWoreda: string;
  addressKebele: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  password: string;
  /** Fayda FIN (12-digit) */
  faydaId: string;
  /** Fayda FCN (16-digit) */
  fcn: string;
  ward: string;
  chiefComplaint: string;
}
