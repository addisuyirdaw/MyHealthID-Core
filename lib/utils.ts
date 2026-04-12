import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
