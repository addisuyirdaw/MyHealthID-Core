/**
 * Fayda / Ethiopian national ID **format** checks (length + digits only).
 * This is not cryptographic proof of issuance — it lets staff trust typed data
 * matches official ID layout before registry API verification.
 */

const DIGITS_ONLY = /^\d+$/;

/** FIN on Fayda card: exactly 12 digits. */
export function isFaydaFin12(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  return d.length === 12 && DIGITS_ONLY.test(d);
}

/** FCN (front barcode): exactly 16 digits. */
export function isFaydaFcn16(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  return d.length === 16 && DIGITS_ONLY.test(d);
}

/** True if either field matches official length (for “Fayda format verified” UI). */
export function hasFaydaFormatVisualTrust(finRaw: string, fcnRaw: string): boolean {
  return isFaydaFin12(finRaw) || isFaydaFcn16(fcnRaw);
}
