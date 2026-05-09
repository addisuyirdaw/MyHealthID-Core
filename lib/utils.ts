import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { randomBytes } from "crypto"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a standard Health ID in the format HLT-XXXXXX
 * where XXXXXX is a 6-digit number.
 */
export function generateHealthId(): string {
  const min = 100000;
  const max = 999999;
  const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
  return `HLT-${randomNum}`;
}

/**
 * Generates a unique internal ID for minors in the format CH-YYYY-XXXX
 */
export function generateChildId(): string {
  const year = new Date().getFullYear();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CH-${year}-${randomStr}`;
}

/** Public-facing ID for citizens without a national ID: MHID- + 6 chars (Crockford-style alphabet). */
const MHID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateMhidSuffix(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += MHID_ALPHABET[bytes[i]! % MHID_ALPHABET.length]!;
  }
  return out;
}

export function formatMyHealthPublicId(suffix: string): string {
  return `MHID-${suffix}`;
}
