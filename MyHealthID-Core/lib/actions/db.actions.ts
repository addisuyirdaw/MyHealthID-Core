"use server";

import prisma from "@/lib/prisma";

export type TestDbConnectionResult =
  | { ok: true; patientCount: number; errorCode: null; message: null }
  | { ok: false; patientCount: null; errorCode: string | null; message: string };

function prismaMeta(error: unknown): { code: string | null; message: string } {
  if (error && typeof error === "object") {
    const o = error as Record<string, unknown>;
    const code =
      typeof o.code === "string"
        ? o.code
        : typeof o.errorCode === "string"
          ? o.errorCode
          : null;
    const message = typeof o.message === "string" ? o.message : String(error);
    return { code, message };
  }
  return { code: null, message: String(error) };
}

/**
 * Lightweight DB check: counts patients. Surfaces Prisma error codes (e.g. P1001, P1011)
 * when the datasource URL or network path is invalid.
 */
export async function testDbConnection(): Promise<TestDbConnectionResult> {
  try {
    const patientCount = await prisma.patient.count();
    return { ok: true, patientCount, errorCode: null, message: null };
  } catch (error) {
    const { code, message } = prismaMeta(error);
    return { ok: false, patientCount: null, errorCode: code, message };
  }
}
