"use server";

import prisma from "@/lib/prisma";
import { generateHealthId, generateChildId } from "../utils";
import { randomUUID } from "crypto";
import { z } from "zod";

import { TriageStatus, Ward } from "@prisma/client";

export async function registerPatient(data: {
  fullName: string;
  // NOTE: For Fayda path, pass `faydaId` (FIN). For no-id path, pass `hospitalId`.
  // `nationalId` is kept for backwards compatibility with older callers.
  faydaId?: string;
  hospitalId?: string;
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
}) {
  try {
    const { 
      fullName, faydaId, hospitalId, nationalId, fcn, age, sex, dateOfBirth, reasonForVisit, ward, 
      triageStatus = "WAITING_FOR_TRIAGE", 
      religion, occupation, maritalStatus, educationalStatus,
      addressRegion, addressZone, addressWoreda, addressKebele,
      emergencyContactName, emergencyContactPhone, chiefComplaint, detailedSituation,
      bp, pulse, temp, spO2, phoneNumber,
      isMinor, guardianId, parentFaydaId
    } = data;

    const healthId = generateHealthId();
    let idValue = (faydaId ?? hospitalId ?? nationalId) ? String(faydaId ?? hospitalId ?? nationalId).trim() : null;
    const isFaydaUser = Boolean(faydaId || (nationalId && /^\d{12,16}$/.test(nationalId)));
    const isNoIdUser = Boolean(hospitalId && !isFaydaUser);

    if (isMinor) {
      if (!parentFaydaId) {
        throw new Error("Parent Fayda ID is required for minor registration.");
      }
      if (!idValue) {
        idValue = generateChildId();
      }
    }

    // Ethiopian ID Validation (only for numeric Fayda IDs, not hospital-generated IDs like DBH-*)
    if (idValue !== null && isFaydaUser) {
      z.string()
        .regex(/^\d+$/, { message: "Fayda ID must contain digits only." })
        .refine((val) => val.length === 12 || val.length === 16, {
          message: "Fayda ID must be 12 (FIN) or 16 (FCN) digits.",
        })
        .parse(idValue);
    }

    // internalId is always required — either mirrors faydaId or is a fresh UUID
    const internalId = idValue ?? `MHI-${randomUUID()}`;

    // Calculate queue position
    const maxQueue = await prisma.patient.aggregate({
      _max: {
        queuePosition: true
      },
      where: {
        triageStatus: "WAITING_FOR_TRIAGE"
      }
    });
    const nextQueuePosition = (maxQueue._max?.queuePosition ?? 0) + 1;
    const estimatedWaitTime = nextQueuePosition * 15;

    const patientData = {
      fullName: fullName || "Unknown",
      age: Math.max(0, age || 0),
      sex: sex || "Not Specified",
      dateOfBirth: dateOfBirth || null,
      ward: ward,
      triageStatus: triageStatus,
      reasonForVisit: reasonForVisit || "",
      emergencyFlag: triageStatus === 'RED',
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
      // - Fayda users: store FIN/FCN in `faydaId` (primary)
      // - No-ID users: store generated hospital id in `hospitalId`
      faydaId: isFaydaUser ? idValue : null,
      hospitalId: isNoIdUser ? idValue : null,
      fcn: fcn ? String(fcn).trim() : null,
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
            // Keep `nationalId` only for legacy flows; Fayda/No-ID should not depend on it.
            nationalId: data.nationalId ? String(data.nationalId).trim() : null,
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
  weight?: number; // Not saved in standard schema but collected in UI
}) {
  try {
    const vitals = await prisma.vitals.create({
      data: {
        patientId: data.patientId,
        bp: data.bp,
        temp: data.temp,
        pulse: data.pulse,
        rr: 0, // Default since not collected in this form
        spO2: 0, // Default since not collected in this form
      }
    });

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
      orderBy: {
        createdAt: 'asc', // oldest first (FIFO queue)
      },
      include: {
        vitals: true,
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
    const maxQueue = await prisma.patient.aggregate({
      _max: {
        queuePosition: true
      },
      where: {
        ward: ward,
        triageStatus: { not: 'WAITING_FOR_TRIAGE' }
      }
    });

    const nextQueuePosition = (maxQueue._max?.queuePosition ?? 0) + 1;
    const estimatedWaitTime = nextQueuePosition * 15;

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        ward: ward,
        triageStatus: priority,
        serviceType: serviceType,
        queuePosition: nextQueuePosition,
        estimatedWait: estimatedWaitTime,
      }
    });

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
          { phoneNumber: identifier },
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!patient) return null;

    return {
      fullName: patient.fullName,
      queuePosition: patient.queuePosition,
      estimatedWait: patient.estimatedWait,
      status: patient.triageStatus === 'WAITING_FOR_TRIAGE' ? 'Waiting for Triage' : `Awaiting Care at \${patient.ward}`,
      updatedAt: patient.updatedAt
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
