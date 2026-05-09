import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import path from "path";
import { promises as fs } from "fs";

type VerifiedRegistryRecord = {
  fin: string;
  fcn: string;
  fullName: string;
  dateOfBirth: string; // ISO
  gender: string;
};

function isDigitsExact(value: string, len: number) {
  return new RegExp(`^\\d{${len}}$`).test(value);
}

// Standard Luhn (ISO 7812-style). Fayda FIN/FCN are not documented to use Luhn; real cards often fail this check.
function luhnIsValid(value: string) {
  if (!/^\d+$/.test(value)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = value.length - 1; i >= 0; i--) {
    let digit = Number(value[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

async function loadTestIds(): Promise<VerifiedRegistryRecord[] | null> {
  try {
    const filePath = path.join(process.cwd(), "test_ids.json");
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as VerifiedRegistryRecord[];
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const finRaw = String(body?.fin ?? "").replace(/\D/g, "");
    const fcnRaw = String(body?.fcn ?? "").replace(/\D/g, "");

    if (!isDigitsExact(finRaw, 12)) {
      return NextResponse.json({ success: false, error: "Invalid FIN: must be exactly 12 digits." }, { status: 400 });
    }
    if (!isDigitsExact(fcnRaw, 16)) {
      return NextResponse.json({ success: false, error: "Invalid FCN: must be exactly 16 digits." }, { status: 400 });
    }

    // Optional strict mode for synthetic test IDs only. Real Fayda cards should NOT use Luhn.
    // Set FAYDA_LUHN_REQUIRED=true only if you intentionally generate FIN/FCN pairs that pass Luhn.
    const luhnRequired = String(process.env.FAYDA_LUHN_REQUIRED ?? "").toLowerCase() === "true";
    if (luhnRequired) {
      if (!luhnIsValid(finRaw) || !luhnIsValid(fcnRaw)) {
        return NextResponse.json({ success: false, error: "Invalid ID: check-digit validation failed." }, { status: 400 });
      }
    }

    const useTestIds = String(process.env.USE_TEST_IDS ?? "").toLowerCase() === "true";
    if (useTestIds) {
      const testIds = await loadTestIds();
      const match = testIds?.find((r) => r.fin === finRaw && r.fcn === fcnRaw);
      if (!match) {
        return NextResponse.json(
          { success: false, error: "Unauthorized Identity: Not found in National Records." },
          { status: 403 }
        );
      }
      return NextResponse.json({
        success: true,
        fin: finRaw,
        fcn: fcnRaw,
        fullName: match.fullName,
        dateOfBirth: match.dateOfBirth,
        gender: match.gender,
        source: "test_ids.json",
      });
    }

    const record = await prisma.verifiedRegistry.findFirst({
      where: { fin: finRaw, fcn: fcnRaw },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Unauthorized Identity: Not found in National Records." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      fin: record.fin,
      fcn: record.fcn,
      fullName: record.fullName,
      dateOfBirth: record.dateOfBirth.toISOString(),
      gender: record.gender,
      source: "verified_registry",
    });
  } catch (error) {
    console.error("Fayda verify error:", error);
    return NextResponse.json({ success: false, error: "Verification service unavailable." }, { status: 500 });
  }
}

