import crypto from "crypto";

// Fallback secret for session token verification
const SESSION_SECRET = process.env.SESSION_SECRET || "mhi-secure-patient-portal-session-secret-key-987654321";

/**
 * Signs a stateless payload and returns a token string.
 * Format: base64(payload).signature
 */
export function signToken(payload: { patientId: string; role: string; iat: number; exp: number }): string {
  const data = JSON.stringify(payload);
  const base64Payload = Buffer.from(data).toString("base64");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(base64Payload)
    .digest("hex");
  return `${base64Payload}.${signature}`;
}

/**
 * Verifies a stateless token string and returns the parsed payload if valid.
 * Returns null if the signature is invalid or the token has expired.
 */
export function verifyToken(token: string): { patientId: string; role: string; iat: number; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    
    const [base64Payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(base64Payload)
      .digest("hex");
      
    if (signature !== expectedSignature) return null;
    
    const payloadStr = Buffer.from(base64Payload, "base64").toString("utf8");
    const payload = JSON.parse(payloadStr);
    
    // Check expiration
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    return null;
  }
}
