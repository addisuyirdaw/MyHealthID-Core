"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Run `npx prisma generate` after pulling the `VerifiedCitizen` model (Windows may need closing other Node processes). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- delegate exists after `prisma generate`
const verifiedCitizen = (prisma as any).verifiedCitizen;

/** Normalize phone for lookup: digits only, last 9–12 retained for local match. */
export async function normalizePhoneDigits(raw: string | null | undefined): Promise<string | null> {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, "");
  if (d.length < 9) return null;
  return d.length > 12 ? d.slice(-12) : d;
}

export async function upsertVerifiedCitizenFromRegistration(input: {
  nationalFin: string | null | undefined;
  phoneRaw: string | null | undefined;
  fullName: string;
}) {
  const fin = input.nationalFin ? String(input.nationalFin).replace(/\D/g, "") : null;
  const fin12 = fin && fin.length === 12 ? fin : fin && fin.length === 16 ? fin.slice(0, 12) : fin;
  const phoneDigits = await normalizePhoneDigits(input.phoneRaw);
  if (!fin12 && !phoneDigits) return { ok: true as const, skipped: true as const };

  const existing = await verifiedCitizen.findFirst({
    where: {
      OR: [...(fin12 ? [{ nationalFin: fin12 }] : []), ...(phoneDigits ? [{ phoneDigits }] : [])],
    },
  });

  if (existing) {
    await verifiedCitizen.update({
      where: { id: existing.id },
      data: {
        fullName: input.fullName.trim(),
        nationalFin: fin12 ?? existing.nationalFin,
        phoneDigits: phoneDigits ?? existing.phoneDigits,
      },
    });
  } else {
    await verifiedCitizen.create({
      data: {
        fullName: input.fullName.trim(),
        nationalFin: fin12,
        phoneDigits,
      },
    });
  }
  revalidatePath("/");
  return { ok: true as const, skipped: false as const };
}

export type CitizenPassportResult =
  | { ok: true; citizen: { fullName: string; nationalFin: string | null; phoneDigits: string | null }; patients: any[] }
  | { ok: false; error: string };

/**
 * Staff lookup: FIN (12 digits) or phone digits. Returns verified row + active patient history.
 */
export async function lookupCitizenPassport(query: string): Promise<CitizenPassportResult> {
  const raw = query.trim();
  if (!raw) return { ok: false, error: "Enter a phone number or FIN." };
  const digits = raw.replace(/\D/g, "");
  const phoneDigits = digits.length >= 9 ? (digits.length > 12 ? digits.slice(-12) : digits) : null;
  const fin = digits.length === 12 || digits.length === 16 ? digits.slice(0, 12) : null;

  const citizen = await verifiedCitizen.findFirst({
    where: {
      OR: [
        ...(fin ? [{ nationalFin: fin }] : []),
        ...(phoneDigits ? [{ phoneDigits }] : []),
      ],
    },
  });

  if (!citizen) {
    return { ok: false, error: "No verified citizen found for this phone or FIN." };
  }

  const patientOr: any[] = [];
  if (citizen.nationalFin) {
    patientOr.push({ faydaId: citizen.nationalFin }, { nationalId: citizen.nationalFin });
  }
  if (citizen.phoneDigits) {
    patientOr.push(
      { phoneNumber: { contains: citizen.phoneDigits } },
      { emergencyContactPhone: { contains: citizen.phoneDigits } }
    );
  }

  const patients =
    patientOr.length === 0
      ? []
      : await prisma.patient.findMany({
          where: {
            status: "ACTIVE",
            OR: patientOr,
          },
          orderBy: { updatedAt: "desc" },
          take: 25,
          include: {
            vitals: { orderBy: { createdAt: "desc" }, take: 1 },
            screenings: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        });

  return {
    ok: true,
    citizen: {
      fullName: citizen.fullName,
      nationalFin: citizen.nationalFin,
      phoneDigits: citizen.phoneDigits,
    },
    patients: JSON.parse(JSON.stringify(patients)),
  };
}
