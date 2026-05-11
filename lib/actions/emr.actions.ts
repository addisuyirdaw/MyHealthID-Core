"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MedicalTimelineEntryType, Ward, type Prisma } from "@prisma/client";
import { EMR_SECTION_IDS, type EmrSectionId } from "@/lib/emr/emrSections";

function isEmrSection(s: string): s is EmrSectionId {
  return (EMR_SECTION_IDS as readonly string[]).includes(s);
}

function clampName(name: string) {
  const n = name.trim();
  if (n.length < 2) throw new Error("Professional name must be at least 2 characters.");
  if (n.length > 120) return n.slice(0, 120);
  return n;
}

export async function appendTimelineNote(input: {
  patientId: string;
  professionalName: string;
  emrSection: string;
  entryType: MedicalTimelineEntryType;
  title?: string;
  body: string;
  structuredData?: Prisma.InputJsonValue;
  logEntry?: string;
}) {
  if (!isEmrSection(input.emrSection)) throw new Error("Invalid EMR section.");
  const body = input.body.trim();
  if (!body) throw new Error("Body is required.");
  const professionalName = clampName(input.professionalName);
  const logEntry =
    input.logEntry?.trim() ||
    (input.title ? `${input.title}: ${body.slice(0, 200)}` : body.slice(0, 240));

  const row = await prisma.medicalTimelineEntry.create({
    data: {
      patientId: input.patientId,
      professionalName,
      logEntry,
      entryType: input.entryType,
      emrSection: input.emrSection,
      title: input.title?.trim() || null,
      body,
      structuredData: input.structuredData ?? undefined,
    },
  });

  revalidatePath(`/manage/${input.patientId}`);
  revalidatePath(`/doctor/patient/${input.patientId}`);
  return { ok: true as const, id: row.id };
}

function parseBp(bp: string): { sys: number; dia: number } | null {
  const m = bp.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  return { sys: Number(m[1]), dia: Number(m[2]) };
}

function computeBmi(weightKg: number, heightCm: number): number | undefined {
  if (!heightCm || heightCm <= 0) return undefined;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export async function appendVitalsWithTimeline(input: {
  patientId: string;
  professionalName: string;
  bp: string;
  pulse: number;
  rr: number;
  temp: number;
  spO2: number;
  weightKg?: number;
  heightCm?: number;
  painLevel?: number;
}) {
  const professionalName = clampName(input.professionalName);
  if (!parseBp(input.bp)) throw new Error("BP must be like 120/80.");

  let bmi: number | undefined;
  if (input.weightKg != null && input.heightCm != null) {
    bmi = computeBmi(input.weightKg, input.heightCm);
  }

  const vital = await prisma.vitals.create({
    data: {
      patientId: input.patientId,
      bp: input.bp.trim(),
      pulse: input.pulse,
      rr: input.rr,
      temp: input.temp,
      spO2: input.spO2,
      bmi: bmi ?? null,
      painLevel: input.painLevel ?? null,
      weightKg: input.weightKg ?? null,
      heightCm: input.heightCm ?? null,
    },
  });

  await prisma.medicalTimelineEntry.create({
    data: {
      patientId: input.patientId,
      professionalName,
      entryType: MedicalTimelineEntryType.VITALS,
      emrSection: "vitals",
      title: "Vitals set",
      body: `BP ${input.bp}, PR ${input.pulse}, RR ${input.rr}, T° ${input.temp}, SpO₂ ${input.spO2}%${
        bmi != null ? `, BMI ${bmi}` : ""
      }`,
      logEntry: `Vitals recorded: ${input.bp} | SpO₂ ${input.spO2}% | T ${input.temp}°C`,
      relatedVitalsId: vital.id,
      structuredData: {
        bp: input.bp,
        pulse: input.pulse,
        rr: input.rr,
        temp: input.temp,
        spO2: input.spO2,
        bmi,
        weightKg: input.weightKg,
        heightCm: input.heightCm,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/manage/${input.patientId}`);
  revalidatePath(`/doctor/patient/${input.patientId}`);
  return { ok: true as const, vitalsId: vital.id };
}

export async function appendNursingProgress(input: {
  patientId: string;
  professionalName: string;
  title?: string;
  body: string;
  ivFluids?: string;
  intake?: string;
  output?: string;
  medicationsGiven?: string;
}) {
  const structured: Record<string, string> = {};
  if (input.ivFluids?.trim()) structured.ivFluids = input.ivFluids.trim();
  if (input.intake?.trim()) structured.intake = input.intake.trim();
  if (input.output?.trim()) structured.output = input.output.trim();
  if (input.medicationsGiven?.trim()) structured.medicationsGiven = input.medicationsGiven.trim();

  const logParts = ["Nursing"];
  if (structured.ivFluids) logParts.push(`IV: ${structured.ivFluids.slice(0, 40)}`);
  if (structured.medicationsGiven) logParts.push(`Meds: ${structured.medicationsGiven.slice(0, 40)}`);

  return appendTimelineNote({
    patientId: input.patientId,
    professionalName: input.professionalName,
    emrSection: "nursing_progress",
    entryType: MedicalTimelineEntryType.NURSING_PROGRESS,
    title: input.title || "Nursing progress",
    body: input.body.trim(),
    structuredData: Object.keys(structured).length ? structured : undefined,
    logEntry: logParts.join(" · "),
  });
}

export async function appendSystemsExam(input: {
  patientId: string;
  professionalName: string;
  title?: string;
  body: string;
  ippaBySystem: Record<string, Partial<Record<string, string>>>;
}) {
  return appendTimelineNote({
    patientId: input.patientId,
    professionalName: input.professionalName,
    emrSection: "clinical_exam",
    entryType: MedicalTimelineEntryType.SYSTEMS_EXAM,
    title: input.title || "Systems examination (IPPA)",
    body: input.body.trim(),
    structuredData: { ippa: input.ippaBySystem } as Prisma.InputJsonValue,
    logEntry: `Systems exam: ${input.body.slice(0, 120)}`,
  });
}

export async function logAdmissionToWard(input: {
  patientId: string;
  professionalName: string;
  ward: Ward;
}) {
  const professionalName = clampName(input.professionalName);
  await prisma.$transaction([
    prisma.medicalTimelineEntry.create({
      data: {
        patientId: input.patientId,
        professionalName,
        entryType: MedicalTimelineEntryType.SECTION_NOTE,
        emrSection: "identification",
        title: "Ward / admission update",
        body: `Patient location updated to ${input.ward.replace(/_/g, " ")}.`,
        logEntry: `Admission/ward: ${input.ward}`,
      },
    }),
    prisma.patient.update({
      where: { id: input.patientId },
      data: { ward: input.ward, examStatus: "INPATIENT" },
    }),
  ]);

  revalidatePath(`/manage/${input.patientId}`);
  revalidatePath(`/doctor/patient/${input.patientId}`);
  return { ok: true as const };
}

export async function getPatientManageBundle(patientId: string) {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: patientId }, { healthId: patientId }] },
    include: {
      vitals: { orderBy: { createdAt: "desc" }, take: 40 },
      medicalTimeline: { orderBy: { createdAt: "desc" }, take: 300 },
      investigations: { orderBy: { createdAt: "desc" }, take: 40 },
      prescriptions: { orderBy: { createdAt: "desc" }, take: 40 },
      referrals: { orderBy: { createdAt: "desc" }, take: 20 },
      screenings: { orderBy: { createdAt: "desc" }, take: 1 },
      clinicalExam: true,
    },
  });

  if (!patient) return null;

  const dates: number[] = [
    patient.updatedAt.getTime(),
    ...patient.vitals.map((v) => v.createdAt.getTime()),
    ...patient.medicalTimeline.map((t) => t.createdAt.getTime()),
    ...patient.investigations.map((i) => i.createdAt.getTime()),
    ...patient.prescriptions.map((p) => p.createdAt.getTime()),
  ];
  const lastClinicalActivity = new Date(Math.max(...dates));

  return JSON.parse(
    JSON.stringify({
      patient,
      lastClinicalActivity: lastClinicalActivity.toISOString(),
    })
  );
}
