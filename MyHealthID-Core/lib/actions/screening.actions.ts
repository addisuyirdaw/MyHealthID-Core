"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { evaluateScreening } from "@/lib/screening/clinicalEngine";
import { getScreeningProgram } from "@/lib/screening/screeningCatalog";
import type { Prisma } from "@prisma/client";

export async function resolvePatientIdByIdentifier(identifier: string) {
  const raw = identifier.trim();
  if (!raw) return { ok: false as const, error: "Empty identifier." };
  const p = await prisma.patient.findFirst({
    where: {
      OR: [
        { id: raw },
        { healthId: raw },
        { nationalId: raw },
        { faydaId: raw },
        { fcn: raw },
        { hospitalId: raw },
        { internalId: raw },
        { externalSystemId: raw },
      ],
    },
    select: { id: true, fullName: true, healthId: true },
  });
  if (!p) return { ok: false as const, error: "Patient not found." };
  return { ok: true as const, patient: p };
}

export async function submitScreening(input: {
  patientId: string;
  screeningType: string;
  answers: Record<string, unknown>;
}) {
  const program = getScreeningProgram(input.screeningType);
  if (!program) {
    return { ok: false as const, error: "Unknown screening type." };
  }

  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) {
    return { ok: false as const, error: "Patient not found." };
  }

  const outcome = evaluateScreening(program.type, input.answers);

  const guidanceText: Prisma.InputJsonValue = outcome.guidance;
  const diabetesInterpretation: Prisma.InputJsonValue | undefined =
    program.type === "DIABETES" && outcome.diabetesNote
      ? outcome.diabetesNote
      : undefined;

  const computedDetails: Prisma.InputJsonValue = {
    ...outcome.details,
    bmiClass: outcome.bmiClass,
  };

  const [screening] = await prisma.$transaction([
    prisma.screening.create({
      data: {
        patientId: input.patientId,
        screeningType: program.type,
        answers: input.answers as Prisma.InputJsonValue,
        triageResult: outcome.triageResult,
        riskScore: outcome.riskScore,
        interruptedEmergency: outcome.interruptedEmergency,
        guidanceText,
        sbp: outcome.sbp ?? null,
        dbp: outcome.dbp ?? null,
        weightKg: outcome.weightKg ?? null,
        heightCm: outcome.heightCm ?? null,
        bmi: outcome.bmi ?? null,
        bpStageLabel: outcome.bpStage?.en ?? null,
        diabetesInterpretation: diabetesInterpretation ?? undefined,
        computedDetails,
      },
    }),
    prisma.patient.update({
      where: { id: input.patientId },
      data: {
        emergencyFlag: outcome.interruptedEmergency ? true : patient.emergencyFlag,
      },
    }),
  ]);

  revalidatePath("/triage");
  revalidatePath("/queue");
  revalidatePath(`/patients/${input.patientId}/dashboard`);
  revalidatePath(`/manage/${input.patientId}`);
  revalidatePath(`/doctor/patient/${input.patientId}`);

  return {
    ok: true as const,
    screeningId: screening.id,
    outcome: {
      triageResult: outcome.triageResult,
      interruptedEmergency: outcome.interruptedEmergency,
      riskScore: outcome.riskScore,
      guidance: outcome.guidance,
      bmi: outcome.bmi,
      bmiClass: outcome.bmiClass,
      bpStage: outcome.bpStage,
      bpCrisis: outcome.bpCrisis,
      diabetesNote: outcome.diabetesNote,
    },
  };
}

export async function getPatientScreenings(patientId: string, take = 20) {
  const rows = await prisma.screening.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return JSON.parse(JSON.stringify(rows));
}
