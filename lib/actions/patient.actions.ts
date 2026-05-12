"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { generateHealthId, generateChildId, generateMhidSuffix, formatMyHealthPublicId } from "../utils";
import { randomUUID } from "crypto";
import { z } from "zod";

import { TriageStatus, Ward, PriorityLevel } from "@prisma/client";
import { upsertVerifiedCitizenFromRegistration } from "@/lib/actions/verifiedCitizen.actions";

async function allocateUniqueMhid(): Promise<string> {
  for (let attempt = 0; attempt < 16; attempt++) {
    const candidate = formatMyHealthPublicId(generateMhidSuffix());
    const clash = await prisma.patient.findFirst({
      where: { OR: [{ hospitalId: candidate }, { healthId: candidate }, { internalId: candidate }] },
    });
    if (!clash) return candidate;
  }
  throw new Error("Could not allocate a unique MyHealth ID. Please try again.");
}

export async function registerPatient(data: {
  fullName: string;
  // NOTE: For Fayda path, pass `faydaId` (FIN). For no-id path, set `generateMyHealthId: true` (server assigns MHID-XXXXXX).
  // Legacy: optional `hospitalId` from client (discouraged).
  faydaId?: string;
  hospitalId?: string;
  /** When true, server generates a unique MHID-XXXXXX and stores it on `hospitalId`. */
  generateMyHealthId?: boolean;
  nationalId?: string;
  fcn?: string;
  age: number;
  sex: string;
  dateOfBirth?: Date;
  reasonForVisit: string;
  ward: Ward;
  triageStatus?: TriageStatus;
  religion?: string;
  occupation?: string;
  maritalStatus?: string;
  educationalStatus?: string;
  addressRegion?: string;
  addressZone?: string;
  addressWoreda?: string;
  addressKebele?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  chiefComplaint: string;
  detailedSituation?: string;
  bp?: string;
  pulse?: number;
  temp?: number;
  spO2?: number;
  phoneNumber?: string;
  suspectedDisease?: string;
  preExistingConditions?: string;
  allergyInformation?: string;
  isMinor?: boolean;
  guardianId?: string;
  parentFaydaId?: string;
  /** When true, patient is flagged as urgent intake (e.g. emergency chief complaint). */
  emergencyFlag?: boolean;
}) {
  try {
    const { 
      fullName, faydaId, hospitalId, generateMyHealthId, nationalId, fcn, age, sex, dateOfBirth, reasonForVisit, ward, 
      triageStatus = "WAITING_FOR_TRIAGE", 
      religion, occupation, maritalStatus, educationalStatus,
      addressRegion, addressZone, addressWoreda, addressKebele,
      emergencyContactName, emergencyContactPhone, chiefComplaint, detailedSituation,
      bp, pulse, temp, spO2, phoneNumber,
      isMinor, guardianId, parentFaydaId
    } = data;

    const healthId = generateHealthId();

    const nationalDigits = nationalId ? String(nationalId).replace(/\D/g, "") : "";
    const isFaydaUser = Boolean(
      faydaId || (nationalDigits.length === 12 || nationalDigits.length === 16)
    );

    let idValue: string | null = null;
    let isNoIdUser = false;

    if (generateMyHealthId) {
      if (faydaId || fcn) {
        throw new Error("Cannot mix Fayda verification fields with a generated MyHealth ID.");
      }
      idValue = await allocateUniqueMhid();
      isNoIdUser = true;
    } else {
      idValue = (faydaId ?? hospitalId ?? nationalId) ? String(faydaId ?? hospitalId ?? nationalId).trim() : null;
      isNoIdUser = Boolean(hospitalId && !isFaydaUser);
    }

    const isFaydaForRecord = !generateMyHealthId && isFaydaUser;

    if (isMinor) {
      if (!parentFaydaId) {
        throw new Error("Parent Fayda ID is required for minor registration.");
      }
      if (!idValue) {
        idValue = generateChildId();
      }
    }

    // Ethiopian ID Validation (only for numeric Fayda FIN, not MHID-* / legacy hospital IDs)
    if (idValue !== null && isFaydaForRecord) {
      z.string()
        .regex(/^\d+$/, { message: "Fayda ID must contain digits only." })
        .refine((val) => val.length === 12 || val.length === 16, {
          message: "Fayda ID must be 12 (FIN) or 16 (FCN) digits.",
        })
        .parse(idValue);
    }

    // internalId is always required — either mirrors faydaId or is a fresh UUID
    const internalId = idValue ?? `MHI-${randomUUID()}`;

    // Queue positions are now dynamically calculated at read-time based on PriorityLevel
    const nextQueuePosition = 0;
    const estimatedWaitTime = 0;

    const nationalDigitsOnly = data.nationalId ? String(data.nationalId).replace(/\D/g, "") : "";
    const nationalForRecord =
      nationalDigitsOnly.length >= 9
        ? nationalDigitsOnly
        : isFaydaForRecord && idValue
          ? String(idValue).replace(/\D/g, "")
          : null;

    const patientData = {
      fullName: fullName || "Unknown",
      age: Math.max(0, age || 0),
      sex: sex || "Not Specified",
      dateOfBirth: dateOfBirth || null,
      ward: ward,
      triageStatus: triageStatus,
      reasonForVisit: reasonForVisit || "",
      nationalId: nationalForRecord,
      emergencyFlag:
        Boolean(data.emergencyFlag) ||
        triageStatus === "RED" ||
        ward === Ward.EMERGENCY,
      priorityLevel:
        (Boolean(data.emergencyFlag) || triageStatus === "RED" || ward === Ward.EMERGENCY) 
          ? PriorityLevel.EMERGENCY 
          : (triageStatus === "YELLOW" ? PriorityLevel.URGENT : PriorityLevel.ROUTINE),
      religion: religion || "Not Specified",
      occupation: occupation || "Not Specified",
      maritalStatus: maritalStatus || "Not Specified",
      educationalStatus: educationalStatus || "Not Specified",
      addressRegion: addressRegion || "Not Specified",
      addressZone: addressZone || "Not Specified",
      addressWoreda: addressWoreda || "Not Specified",
      addressKebele: addressKebele || "Not Specified",
      emergencyContactName: emergencyContactName || "Not Specified",
      emergencyContactPhone: emergencyContactPhone || "Not Specified",
      phoneNumber: phoneNumber || null,
      queuePosition: nextQueuePosition,
      estimatedWait: estimatedWaitTime,
      chiefComplaint: chiefComplaint || "Not Specified",
      detailedSituation: detailedSituation || "",
      suspectedDisease: data.suspectedDisease || null,
      preExistingConditions: data.preExistingConditions || null,
      allergyInformation: data.allergyInformation || null,
      isMinor: isMinor || false,
      guardianId: guardianId || null,
      parentFaydaId: parentFaydaId || null,
      internalId: internalId,
      // Primary identifier routing:
      // - Fayda users: store FIN in `faydaId` (primary)
      // - No national ID: store server-generated `MHID-XXXXXX` in `hospitalId`
      faydaId: isFaydaForRecord ? idValue : null,
      hospitalId: isNoIdUser ? idValue : null,
      fcn: generateMyHealthId ? null : fcn ? String(fcn).trim() : null,
    };

    const vitalsData = bp || pulse || temp || spO2 ? {
      create: {
        bp: bp || "N/A",
        pulse: pulse || 0,
        temp: temp || 0,
        spO2: spO2 || 0,
        rr: 0,
      }
    } : undefined;

    let patient;

    if (idValue !== null) {
      const existing = await prisma.patient.findFirst({
        where: {
          OR: [
            { nationalId: idValue },
            { faydaId: idValue },
            { hospitalId: idValue },
          ]
        }
      });
      if (existing) {
        if (existing.fullName !== "Pending Registration" && !existing.healthId.startsWith("TMP-")) {
            throw new Error("This National ID is already registered.");
        }
        patient = await prisma.patient.update({
          where: { id: existing.id },
          data: {
            ...patientData,
            healthId: healthId, // Overwrite the temporary TMP health ID from OTP step
            vitals: vitalsData,
          },
          include: { vitals: true }
        });
      } else {
        patient = await prisma.patient.create({
          data: {
            ...patientData,
            healthId: healthId,
            vitals: vitalsData,
          },
          include: { vitals: true }
        });
      }
    } else {
      patient = await prisma.patient.create({
        data: {
          ...patientData,
          healthId: healthId,
          vitals: vitalsData,
        },
        include: { vitals: true }
      });
    }

    try {
      await upsertVerifiedCitizenFromRegistration({
        nationalFin: patient.faydaId ?? patient.nationalId,
        phoneRaw: phoneNumber ?? null,
        fullName: patient.fullName,
      });
    } catch (e) {
      console.error("[VerifiedCitizen] upsert failed:", e);
    }

    return JSON.parse(JSON.stringify(patient));

  } catch (error: any) {
    console.error("❌ DATABASE ERROR:", error.message);
    if (error.code === 'P2002') {
      return { error: "A patient with this National ID is already registered." };
    }
    if (error.name === 'ZodError') {
      return { error: error.issues?.[0]?.message || "Validation error" };
    }
    return { error: error.message || "Registration failed." };
  }
}
export async function getPatientsByWard(ward: Ward) {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        status: 'ACTIVE',
        ward: ward,
        triageStatus: {
          not: TriageStatus.WAITING_FOR_TRIAGE,
        }
      },
      orderBy: {
        createdAt: 'desc', // primary sort by recent arrival
      },
      include: {
        vitals: true,
        investigations: true,
        prescriptions: true,
        clinicalExam: true,
        queues: true,
      }
    });

    // Enforce explicit Triage Priority sorting
    const priorityWeight: Record<string, number> = {
      WAITING_FOR_TRIAGE: 0, // Highest priority to get triaged
      RED: 1,
      YELLOW: 2,
      GREEN: 3,
    };

    patients.sort((a, b) => {
      const weightA = priorityWeight[a.triageStatus] || 99;
      const weightB = priorityWeight[b.triageStatus] || 99;
      return weightA - weightB;
    });

    return JSON.parse(JSON.stringify(patients));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR [getPatientsByWard]:", error.message);
    return []; // Return empty list so the dashboard renders instead of crashing
  }
}

export async function searchPatients(query: string) {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { healthId: { contains: query, mode: 'insensitive' } },
          { nationalId: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
        ]
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        vitals: true,
        investigations: true,
        prescriptions: true,
        clinicalExam: true,
        queues: true,
      }
    });

    const priorityWeight: Record<string, number> = {
      WAITING_FOR_TRIAGE: 0,
      RED: 1,
      YELLOW: 2,
      GREEN: 3,
    };

    patients.sort((a, b) => {
      const weightA = priorityWeight[a.triageStatus] || 99;
      const weightB = priorityWeight[b.triageStatus] || 99;
      return weightA - weightB;
    });

    return JSON.parse(JSON.stringify(patients));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR [searchPatients]:", error.message);
    return []; // Return empty list so search results render instead of crashing
  }
}

export async function recordVitals(data: {
  patientId: string;
  bp: string;
  temp: number;
  pulse: number;
  weight?: number;
  rr?: number;
  spO2?: number;
  weightKg?: number;
  heightCm?: number;
  painLevel?: number;
}) {
  try {
    let bmi: number | undefined;
    const w = data.weightKg ?? data.weight;
    if (w != null && data.heightCm != null && data.heightCm > 0) {
      const m = data.heightCm / 100;
      bmi = Math.round((w / (m * m)) * 10) / 10;
    }

    const vitals = await prisma.vitals.create({
      data: {
        patientId: data.patientId,
        bp: data.bp,
        temp: data.temp,
        pulse: data.pulse,
        rr: data.rr ?? 0,
        spO2: data.spO2 ?? 0,
        bmi: bmi ?? null,
        painLevel: data.painLevel ?? null,
        weightKg: w ?? null,
        heightCm: data.heightCm ?? null,
      },
    });

    revalidatePath(`/manage/${data.patientId}`);
    revalidatePath(`/doctor/patient/${data.patientId}`);

    return JSON.parse(JSON.stringify(vitals));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR:", error.message);
    throw new Error(error.message || "Failed to record vitals.");
  }
}

// ─── AI Smart Triage Engine — Once-Only Persistence ──────────────────────────
/**
 * runAiTriage()
 *
 * Called once at triage (after vitals are recorded).
 * Computes the AI PriorityScore + bilingual recommendation, then writes
 * both to the Patient document in MongoDB.
 *
 * Every downstream ward (Doctor, Pharmacy, Lab) reads these fields
 * directly — no re-interview, no repeated testing.
 */
export async function runAiTriage(patientId: string) {
  try {
    const { analyzeVitals, serializeRecommendation } = await import("@/lib/ai-engine");

    // Fetch patient + latest vitals (Once-Only principle)
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { vitals: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!patient) throw new Error("Patient not found.");

    const v = patient.vitals[0];
    const [sys, dia] = v ? (v.bp ?? "120/80").split("/").map(Number) : [120, 80];

    const recommendation = analyzeVitals({
      systolic:      sys  || 120,
      diastolic:     dia  || 80,
      heartRate:     v?.pulse      || 80,
      temperature:   v?.temp       || 37.0,
      spO2:          v?.spO2       || 98,
      chiefComplaint: patient.chiefComplaint ?? "",
      age:           patient.age,
    });

    // Persist once to MongoDB — all wards read this going forward
    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        aiPriorityScore:  recommendation.priorityScore,
        aiRecommendation: serializeRecommendation(recommendation),
      },
    });

    return JSON.parse(JSON.stringify({ recommendation, updated }));
  } catch (error: any) {
    console.error("❌ AI TRIAGE ERROR:", error.message);
    throw new Error(error.message || "AI triage analysis failed.");
  }
}

export async function getWaitingForTriagePatients() {
  try {
    const patients = await prisma.patient.findMany({
      where: {
        triageStatus: 'WAITING_FOR_TRIAGE',
      },
      orderBy: [
        { emergencyFlag: "desc" },
        { createdAt: "asc" },
      ],
      include: {
        vitals: true,
        screenings: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      }
    });

    return JSON.parse(JSON.stringify(patients));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR [getWaitingForTriagePatients]:", error.message);
    return []; // Return empty list so triage queue renders instead of crashing
  }
}

export async function processTriage(
  patientId: string, 
  ward: Ward, 
  priority: TriageStatus, 
  serviceType: string
) {
  try {
    // Queue positions are now dynamically calculated at read-time
    const nextQueuePosition = 0;
    const estimatedWaitTime = 0;
    
    const priorityLevel = priority === "RED" || ward === "EMERGENCY" ? PriorityLevel.EMERGENCY : priority === "YELLOW" ? PriorityLevel.URGENT : PriorityLevel.ROUTINE;

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        ward: ward,
        triageStatus: priority,
        priorityLevel: priorityLevel,
        serviceType: serviceType,
        queuePosition: nextQueuePosition,
        estimatedWait: estimatedWaitTime,
      }
    });

    revalidatePath(`/manage/${patientId}`);
    revalidatePath(`/doctor/patient/${patientId}`);

    return JSON.parse(JSON.stringify(patient));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR:", error.message);
    throw new Error(error.message || "Failed to process triage.");
  }
}

export async function saveClinicalExam(patientId: string, examData: any) {
  try {
    const exam = await prisma.clinicalExamination.upsert({
      where: { patientId },
      create: {
        patientId,
        ...examData
      },
      update: {
        ...examData
      }
    });

    // Update patient status
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        examStatus: 'EXAMINATION_COMPLETE'
      }
    });

    revalidatePath(`/manage/${patientId}`);
    revalidatePath(`/doctor/patient/${patientId}`);

    return JSON.parse(JSON.stringify({ exam, patient }));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR:", error.message);
    throw new Error(error.message || "Failed to save clinical examination.");
  }
}

export async function getPatientQueueStatus(identifier: string) {
  try {
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { healthId: identifier },
          { nationalId: identifier },
          { faydaId: identifier },
          { hospitalId: identifier },
          { phoneNumber: identifier },
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!patient) return null;

    // Fetch all active patients in the SAME ward (or waiting for triage) to calculate dynamic queue
    const allPatients = await prisma.patient.findMany({
      where: {
        status: 'ACTIVE',
        ward: patient.ward,
        examStatus: { not: "EXAMINATION_COMPLETE" },
        // if this patient is waiting for triage, compare with others waiting for triage
        ...(patient.triageStatus === "WAITING_FOR_TRIAGE" ? { triageStatus: "WAITING_FOR_TRIAGE" } : { triageStatus: { not: "WAITING_FOR_TRIAGE" } })
      },
      select: { id: true, priorityLevel: true, createdAt: true }
    });

    const priorityWeight: Record<string, number> = {
      EMERGENCY: 1,
      URGENT: 2,
      ROUTINE: 3,
    };

    allPatients.sort((a, b) => {
      const pA = priorityWeight[a.priorityLevel] || 3;
      const pB = priorityWeight[b.priorityLevel] || 3;
      if (pA !== pB) return pA - pB;
      return a.createdAt.getTime() - b.createdAt.getTime(); // older patients first
    });

    const queueIndex = allPatients.findIndex(p => p.id === patient.id);
    const queuePosition = queueIndex !== -1 ? queueIndex + 1 : 1;

    // Wait Time Engine: Triage Buffer
    let estimatedWait = queuePosition * 15;
    const emergencyCount = allPatients.filter(p => p.priorityLevel === "EMERGENCY").length;
    
    // Add Triage Buffer for everyone EXCEPT emergencies themselves
    if (patient.priorityLevel !== "EMERGENCY") {
      estimatedWait += (emergencyCount * 15);
    }

    const latestScreening = await prisma.screening.findFirst({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      select: { triageResult: true, screeningType: true, createdAt: true },
    });

    return {
      fullName: patient.fullName,
      queuePosition: queuePosition,
      estimatedWait: estimatedWait,
      status:
        patient.triageStatus === "WAITING_FOR_TRIAGE"
          ? "Waiting for Triage"
          : `Awaiting Care at ${patient.ward.replace(/_/g, " ")}`,
      triageStatus: patient.triageStatus,
      lastScreeningTriage: latestScreening?.triageResult ?? null,
      lastScreeningType: latestScreening?.screeningType ?? null,
      lastScreeningAt: latestScreening?.createdAt ?? null,
      updatedAt: patient.updatedAt,
    };
  } catch (error: any) {
    console.error("❌ DATABASE ERROR [getPatientQueueStatus]:", error.message);
    return null; // Return null so queue status shows graceful "unavailable" state
  }
}

export async function verifyNationalID(nationalId: string) {
  try {
    const rawId = nationalId.replace(/\s/g, '');
    if (rawId.length !== 12 && rawId.length !== 16) {
      throw new Error("Fayda National ID must be exactly 12 or 16 digits.");
    }
    
    // Simulate lookup delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // The Patient model acts as the National Linkage database.
    const patientRecord = await prisma.patient.findUnique({
      where: { nationalId: rawId }
    });

    if (!patientRecord || !patientRecord.email) {
      return { success: false, message: "No match found." };
    }

    const email = patientRecord.email;
    const [namePart, domain] = email.split('@');
    // Mask the email: a****@gmail.com
    const maskedName = namePart.charAt(0) + '*'.repeat(Math.max(1, namePart.length - 1));
    const maskedEmail = `${maskedName}@${domain}`;

    return {
      success: true,
      maskedEmail: maskedEmail
    };
  } catch (error: any) {
    console.error("❌ Linkage Error:", error.message);
    throw new Error(error.message || "Failed to verify National ID.");
  }
}

export async function mergeChildToAdult(childId: string, newFaydaId: string) {
  try {
    const cleanFaydaId = newFaydaId.replace(/\s/g, '');
    if (cleanFaydaId.length !== 12 && cleanFaydaId.length !== 16) {
      throw new Error("Fayda National ID must be exactly 12 or 16 digits.");
    }

    const existingChild = await prisma.patient.findUnique({
      where: { nationalId: childId }
    });

    if (!existingChild) {
      throw new Error("Child record not found.");
    }
    
    if (!existingChild.isMinor) {
      throw new Error("The specified record is not a minor.");
    }

    const existingAdult = await prisma.patient.findUnique({
      where: { nationalId: cleanFaydaId }
    });

    if (existingAdult) {
      throw new Error("An adult profile with this Fayda ID already exists. Merge relation strategy required.");
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: existingChild.id },
      data: {
        nationalId: cleanFaydaId,
        isMinor: false,
      }
    });

    return JSON.parse(JSON.stringify(updatedPatient));

  } catch (error: any) {
    console.error("❌ DATABASE ERROR:", error.message);
    throw new Error(error.message || "Failed to merge minor to adult record.");
  }
}

export async function signInCitizen(identifier: string) {
  try {
    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new Error("Identifier is required.");
    }

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { nationalId: cleanId },
          { faydaId: cleanId },
          { hospitalId: cleanId },
          { healthId: cleanId },
          { internalId: cleanId }
        ]
      },
      select: {
        id: true,
        fullName: true
      }
    });

    if (!patient) {
      return { success: false, error: "Not Found" };
    }

    // Set CITIZEN identity cookies so Sidebar + pages know the viewer role
    const { cookies } = await import("next/headers");
    const cookieStore = cookies();
    const cookieOpts = {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    };
    cookieStore.set("userRole", "CITIZEN", cookieOpts);
    cookieStore.set("citizenPatientId", patient.id, cookieOpts);

    return { success: true, patientId: patient.id, fullName: patient.fullName };

  } catch (error: any) {
    console.error("❌ SIGN-IN ERROR:", error.message);
    return { success: false, error: "Database search failed." };
  }
}
