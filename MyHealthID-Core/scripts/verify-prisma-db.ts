/**
 * Run: npx tsx scripts/verify-prisma-db.ts
 * Loads `.env.local` then `.env` and uses `lib/prisma.ts` (same URL rules as the app).
 */
import { config } from "dotenv";
import { resolve } from "node:path";

// Base env, then allow `.env.local` to override (Next.js convention).
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

import prisma from "../lib/prisma";

function prismaMeta(error: unknown): { code: string | null; message: string } {
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    const code =
      typeof o.code === "string" ? o.code : typeof o.errorCode === "string" ? o.errorCode : null;
    const message = typeof o.message === "string" ? o.message : String(error);
    return { code, message };
  }
  return { code: null, message: String(error) };
}

async function main() {
  try {
    const patientCount = await prisma.patient.count();
    console.log(JSON.stringify({ ok: true, patientCount, errorCode: null, message: null }, null, 2));
  } catch (error) {
    const { code, message } = prismaMeta(error);
    console.log(JSON.stringify({ ok: false, patientCount: null, errorCode: code, message }, null, 2));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
