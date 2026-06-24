"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { CROSS_FACILITY } from "@/lib/utils/tenantContext";
import { checkInToQueue } from "./queue.actions";
import { generateHealthId, generateChildId, generateMhidSuffix, formatMyHealthPublicId } from "../utils";
import crypto, { randomUUID } from "crypto";
import { z } from "zod";
import { cookies, headers } from "next/headers";
import { signToken, verifyToken } from "@/lib/session";
import { sendOTP } from "@/lib/mailService";

import { TriageStatus, Ward, PriorityLevel } from "@prisma/client";
import { upsertVerifiedCitizenFromRegistration } from "@/lib/actions/verifiedCitizen.actions";
import { hashPassword } from "@/lib/actions/auth.actions";

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
  password?: string;
}) {
  try {
    const { 
      fullName, faydaId, hospitalId, generateMyHealthId, nationalId, fcn, age, sex, dateOfBirth, reasonForVisit, ward, 
      triageStatus = "WAITING_FOR_TRIAGE", 
      religion, occupation, maritalStatus, educationalStatus,
      addressRegion, addressZone, addressWoreda, addressKebele,
      emergencyContactName, emergencyContactPhone, chiefComplaint, detailedSituation,
      bp, pulse, temp, spO2, phoneNumber,
      isMinor, guardianId, parentFaydaId,
      password
    } = data;

    const userSuppliedHealthId = (data as any).healthId || null;
    let healthId = "";

    if (userSuppliedHealthId) {
      // Check if it already exists (upstream check)
      const existing = await prisma.patient.findUnique({
        where: {
          healthId: userSuppliedHealthId,
          ...CROSS_FACILITY,
        } as any,
      });
      if (existing) {
        return { error: "Health ID is already registered in the system." };
      }
      healthId = userSuppliedHealthId;
    } else {
      // Auto-generated ID:
      let generatedId = generateHealthId();
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 20) {
        const existing = await prisma.patient.findUnique({
          where: {
            healthId: generatedId,
            ...CROSS_FACILITY,
          } as any,
        });
        if (!existing) {
          isUnique = true;
        } else {
          generatedId = generateHealthId();
          attempts++;
        }
      }
      if (!isUnique) {
        return { error: "Failed to generate a unique Health ID after multiple attempts." };
      }
      healthId = generatedId;
    }

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

    let passwordHash: string | undefined = undefined;
    if (password) {
      const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
      passwordHash = crypto
        .createHmac("sha256", salt)
        .update(password)
        .digest("hex");
    }

    const patientData = {
      fullName: fullName || "Unknown",
      ...(passwordHash ? { passwordHash } : {}),
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
        ((Boolean(data.emergencyFlag) || triageStatus === "RED" || ward === Ward.EMERGENCY) 
          ? PriorityLevel.EMERGENCY 
          : (triageStatus === "YELLOW" ? PriorityLevel.URGENT : PriorityLevel.ROUTINE)) as PriorityLevel,
      religion: religion || "Not Specified",
      occupation: occupation || "Not Specified",
      maritalStatus: maritalStatus || "Not Specified",
      educationalStatus: educationalStatus || "Not Specified",
      address: {
        region: addressRegion || "Not Specified",
        zone: addressZone || "Not Specified",
        woreda: addressWoreda || "Not Specified",
        kebele: addressKebele || "Not Specified",
      },
      // organizationId is stamped automatically by the Prisma tenant extension on create
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

    // Real-time duplicate check: check if any patient already exists with either
    // this National ID/Fayda ID OR this phoneNumber
    const duplicateConditions: any[] = [];
    if (idValue !== null) {
      duplicateConditions.push(
        { nationalId: idValue },
        { faydaId: idValue },
        { hospitalId: idValue }
      );
    }
    const cleanPhoneForCheck = phoneNumber ? String(phoneNumber).replace(/\s+/g, "") : null;
    if (cleanPhoneForCheck) {
      duplicateConditions.push({ phoneNumber: cleanPhoneForCheck });
    }

    if (duplicateConditions.length > 0) {
      const existingDuplicate = await prisma.patient.findFirst({
        where: {
          ...CROSS_FACILITY,
          OR: duplicateConditions,
        } as any
      });
      if (existingDuplicate && existingDuplicate.fullName !== "Pending Registration" && !existingDuplicate.healthId.startsWith("TMP-")) {
        throw new Error("DUPLICATE_PATIENT_IDENTITY");
      }
    }

    let patient;

    try {
      if (idValue !== null) {
        const existing = await prisma.patient.findFirst({
          where: {
            // CROSS_FACILITY: global duplicate-check during registration — must
            // search all facilities so we never create a second record for the
            // same National ID at a different hospital.
            ...CROSS_FACILITY,
            OR: [
              { nationalId: idValue },
              { faydaId: idValue },
              { hospitalId: idValue },
            ],
          } as any
        });
        if (existing) {
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
    } catch (err: any) {
      if (err.code === "P2002") {
        const targets = err.meta?.target || [];
        const isHealthId = (typeof targets === "string" && targets.includes("healthId")) ||
                           (Array.isArray(targets) && targets.includes("healthId")) ||
                           (err.message?.includes("healthId"));
        if (isHealthId) {
          return { error: "Health ID is already registered in the system." };
        }
      }
      throw err;
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

    return {
      success: true,
      uniqueId: patient.healthId,
      nationalId: patient.nationalId ?? patient.faydaId ?? patient.hospitalId ?? "",
      id: patient.id,
      name: patient.fullName,
      organizationId: patient.organizationId,
    };

  } catch (error: any) {
    console.error("❌ DATABASE ERROR:", error.message);
    if (error.code === "P2002") {
      const targets = error.meta?.target || [];
      const isHealthId = (typeof targets === "string" && targets.includes("healthId")) ||
                         (Array.isArray(targets) && targets.includes("healthId")) ||
                         (error.message?.includes("healthId"));
      if (isHealthId) {
        return { error: "Health ID is already registered in the system." };
      }
      return { error: "A patient with this National ID is already registered." };
    }
    if (error.name === "ZodError") {
      return { error: error.issues?.[0]?.message || "Validation error" };
    }
    return { error: error.message || "Registration failed." };
  }
}
export async function getPatientsByWard(ward: Ward) {
  try {
    // organizationId filter is injected automatically by the Prisma tenant extension
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

    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true }
    });
    const orgMap = Object.fromEntries(organizations.map(o => [o.id, o.name]));

    const formatFacilityName = (orgId: string | null | undefined) => {
      if (!orgId) return null;
      if (orgMap[orgId]) return orgMap[orgId];
      return orgId
        .split("-")
        .filter(part => part.toUpperCase() !== "MH")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
    };

    const mappedPatients = patients.map((p: any) => ({
      ...p,
      vitals: p.vitals?.map((v: any) => ({
        ...v,
        facilityName: formatFacilityName(v.organizationId)
      })) || [],
      investigations: p.investigations?.map((i: any) => ({
        ...i,
        facilityName: formatFacilityName(i.organizationId)
      })) || [],
      prescriptions: p.prescriptions?.map((pr: any) => ({
        ...pr,
        facilityName: formatFacilityName(pr.organizationId)
      })) || [],
      clinicalExam: p.clinicalExam ? {
        ...p.clinicalExam,
        facilityName: formatFacilityName(p.clinicalExam.organizationId)
      } : null
    }));

    return JSON.parse(JSON.stringify(mappedPatients));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR [getPatientsByWard]:", error.message);
    return []; // Return empty list so the dashboard renders instead of crashing
  }
}

export async function searchPatients(query: string) {
  try {
    // Retain the cookie read: organizationId is still needed for the
    // auto-admission intake approval logic below (not for filtering).
    const organizationId = cookies().get("organizationId")?.value || null;
  const patients = await prisma.patient.findMany({
    where: {
      // CROSS_FACILITY: global search by design — cross-facility lookup
      ...CROSS_FACILITY,
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

// Auto‑Admission logic: approve pending intake requests and add patient to live queue
if (organizationId) {
  for (const p of patients) {
    const targetId = p.nationalId ?? p.faydaId ?? p.hospitalId;
    if (targetId) {
      const intakeReq = await prisma.intakeRequest.findFirst({
        where: {
          nationalId: targetId,
          organizationId: organizationId,
          status: "PENDING",
        },
      });
      if (intakeReq) {
        await prisma.intakeRequest.update({
          where: { id: intakeReq.id },
          data: { status: "APPROVED" },
        });
        // Update patient's active facility to our current logged-in facility so they show up in the queues/wards
        // Bypass tenant filter: we're intentionally moving a patient into
        // the active facility after approving an incoming intake request.
        await prisma.patient.update({
          where: { ...CROSS_FACILITY, id: p.id } as any,
          data: { organizationId: organizationId },
        });
        await checkInToQueue(p.id);
      }
    }
  }
}

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

    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true }
    });
    const orgMap = Object.fromEntries(organizations.map(o => [o.id, o.name]));

    const formatFacilityName = (orgId: string | null | undefined) => {
      if (!orgId) return null;
      if (orgMap[orgId]) return orgMap[orgId];
      return orgId
        .split("-")
        .filter(part => part.toUpperCase() !== "MH")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
    };

    const mappedPatients = patients.map((p: any) => ({
      ...p,
      vitals: p.vitals?.map((v: any) => ({
        ...v,
        facilityName: formatFacilityName(v.organizationId)
      })) || [],
      investigations: p.investigations?.map((i: any) => ({
        ...i,
        facilityName: formatFacilityName(i.organizationId)
      })) || [],
      prescriptions: p.prescriptions?.map((pr: any) => ({
        ...pr,
        facilityName: formatFacilityName(pr.organizationId)
      })) || [],
      clinicalExam: p.clinicalExam ? {
        ...p.clinicalExam,
        facilityName: formatFacilityName(p.clinicalExam.organizationId)
      } : null
    }));

    return JSON.parse(JSON.stringify(mappedPatients));
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

    // organizationId is stamped automatically by the Prisma tenant extension on create
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

    // Transition associated ARRIVED appointment to TRIAGED
    await prisma.appointment.updateMany({
      where: {
        patientId: data.patientId,
        status: "ARRIVED",
      },
      data: {
        status: "TRIAGED",
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
    // organizationId filter is injected automatically by the Prisma tenant extension
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
  ward: Ward | "DISCHARGE", 
  priority: TriageStatus, 
  serviceType: string
) {
  try {
    // Queue positions are now dynamically calculated at read-time
    const nextQueuePosition = 0;
    const estimatedWaitTime = 0;
    
    const isDischarge = ward === "DISCHARGE";
    const dbWard = isDischarge ? "OPD_OUTPATIENT" : ward;
    
    const priorityLevel = (priority === "RED" || dbWard === "EMERGENCY" ? PriorityLevel.EMERGENCY : priority === "YELLOW" ? PriorityLevel.URGENT : PriorityLevel.ROUTINE) as PriorityLevel;

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        ward: dbWard as Ward,
        triageStatus: priority,
        priorityLevel: priorityLevel,
        serviceType: serviceType,
        queuePosition: nextQueuePosition,
        estimatedWait: estimatedWaitTime,
        ...(isDischarge ? { status: "DISCHARGED" } : {})
      }
    });

    if (isDischarge) {
      // Also complete all active queues for the patient
      await prisma.queue.updateMany({
        where: { patientId, status: { in: ["WAITING", "IN_PROGRESS"] } },
        data: { status: "COMPLETED" }
      });
    }

    // Transition associated ARRIVED appointment to TRIAGED (fallback)
    await prisma.appointment.updateMany({
      where: {
        patientId: patientId,
        status: "ARRIVED",
      },
      data: {
        status: "TRIAGED",
      },
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
    // organizationId is stamped automatically by the Prisma tenant extension on create
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

export async function getActivePatientsForFacility() {
  try {
    // organizationId filter is injected automatically by the Prisma tenant extension
    const patients = await prisma.patient.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [
        { updatedAt: "desc" },
      ],
      include: {
        vitals: { orderBy: { createdAt: "desc" }, take: 1 },
        investigations: { orderBy: { createdAt: "desc" }, take: 5 },
        prescriptions: { orderBy: { createdAt: "desc" }, take: 5 },
        clinicalExam: true,
        appointments: {
          where: {
            status: { in: ["ARRIVED", "TRIAGED", "IN_CONSULTATION"] }
          },
          orderBy: { dateTime: "desc" },
          take: 1,
          include: {
            assignedWard: true
          }
        }
      },
    });

    patients.sort((a, b) => {
      // 1. Primary sort: Clinical Acuity Score (descending)
      const getAcuityScore = (p: any) => {
        let base = 0;
        if (p.triageStatus === "RED" || p.priorityLevel === "EMERGENCY") base = 1000;
        else if (p.triageStatus === "YELLOW" || p.priorityLevel === "URGENT") base = 500;
        else if (p.triageStatus === "GREEN" || p.priorityLevel === "ROUTINE") base = 100;
        return base + (p.aiPriorityScore ?? 0);
      };

      const scoreA = getAcuityScore(a);
      const scoreB = getAcuityScore(b);

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Descending: higher acuity first
      }

      // 2. Secondary sort: Chronological wait time (ascending)
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeA - timeB; // Ascending: oldest check-in first
    });

    return JSON.parse(JSON.stringify(patients));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR [getActivePatientsForFacility]:", error.message);
    return [];
  }
}

export async function saveDoctorAssessment(
  patientId: string,
  data: {
    chiefAssessment?: string;
    workingDiagnosis?: string;
    differentialDiagnosis?: string;
    progressNotes?: string;
  }
) {
  try {
    // organizationId is stamped automatically by the Prisma tenant extension on create
    const exam = await prisma.clinicalExamination.upsert({
      where: { patientId },
      create: {
        patientId,
        chiefAssessment: data.chiefAssessment,
        workingDiagnosis: data.workingDiagnosis,
        differentialDiagnosis: data.differentialDiagnosis,
        progressNotes: data.progressNotes,
      },
      update: {
        ...(data.chiefAssessment !== undefined && { chiefAssessment: data.chiefAssessment }),
        ...(data.workingDiagnosis !== undefined && { workingDiagnosis: data.workingDiagnosis }),
        ...(data.differentialDiagnosis !== undefined && { differentialDiagnosis: data.differentialDiagnosis }),
        ...(data.progressNotes !== undefined && { progressNotes: data.progressNotes }),
      },
    });

    // Reflect working diagnosis on the patient record
    if (data.workingDiagnosis) {
      await prisma.patient.update({
        where: { id: patientId },
        data: { suspectedDisease: data.workingDiagnosis },
      });
    }

    revalidatePath(`/doctor/patient/`);
    revalidatePath(`/doctor/dashboard`);
    revalidatePath(`/manage/${patientId}`);

    return JSON.parse(JSON.stringify(exam));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR [saveDoctorAssessment]:", error.message);
    throw new Error(error.message || "Failed to save doctor assessment.");
  }
}

export async function getPatientQueueStatus(identifier: string) {
  try {
    // CROSS_FACILITY: citizen-facing lookup by identifier — no org boundary
    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
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

    // Scope queue calculation to the patient's own facility (not the session org)
    const allPatients = await prisma.patient.findMany({
      where: {
        ...CROSS_FACILITY,
        status: 'ACTIVE',
        ward: patient.ward,
        examStatus: { not: "EXAMINATION_COMPLETE" },
        organizationId: patient.organizationId, // patient's own facility
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

    // ─── Ward-Adaptive Consultation Time ───────────────────────────────────
    // Resolved from a static per-ward benchmark table (minutes).
    // No new DB model required — reflects real clinical throughput rates.
    const WARD_CONSULTATION_TIME_MAP: Record<string, number> = {
      OPD_OUTPATIENT:            8,
      EMERGENCY:                 5,  // rapid turnover
      MEDICAL_WARD:             12,
      SURGICAL_WARD:            15,
      MATERNITY_WARD:           20,
      GYNECOLOGY:               12,
      PEDIATRIC_WARD:           10,
      NEWBORN_NEONATAL:         10,
      INPATIENT_GENERAL_WARD:   12,
      LABORATORY:                6,
      PHARMACY:                  4,
      PROCEDURE_MINOR_OPERATION: 20,
      ISOLATION:                15,
      SUPPORT_UNITS:             8,
    };
    const avgConsultationTime: number =
      WARD_CONSULTATION_TIME_MAP[patient.ward as string] ?? 8;

    // Wait Time Engine: queuePosition × avgConsultationTime (+ triage buffer)
    let estimatedWait = queuePosition * avgConsultationTime;
    const emergencyCount = allPatients.filter(p => p.priorityLevel === "EMERGENCY").length;

    // Add Triage Buffer for everyone EXCEPT emergencies themselves
    if (patient.priorityLevel !== "EMERGENCY") {
      estimatedWait += (emergencyCount * avgConsultationTime);
    }

    const latestScreening = await prisma.screening.findFirst({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      select: { triageResult: true, screeningType: true, createdAt: true },
    });

    return {
      fullName: patient.fullName,
      queuePosition: queuePosition,
      patientsAhead: Math.max(0, queuePosition - 1), // 0 means "you're next / it's your turn"
      avgConsultationTime,                           // ward-adaptive, in minutes — drives client backoff
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

    // CROSS_FACILITY: citizen identity lookup — no org boundary
    const patientRecord = await prisma.patient.findFirst({
      where: { ...CROSS_FACILITY, nationalId: rawId }
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

    // CROSS_FACILITY: identity merge is a global operation spanning all facilities
    const existingChild = await prisma.patient.findFirst({
      where: { ...CROSS_FACILITY, nationalId: childId }
    });

    if (!existingChild) {
      throw new Error("Child record not found.");
    }
    
    if (!existingChild.isMinor) {
      throw new Error("The specified record is not a minor.");
    }

    const existingAdult = await prisma.patient.findFirst({
      where: { ...CROSS_FACILITY, nationalId: cleanFaydaId }
    });

    if (existingAdult) {
      throw new Error("An adult profile with this Fayda ID already exists. Merge relation strategy required.");
    }

    const updatedPatient = await prisma.patient.update({
      where: { ...CROSS_FACILITY, id: existingChild.id } as any,
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

    // CROSS_FACILITY: citizen sign-in has no org session context
    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
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

export async function verifyFaydaCoach(faydaId: string, challengeInput: string) {
  try {
    const cleanId = faydaId.trim();
    const cleanChallenge = challengeInput.trim();

    if (!cleanId || !cleanChallenge) {
      return { success: false, error: "Both ID and Verification Challenge are required." };
    }

    // CROSS_FACILITY: citizen 2FA verification has no org session context
    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
        OR: [
          { nationalId: cleanId },
          { faydaId: cleanId },
          { healthId: cleanId }
        ]
      },
      include: {
        vitals: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });

    if (!patient) {
      return { success: false, error: "Fayda National ID not recognized in database." };
    }

    // Verify 2FA challenge:
    // A. Phone number suffix check
    let phoneMatch = false;
    if (patient.phoneNumber) {
      const lastFour = patient.phoneNumber.replace(/\D/g, "").slice(-4);
      if (lastFour === cleanChallenge) {
        phoneMatch = true;
      }
    }

    // B. Birth year check
    let yearMatch = false;
    if (patient.dateOfBirth) {
      const birthYear = new Date(patient.dateOfBirth).getUTCFullYear().toString();
      if (birthYear === cleanChallenge) {
        yearMatch = true;
      }
    }

    if (!phoneMatch && !yearMatch) {
      return { 
        success: false, 
        error: "Verification failed. The code does not match the registered phone suffix or birth year." 
      };
    }

    return { success: true, patient: JSON.parse(JSON.stringify(patient)) };

  } catch (error: any) {
    console.error("2FA Coach Verification Error:", error);
    return { success: false, error: "Database authentication failed." };
  }
}

export async function searchOfflineReferenceServer(query: string) {
  const { searchOfflineReference } = await import("../ai/dictionary.server");
  return searchOfflineReference(query);
}

/**
 * searchPatientMasterRecord()
 *
 * Global fallback search for the Doctor Console.
 * Queries the FULL Patient collection — no status, ward, or org restrictions.
 * Used when a doctor searches a National ID / Health ID / name that isn't in
 * the current active queue, so they can still open the patient's clinical chart.
 *
 * Returns up to 10 matches ordered by most-recently-updated.
 */
export async function searchPatientMasterRecord(query: string) {
  try {
    const q = query.trim();
    if (!q || q.length < 2) return [];

    // CROSS_FACILITY: master record search is explicitly global —
    // allows a doctor to pull historical records from any facility.
    const patients = await prisma.patient.findMany({
      where: {
        ...CROSS_FACILITY,
        OR: [
          { healthId:  { contains: q, mode: "insensitive" } },
          { nationalId:{ contains: q, mode: "insensitive" } },
          { faydaId:   { contains: q, mode: "insensitive" } },
          { hospitalId:{ contains: q, mode: "insensitive" } },
          { internalId:{ contains: q, mode: "insensitive" } },
          { fullName:  { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        vitals:        { orderBy: { createdAt: "desc" }, take: 1 },
        clinicalExam:  true,
        investigations:{ orderBy: { createdAt: "desc" }, take: 3 },
        prescriptions: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });

    const organizations = await prisma.organization.findMany({ select: { id: true, name: true } });
    const orgMap = Object.fromEntries(organizations.map((o) => [o.id, o.name]));
    const formatFacilityName = (orgId: string | null | undefined) => {
      if (!orgId) return null;
      if (orgMap[orgId]) return orgMap[orgId];
      return orgId
        .split("-")
        .filter((part) => part.toUpperCase() !== "MH")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
    };

    const mappedPatients = patients.map((p: any) => ({
      ...p,
      facilityName: formatFacilityName(p.organizationId),
      vitals: p.vitals?.map((v: any) => ({
        ...v,
        facilityName: formatFacilityName(v.organizationId),
      })) || [],
      investigations: p.investigations?.map((i: any) => ({
        ...i,
        facilityName: formatFacilityName(i.organizationId),
      })) || [],
      prescriptions: p.prescriptions?.map((pr: any) => ({
        ...pr,
        facilityName: formatFacilityName(pr.organizationId),
      })) || [],
      clinicalExam: p.clinicalExam ? {
        ...p.clinicalExam,
        facilityName: formatFacilityName(p.clinicalExam.organizationId),
      } : null,
    }));

    return JSON.parse(JSON.stringify(mappedPatients));
  } catch (error: any) {
    console.error("❌ DATABASE ERROR [searchPatientMasterRecord]:", error.message);
    return [];
  }
}

/**
 * getPatientByNationalId()
 *
 * Global identity lookup — resolves a patient record across ALL facilities
 * (Estonia e-Health cross-facility model) using the CROSS_FACILITY bypass token.
 *
 * Searches every known identity surface:
 *   • nationalId  — Fayda National ID digits (12 or 16 chars)
 *   • faydaId     — Fayda FIN stored on the patient record
 *   • hospitalId  — legacy / MHID-XXXXXX card number
 *   • healthId    — system-generated MyHealth public ID
 *   • internalId  — internal MongoDB-derived identifier
 *   • id          — raw MongoDB ObjectId (used by internal tooling)
 *
 * The CROSS_FACILITY spread injects `__bypassTenantFilter: true` which is
 * intercepted by the Prisma extension in lib/prisma.ts.  The flag is stripped
 * before the query reaches the driver — no org isolation is applied for this
 * read-only identity lookup.
 *
 * All write / transactional operations remain strictly scoped to the
 * session's organizationId — this function only resolves identity.
 */
export async function getPatientByNationalId(searchQuery: string) {
  try {
    const q = searchQuery?.trim();
    if (!q) return null;

    // CROSS_FACILITY: global identity resolution — no org boundary applied.
    // The Prisma extension strips __bypassTenantFilter before hitting the DB.
    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
        OR: [
          { nationalId: q },
          { faydaId:    q },
          { hospitalId: q },
          { healthId:   q },
          { internalId: q },
          { id:         q },
        ],
      } as any,
      // Include core clinical context so callers don't need a second query
      include: {
        vitals:        { orderBy: { createdAt: "desc" }, take: 1 },
        clinicalExam:  true,
        investigations:{ orderBy: { createdAt: "desc" }, take: 3 },
        prescriptions: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });

    return patient ? JSON.parse(JSON.stringify(patient)) : null;
  } catch (error: any) {
    console.error("❌ DATABASE ERROR [getPatientByNationalId]:", error.message);
    throw new Error(error.message || "Failed to retrieve patient by National ID.");
  }
}

/**
 * Normalizes phone numbers to a consistent format (+251...)
 */
function normalizePhoneNumber(phone: string): string {
  // Strip white spaces, dashes, tabs, parentheses, and any non-numeric except leading +
  let clean = phone.replace(/[^\d+]/g, "").replace(/\s+/g, "");

  // If there are multiple plus signs internally, keep only the first one
  if (clean.startsWith("+")) {
    clean = "+" + clean.replace(/\+/g, "");
  } else {
    clean = clean.replace(/\+/g, "");
  }

  // Handle local format: starts with 09 or 07 and length 10
  if (/^0[79]\d{8}$/.test(clean)) {
    return "+251" + clean.slice(1);
  }

  // Handle local format without leading 0: starts with 9 or 7 and length 9
  if (/^[79]\d{8}$/.test(clean)) {
    return "+251" + clean;
  }

  // Handle format with country code but no plus: starts with 2519... or 2517...
  if (/^251[79]\d{8}$/.test(clean)) {
    return "+" + clean;
  }

  // If it starts with +251, it's already well-formatted.
  // Otherwise, if it has length > 0 and doesn't start with +, let's add +
  if (clean.length > 0 && !clean.startsWith("+")) {
    return "+" + clean;
  }

  return clean;
}

/**
 * Checks OTP generation rate limits.
 * IP limit: max 60 entries in the last 5 minutes.
 * User limit: max 3 entries in the last 5 minutes.
 */
export async function checkOtpRateLimit(identifier: string, ipAddress: string): Promise<{ blocked: boolean; reason: "IDENTIFIER" | "IP" | null }> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // 1. IP Check
  const ipCount = await prisma.verificationRateLimit.count({
    where: {
      ipAddress,
      createdAt: { gte: fiveMinutesAgo }
    }
  });

  if (ipCount >= 60) {
    return { blocked: true, reason: "IP" };
  }

  // 2. Identifier Check
  const idCount = await prisma.verificationRateLimit.count({
    where: {
      identifier,
      createdAt: { gte: fiveMinutesAgo }
    }
  });

  if (idCount >= 3) {
    return { blocked: true, reason: "IDENTIFIER" };
  }

  return { blocked: false, reason: null };
}

/**
 * Initiates the citizen sign-in workflow by verifying the credential and generating an OTP.
 */
export async function initiateCitizenSignIn(credential: string) {
  try {
    const cleanCredential = credential.trim();
    if (!cleanCredential) {
      return { success: false, error: "Identifier is required." };
    }

    // Retrieve client IP
    const headersList = headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || headersList.get("x-real-ip") || "127.0.0.1";

    // Rate Limiting Check (using the input credential as the identifier)
    const rateLimit = await checkOtpRateLimit(cleanCredential, ipAddress);
    if (rateLimit.blocked) {
      return {
        success: false,
        error: rateLimit.reason === "IP" 
          ? "RATE_LIMIT_IP" 
          : "Too many verification requests. Please wait before trying again.",
        blockedReason: rateLimit.reason
      };
    }

    // Log the OTP request transaction in rate limit table immediately
    await prisma.verificationRateLimit.create({
      data: {
        ipAddress,
        identifier: cleanCredential
      }
    });

    const normalizedPhone = normalizePhoneNumber(cleanCredential);
    const phoneVariations = [cleanCredential, normalizedPhone];
    if (normalizedPhone.startsWith("+251")) {
      phoneVariations.push(normalizedPhone.slice(1));
      phoneVariations.push("0" + normalizedPhone.slice(4));
    }
    const uniquePhoneVariations = Array.from(new Set(phoneVariations)).filter(Boolean);

    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
        OR: [
          { id: cleanCredential },
          { healthId: cleanCredential },
          { nationalId: cleanCredential },
          { faydaId: cleanCredential },
          { hospitalId: cleanCredential },
          { internalId: cleanCredential },
          { mrn: cleanCredential },
          ...uniquePhoneVariations.map(p => ({ phoneNumber: p }))
        ]
      }
    });

    // Return a generic error to prevent identity harvesting
    if (!patient) {
      return { success: false, error: "Invalid credentials." };
    }

    // Generate secure 6-digit random code
    const otpVal = crypto.randomInt(100000, 1000000);
    const otpCode = String(otpVal);
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing attempts for this patient to prevent clutter
    await prisma.verificationAttempt.deleteMany({
      where: { patientId: patient.id, purpose: "CITIZEN_LOGIN" }
    }).catch(() => {});

    const attempt = await prisma.verificationAttempt.create({
      data: {
        patientId: patient.id,
        otpHash,
        purpose: "CITIZEN_LOGIN",
        expiresAt,
        attempts: 0,
        channel: "SMS",
        deliveryStatus: "SENT",
        ipAddress
      }
    });

    // Mock SMS transmission
    console.log("\n========================================================");
    console.log(`[SMS OTP SIMULATION] Sent OTP code: ${otpCode}`);
    console.log(`To Patient: ${patient.fullName}`);
    console.log(`Verified Phone Destination: ${patient.phoneNumber || "No Phone Number"}`);
    console.log("========================================================\n");

    // Mask phone number
    let maskedPhone = "+251 *******94";
    if (patient.phoneNumber) {
      const norm = normalizePhoneNumber(patient.phoneNumber);
      if (norm.startsWith("+251") && norm.length === 13) {
        maskedPhone = `+251 *******${norm.slice(-2)}`;
      } else {
        const cleanPhone = patient.phoneNumber.replace(/[^\d+]/g, "");
        if (cleanPhone.length > 4) {
          maskedPhone = `${cleanPhone.slice(0, 4)} *******${cleanPhone.slice(-2)}`;
        }
      }
    }

    return {
      success: true,
      sessionId: attempt.id,
      maskedPhone
    };
  } catch (error: any) {
    console.error("❌ INITIATE SIGN-IN ERROR:", error.message);
    return { success: false, error: "Failed to initiate sign-in workflow." };
  }
}

/**
 * Polymorphic Email Fallback Server Action.
 * Locates an active verification session, resolves Patient or User profile,
 * updates session properties, and dispatches the OTP code via email.
 */
export async function requestEmailFallback(sessionId: string) {
  try {
    if (!sessionId) {
      return { success: false, error: "Session ID is required." };
    }

    // 1. Locate active VerificationAttempt
    const attempt = await prisma.verificationAttempt.findUnique({
      where: { id: sessionId },
      include: {
        patient: true,
        user: true
      }
    });

    if (!attempt) {
      return { success: false, error: "No active verification session found." };
    }

    // 2. Resolve target entity profile (Patient or User/Staff)
    let email: string | null = null;

    if (attempt.patient) {
      email = attempt.patient.email;
    } else if (attempt.user) {
      email = attempt.user.email;
    }

    if (!email || !email.trim()) {
      return { success: false, error: "No registered email address found on file for this account." };
    }

    email = email.trim();

    // 3. Enforce checkOtpRateLimit using the profile's email address as the identifier
    const headersList = headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || headersList.get("x-real-ip") || "127.0.0.1";

    const rateLimit = await checkOtpRateLimit(email, ipAddress);
    if (rateLimit.blocked) {
      return {
        success: false,
        error: rateLimit.reason === "IP" 
          ? "RATE_LIMIT_IP" 
          : "Too many verification requests. Please wait before trying again.",
        blockedReason: rateLimit.reason
      };
    }

    // Log the OTP request transaction in rate limit table
    await prisma.verificationRateLimit.create({
      data: {
        ipAddress,
        identifier: email
      }
    });

    // 4. Generate new 6-digit numeric OTP and hash it
    const otpVal = crypto.randomInt(100000, 1000000);
    const otpCode = String(otpVal);
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update VerificationAttempt state flags
    await prisma.verificationAttempt.update({
      where: { id: sessionId },
      data: {
        channel: "EMAIL",
        deliveryStatus: "PENDING",
        otpHash,
        attempts: 0,
        expiresAt
      }
    });

    // 5. Send email via nodemailer wrapper
    const mailResult = await sendOTP(otpCode, email);

    // Update deliveryStatus based on result
    await prisma.verificationAttempt.update({
      where: { id: sessionId },
      data: {
        deliveryStatus: mailResult.success ? "SENT" : "FAILED"
      }
    });

    if (!mailResult.success) {
      return { success: false, error: "Failed to dispatch verification email." };
    }

    // Mask destination email (e.g. john.doe@example.com -> j***e@example.com)
    const [localPart, domain] = email.split("@");
    let maskedLocal = localPart;
    if (localPart.length > 2) {
      maskedLocal = localPart[0] + "****" + localPart[localPart.length - 1];
    } else if (localPart.length > 0) {
      maskedLocal = localPart[0] + "****";
    }
    const maskedEmail = `${maskedLocal}@${domain}`;

    return {
      success: true,
      channel: "EMAIL",
      maskedEmail
    };
  } catch (error: any) {
    console.error("❌ EMAIL FALLBACK ERROR:", error.message);
    return { success: false, error: "Failed to initiate email fallback." };
  }
}

/**
 * Confirms the citizen sign-in workflow by validating the OTP code.
 */
export async function confirmCitizenSignIn(credential: string, otpCode: string) {
  try {
    const cleanCredential = credential.trim();
    const cleanOtp = otpCode.trim();

    if (!cleanCredential || !cleanOtp) {
      return { success: false, error: "Credential and OTP code are required." };
    }

    const normalizedPhone = normalizePhoneNumber(cleanCredential);
    const phoneVariations = [cleanCredential, normalizedPhone];
    if (normalizedPhone.startsWith("+251")) {
      phoneVariations.push(normalizedPhone.slice(1));
      phoneVariations.push("0" + normalizedPhone.slice(4));
    }
    const uniquePhoneVariations = Array.from(new Set(phoneVariations)).filter(Boolean);

    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
        OR: [
          { id: cleanCredential },
          { healthId: cleanCredential },
          { nationalId: cleanCredential },
          { faydaId: cleanCredential },
          { hospitalId: cleanCredential },
          { internalId: cleanCredential },
          { mrn: cleanCredential },
          ...uniquePhoneVariations.map(p => ({ phoneNumber: p }))
        ]
      }
    });

    if (!patient) {
      return { success: false, error: "Authentication failed." };
    }

    const attempt = await prisma.verificationAttempt.findFirst({
      where: {
        patientId: patient.id,
        purpose: "CITIZEN_LOGIN"
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!attempt) {
      return { success: false, error: "No active verification session found." };
    }

    // Increment attempts
    const updatedAttempt = await prisma.verificationAttempt.update({
      where: { id: attempt.id },
      data: { attempts: { increment: 1 } }
    });

    if (updatedAttempt.attempts > 3) {
      await prisma.verificationAttempt.delete({ where: { id: attempt.id } }).catch(() => {});
      return { success: false, error: "Too many failed attempts. Session blocked." };
    }

    if (new Date() > updatedAttempt.expiresAt) {
      await prisma.verificationAttempt.delete({ where: { id: attempt.id } }).catch(() => {});
      return { success: false, error: "Verification code expired." };
    }

    const hashedInput = crypto.createHash("sha256").update(cleanOtp).digest("hex");
    if (hashedInput !== updatedAttempt.otpHash) {
      return { success: false, error: "Incorrect verification code." };
    }

    // Success - issue token and set cookies
    const tokenPayload = {
      patientId: patient.id,
      role: "CITIZEN",
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    const token = signToken(tokenPayload);

    const cookieStore = cookies();
    const isProd = process.env.NODE_ENV === "production";
    
    // Hardened session token cookie
    cookieStore.set("citizenSessionToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    // Client-readable cookies for role and ID
    const clientCookieOpts = {
      httpOnly: false,
      secure: isProd,
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    };
    cookieStore.set("userRole", "CITIZEN", clientCookieOpts);
    cookieStore.set("citizenPatientId", patient.id, clientCookieOpts);

    // Delete the attempt
    await prisma.verificationAttempt.delete({ where: { id: attempt.id } }).catch(() => {});

    return { success: true, patientId: patient.id, fullName: patient.fullName };
  } catch (error: any) {
    console.error("❌ CONFIRM SIGN-IN ERROR:", error.message);
    return { success: false, error: error.message || "Authentication failed." };
  }
}
/**
 * Direct single-step citizen login — credential + password.
 * Replaces the 2-step OTP flow. Validates the patient's stored passwordHash.
 * If no password is set on the account, returns a friendly setup prompt.
 */
export async function directCitizenSignIn(credential: string, password: string) {
  try {
    const cleanCredential = credential.trim();
    const cleanPassword = password.trim();

    if (!cleanCredential || !cleanPassword) {
      return { success: false, error: "ID and password are required." };
    }

    const normalizedPhone = normalizePhoneNumber(cleanCredential);
    const phoneVariations = [cleanCredential, normalizedPhone];
    if (normalizedPhone.startsWith("+251")) {
      phoneVariations.push(normalizedPhone.slice(1));
      phoneVariations.push("0" + normalizedPhone.slice(4));
    }
    const uniquePhoneVariations = Array.from(new Set(phoneVariations)).filter(Boolean);

    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
        OR: [
          { id: cleanCredential },
          { healthId: cleanCredential },
          { nationalId: cleanCredential },
          { faydaId: cleanCredential },
          { hospitalId: cleanCredential },
          { internalId: cleanCredential },
          { mrn: cleanCredential },
          ...uniquePhoneVariations.map((p) => ({ phoneNumber: p })),
        ],
      },
    });

    if (!patient) {
      return {
        success: false,
        error: "No patient record found for this identifier. Please check your ID or register.",
      };
    }

    // If the patient has no password yet, inform them
    if (!patient.passwordHash) {
      return {
        success: false,
        error:
          "No password is set for this account. Please contact your facility reception desk to set up your patient password.",
        noPassword: true,
      };
    }

    // Hash input and compare using HMAC-SHA256 (same as staff auth)
    const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
    const inputHash = crypto
      .createHmac("sha256", salt)
      .update(cleanPassword)
      .digest("hex");

    if (inputHash !== patient.passwordHash) {
      return { success: false, error: "Incorrect password. Please try again." };
    }

    // Issue session token
    const tokenPayload = {
      patientId: patient.id,
      role: "CITIZEN",
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    const token = signToken(tokenPayload);

    const cookieStore = cookies();
    const isProd = process.env.NODE_ENV === "production";

    cookieStore.set("citizenSessionToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    const clientCookieOpts = {
      httpOnly: false,
      secure: isProd,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    };
    cookieStore.set("userRole", "CITIZEN", clientCookieOpts);
    cookieStore.set("citizenPatientId", patient.id, clientCookieOpts);

    return { success: true, patientId: patient.id, fullName: patient.fullName };
  } catch (error: any) {
    console.error("❌ DIRECT CITIZEN SIGN-IN ERROR:", error.message);
    return { success: false, error: error.message || "Authentication failed." };
  }
}

/**
 * Lightweight citizen password validation.
 * Verifies if the credential (phone, healthId, etc.) matches the password,
 * returning the patient object without setting session cookies.
 */
export async function verifyCitizenPassword(credential: string, password: string) {
  try {
    const cleanCredential = credential.trim();
    const cleanPassword = password.trim();

    if (!cleanCredential || !cleanPassword) {
      return { success: false, error: "ID and password are required." };
    }

    const normalizedPhone = normalizePhoneNumber(cleanCredential);
    const phoneVariations = [cleanCredential, normalizedPhone];
    if (normalizedPhone.startsWith("+251")) {
      phoneVariations.push(normalizedPhone.slice(1));
      phoneVariations.push("0" + normalizedPhone.slice(4));
    }
    const uniquePhoneVariations = Array.from(new Set(phoneVariations)).filter(Boolean);

    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
        OR: [
          { id: cleanCredential },
          { healthId: cleanCredential },
          { nationalId: cleanCredential },
          { faydaId: cleanCredential },
          { hospitalId: cleanCredential },
          { internalId: cleanCredential },
          { mrn: cleanCredential },
          ...uniquePhoneVariations.map((p) => ({ phoneNumber: p })),
        ],
      },
    });

    if (!patient) {
      return { success: false, error: "No patient record found for this identifier." };
    }

    if (!patient.passwordHash) {
      return {
        success: false,
        error: "No password is set for this account.",
        noPassword: true,
      };
    }

    const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
    const inputHash = crypto
      .createHmac("sha256", salt)
      .update(cleanPassword)
      .digest("hex");

    if (inputHash !== patient.passwordHash) {
      return { success: false, error: "Incorrect password. Please try again." };
    }

    return { success: true, patient: JSON.parse(JSON.stringify(patient)) };
  } catch (error: any) {
    console.error("❌ VERIFY CITIZEN PASSWORD ERROR:", error.message);
    return { success: false, error: error.message || "Verification failed." };
  }
}

/**
 * Lookup citizen by phone, health ID, national ID, fayda, etc.
 * Returns only safe information (name, health ID, whether they have a password).
 */
export async function lookupCitizenByIdentifier(credential: string) {
  try {
    const cleanCredential = credential.trim();
    if (!cleanCredential) {
      return { success: false, error: "Identifier is required." };
    }

    const normalizedPhone = normalizePhoneNumber(cleanCredential);
    const phoneVariations = [cleanCredential, normalizedPhone];
    if (normalizedPhone.startsWith("+251")) {
      phoneVariations.push(normalizedPhone.slice(1));
      phoneVariations.push("0" + normalizedPhone.slice(4));
    }
    const uniquePhoneVariations = Array.from(new Set(phoneVariations)).filter(Boolean);

    const patient = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
        OR: [
          { id: cleanCredential },
          { healthId: cleanCredential },
          { nationalId: cleanCredential },
          { faydaId: cleanCredential },
          { hospitalId: cleanCredential },
          { internalId: cleanCredential },
          { mrn: cleanCredential },
          ...uniquePhoneVariations.map((p) => ({ phoneNumber: p })),
        ],
      },
    });

    if (!patient) {
      return { success: false, error: "No patient record found for this identifier." };
    }

    return {
      success: true,
      patientId: patient.id,
      healthId: patient.healthId,
      fullName: patient.fullName,
      hasPassword: !!patient.passwordHash,
    };
  } catch (error: any) {
    console.error("❌ LOOKUP CITIZEN BY IDENTIFIER ERROR:", error.message);
    return { success: false, error: error.message || "Lookup failed." };
  }
}

/**
 * Staff-triggered patient phone number update with auditing and broadcast simulation.
 */
export async function updatePatientPhoneByStaff(
  patientId: string,
  newPhoneNumber: string,
  authorizingStaffId: string,
  role?: string,
  facilityId?: string
) {
  try {
    const cookieStore = cookies();
    // Enforce server-side session check. If caller is authenticated, we use cookies.
    // Fall back to parameters if not set (for TriageDashboardClient backwards compatibility).
    const callerRole = cookieStore.get("userRole")?.value || role || "";

    const { normalizeHealthcareRole } = await import("@/lib/locales/enums");
    const normalizedRole = normalizeHealthcareRole(callerRole);

    // Validate caller role: RECEPTIONIST or SYSTEM_ADMINISTRATOR
    const isValidStaff =
      normalizedRole === "RECEPTIONIST" ||
      normalizedRole === "IT_HIS_ADMIN" ||
      normalizedRole === "HOSPITAL_CEO" ||
      callerRole === "RECEPTIONIST" ||
      callerRole === "SYSTEM_ADMINISTRATOR" ||
      callerRole === "ADMIN";

    if (!isValidStaff) {
      return { success: false, error: "Unauthorized. Staff authorization failed." };
    }

    const newPhoneNormalized = normalizePhoneNumber(newPhoneNumber);
    if (!newPhoneNormalized || newPhoneNormalized.length < 9) {
      return { success: false, error: "Invalid phone number format." };
    }

    // Run updates inside a secure Prisma transaction block
    const updatedPatient = await prisma.$transaction(async (tx) => {
      // a. Fetch the current Patient record to verify existence
      const patient = await tx.patient.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        throw new Error("Patient not found.");
      }

      const oldPhone = patient.phoneNumber || "None";

      // b. Create an entry in the 'PatientIdentityAudit' ledger capturing fieldAltered: "phone"
      await tx.patientIdentityAudit.create({
        data: {
          patientId,
          fieldAltered: "phone",
          oldValue: oldPhone,
          newValue: newPhoneNormalized,
          performedBy: `staffId::${authorizingStaffId}`,
          facilityId: facilityId || null
        }
      });

      // c. Mutate the phone field on the target Patient record to the new value
      const updated = await tx.patient.update({
        where: { id: patientId },
        data: { phoneNumber: newPhoneNormalized }
      });

      // Clear any blocked verification states (verification attempts)
      await tx.verificationAttempt.deleteMany({
        where: { patientId: patientId }
      }).catch(() => {});

      return updated;
    });

    // Twin-SMS broadcast simulation
    console.log("\n========================================================");
    console.log(`[STAFF-ASSISTED PHONE RESET]`);
    console.log(`Updated phone number for patient ${patientId} to ${newPhoneNormalized} by staff ${authorizingStaffId}`);
    console.log("========================================================\n");

    return { success: true, oldPhone: updatedPatient.phoneNumber, newPhone: newPhoneNormalized };
  } catch (error: any) {
    console.error("❌ updatePatientPhoneByStaff error:", error);
    return { success: false, error: error.message || "Failed to update phone number." };
  }
}

/**
 * Authenticated self-service profile update for citizens.
 */
export async function updateCitizenProfile(data: {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  email?: string;
  sex?: string;
  age?: number;
  religion?: string;
  occupation?: string;
  maritalStatus?: string;
  educationalStatus?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: string;
  nationalId?: string;
  faydaId?: string;
  password?: string;
  // NOTE: bypassLocks is intentionally NOT exposed. Locks are always enforced server-side.
}) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("citizenSessionToken")?.value;
    const citizenPatientId = cookieStore.get("citizenPatientId")?.value;

    if (!token || !citizenPatientId) {
      return { success: false, error: "Unauthorized. Missing session token." };
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== "CITIZEN" || payload.patientId !== citizenPatientId) {
      return { success: false, error: "Unauthorized. Invalid session token." };
    }

    const cleanFullName = data.fullName.trim();
    const cleanPhoneNumber = data.phoneNumber.trim();
    const cleanDob = data.dateOfBirth.trim();

    if (!cleanFullName || !cleanPhoneNumber || !cleanDob) {
      return { success: false, error: "Full Name, Phone Number, and Date of Birth are required." };
    }

    const normalizedPhone = normalizePhoneNumber(cleanPhoneNumber);
    if (!normalizedPhone || normalizedPhone.length < 9) {
      return { success: false, error: "Invalid phone number format." };
    }

    const patient = await prisma.patient.findUnique({
      where: { id: citizenPatientId }
    });

    if (!patient) {
      return { success: false, error: "Patient not found." };
    }

    const oldName = patient.fullName || "";
    const oldPhone = patient.phoneNumber || "";
    const oldDob = patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : "";
    const newDobParsed = new Date(cleanDob);

    if (isNaN(newDobParsed.getTime())) {
      return { success: false, error: "Invalid date of birth format." };
    }
    const currentYear = new Date().getFullYear();
    const dobYear = newDobParsed.getFullYear();
    if (dobYear < 1900 || dobYear > currentYear) {
      return { success: false, error: `Date of birth must be a valid date between 1900 and ${currentYear}.` };
    }
    if (newDobParsed > new Date()) {
      return { success: false, error: "Date of birth cannot be in the future." };
    }

    const changes: { field: string; oldVal: string; newVal: string }[] = [];
    if (oldName !== cleanFullName) {
      changes.push({ field: "fullName", oldVal: oldName, newVal: cleanFullName });
    }
    if (oldPhone !== normalizedPhone) {
      changes.push({ field: "phoneNumber", oldVal: oldPhone, newVal: normalizedPhone });
    }
    const incomingDobStr = newDobParsed.toISOString().split('T')[0];
    if (oldDob !== incomingDobStr) {
      changes.push({ field: "dateOfBirth", oldVal: oldDob, newVal: incomingDobStr });
    }

    // ─── Server-Side Clinical Integrity Locks ───────────────────────────────
    // Once nationalId, faydaId, or bloodGroup are set in the DB they are
    // immutable via self-service. The incoming payload is always discarded
    // and the existing DB value is preserved. There is NO bypass mechanism
    // exposed to citizens — this guard runs unconditionally.
    let finalNationalId = data.nationalId?.trim() || null;
    let finalFaydaId = data.faydaId?.trim() || null;
    let finalBloodGroup = data.bloodGroup?.trim() || null;

    if (patient.nationalId) {
      // Existing nationalId is immutable — discard any incoming value silently.
      finalNationalId = patient.nationalId;
    }
    if (patient.faydaId) {
      // Existing faydaId is immutable — discard any incoming value silently.
      finalFaydaId = patient.faydaId;
    }
    if (patient.bloodGroup) {
      // Existing bloodGroup is a clinical trait set by staff — immutable via self-service.
      finalBloodGroup = patient.bloodGroup;
    }
    // ────────────────────────────────────────────────────────────────────────

    // Additional fields comparison
    const fieldsToCompare = [
      { key: "email", val: data.email?.trim() || "" },
      { key: "sex", val: data.sex?.trim() || "" },
      { key: "religion", val: data.religion?.trim() || "" },
      { key: "occupation", val: data.occupation?.trim() || "" },
      { key: "maritalStatus", val: data.maritalStatus?.trim() || "" },
      { key: "educationalStatus", val: data.educationalStatus?.trim() || "" },
      { key: "emergencyContactName", val: data.emergencyContactName?.trim() || "" },
      { key: "emergencyContactPhone", val: data.emergencyContactPhone?.trim() || "" },
      { key: "bloodGroup", val: finalBloodGroup || "" },
      { key: "nationalId", val: finalNationalId || "" },
      { key: "faydaId", val: finalFaydaId || "" },
    ] as const;

    for (const f of fieldsToCompare) {
      const currentVal = (patient[f.key as keyof typeof patient] as string) || "";
      if (currentVal !== f.val) {
        changes.push({ field: f.key, oldVal: currentVal, newVal: f.val });
      }
    }

    // Age comparison
    const currentAge = patient.age ?? 0;
    const newAge = typeof data.age === "number" ? data.age : parseInt(String(data.age)) || 0;
    if (currentAge !== newAge) {
      changes.push({ field: "age", oldVal: String(currentAge), newVal: String(newAge) });
    }

    // Password update
    let newPasswordHash: string | undefined = undefined;
    if (data.password && data.password.trim().length > 0) {
      const cleanPassword = data.password.trim();
      if (cleanPassword.length < 4) {
        return { success: false, error: "Password must be at least 4 characters long." };
      }
      newPasswordHash = await hashPassword(cleanPassword);
      changes.push({ field: "password", oldVal: "[REDACTED]", newVal: "[REDACTED]" });
    }

    if (changes.length === 0) {
      return { success: true, message: "No changes detected." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: citizenPatientId },
        data: {
          fullName: cleanFullName,
          phoneNumber: normalizedPhone,
          dateOfBirth: newDobParsed,
          email: data.email?.trim() || null,
          sex: data.sex?.trim() || "Other",
          age: newAge,
          religion: data.religion?.trim() || null,
          occupation: data.occupation?.trim() || null,
          maritalStatus: data.maritalStatus?.trim() || null,
          educationalStatus: data.educationalStatus?.trim() || null,
          emergencyContactName: data.emergencyContactName?.trim() || null,
          emergencyContactPhone: data.emergencyContactPhone?.trim() || null,
          bloodGroup: finalBloodGroup,
          nationalId: finalNationalId,
          faydaId: finalFaydaId,
          ...(newPasswordHash ? { passwordHash: newPasswordHash } : {})
        }
      });

      for (const change of changes) {
        await tx.patientIdentityAudit.create({
          data: {
            patientId: citizenPatientId,
            fieldAltered: change.field,
            oldValue: change.oldVal,
            newValue: change.newVal,
            performedBy: "CITIZEN_AUTHENTICATED_SELF",
            facilityId: null
          }
        });
      }
    });

    if (oldPhone !== normalizedPhone) {
      console.log("\n========================================================");
      console.log(`[AUTHENTICATED CITIZEN PROFILE PHONE UPDATE]`);
      console.log(`Patient ${cleanFullName} (${citizenPatientId}) updated phone number from ${oldPhone} to ${normalizedPhone}.`);
      console.log("========================================================\n");
    }

    revalidatePath(`/patients/${citizenPatientId}/clinical-records`);
    revalidatePath(`/patients/${citizenPatientId}/profile`);
    
    return { success: true };
  } catch (error: any) {
    console.error("❌ updateCitizenProfile error:", error);
    return { success: false, error: error.message || "Failed to update profile." };
  }
}

/**
 * Sends a 6-digit verification OTP to a candidate new phone number.
 * Only callable after a successful email-fallback login (patientId is already authenticated).
 * Stores the hashed OTP as a VerificationAttempt with purpose = "PHONE_UPDATE".
 */
export async function requestPhoneUpdateOtp(patientId: string, newPhone: string) {
  try {
    if (!patientId || !newPhone) {
      return { success: false, error: "Patient ID and new phone number are required." };
    }

    const normalized = normalizePhoneNumber(newPhone.trim());
    if (!normalized.startsWith("+")) {
      return { success: false, error: "Invalid phone number. Please use Ethiopian format (e.g. 0911223344)." };
    }

    // Check the new phone is not already assigned to another patient
    const existing = await prisma.patient.findFirst({
      where: { phoneNumber: normalized, id: { not: patientId } }
    });
    if (existing) {
      return { success: false, error: "This phone number is already registered to another account." };
    }

    // Delete any stale PHONE_UPDATE attempts for this patient
    await prisma.verificationAttempt.deleteMany({
      where: { patientId, purpose: "PHONE_UPDATE" }
    }).catch(() => {});

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store attempt (we embed the target phone in the channel field for retrieval)
    await prisma.verificationAttempt.create({
      data: {
        patientId,
        purpose: "PHONE_UPDATE",
        otpHash,
        expiresAt,
        channel: normalized, // repurposed to carry the pending new phone
        attempts: 0
      }
    });

    // Simulate SMS delivery (replace with real gateway in production)
    const masked = normalized.slice(0, 4) + "****" + normalized.slice(-3);
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║      📱  PHONE UPDATE OTP (SMS SIM)      ║");
    console.log("╠══════════════════════════════════════════╣");
    console.log(`║  To      : ${normalized.padEnd(30)} ║`);
    console.log(`║  OTP     : ${otp.padEnd(30)} ║`);
    console.log(`║  Expires : ${expiresAt.toISOString().padEnd(30)} ║`);
    console.log("╚══════════════════════════════════════════╝\n");

    return { success: true, maskedPhone: masked };
  } catch (error: any) {
    console.error("❌ requestPhoneUpdateOtp error:", error.message);
    return { success: false, error: error.message || "Failed to send OTP." };
  }
}

/**
 * Validates the OTP sent to the candidate new phone and, on success, updates
 * the patient's phoneNumber in the database.
 */
export async function confirmPhoneUpdate(patientId: string, otpCode: string) {
  try {
    if (!patientId || !otpCode) {
      return { success: false, error: "Patient ID and OTP code are required." };
    }

    const cleanOtp = otpCode.trim();

    const attempt = await prisma.verificationAttempt.findFirst({
      where: { patientId, purpose: "PHONE_UPDATE" },
      orderBy: { createdAt: "desc" }
    });

    if (!attempt) {
      return { success: false, error: "No active phone update session found. Please request a new code." };
    }

    // Increment attempts
    const updated = await prisma.verificationAttempt.update({
      where: { id: attempt.id },
      data: { attempts: { increment: 1 } }
    });

    if (updated.attempts > 3) {
      await prisma.verificationAttempt.delete({ where: { id: attempt.id } }).catch(() => {});
      return { success: false, error: "Too many failed attempts. Please request a new code." };
    }

    if (new Date() > updated.expiresAt) {
      await prisma.verificationAttempt.delete({ where: { id: attempt.id } }).catch(() => {});
      return { success: false, error: "OTP expired. Please request a new code." };
    }

    const hashedInput = crypto.createHash("sha256").update(cleanOtp).digest("hex");
    if (hashedInput !== updated.otpHash) {
      return { success: false, error: "Incorrect OTP code." };
    }

    // The pending new phone was stored in the channel field
    const newPhone = updated.channel;

    // Update the patient's phone number
    await prisma.patient.update({
      where: { id: patientId },
      data: { phoneNumber: newPhone }
    });

    // Clean up the attempt
    await prisma.verificationAttempt.delete({ where: { id: attempt.id } }).catch(() => {});

    console.log(`✅ Phone number updated for patient ${patientId}: ${newPhone}`);
    revalidatePath(`/patients/${patientId}/clinical-records`);

    return { success: true, newPhone };
  } catch (error: any) {
    console.error("❌ confirmPhoneUpdate error:", error.message);
    return { success: false, error: error.message || "Failed to update phone number." };
  }
}

/**
 * Self-service online patient pre-registration action.
 * Generates a temporary Health ID (PRE-MHI-XXXXXX), hashes the password, and creates the patient in unverified state.
 */
export async function selfRegisterCitizen(data: any) {
  try {
    const { fullName, sex, age, phone, password } = data;

    if (!fullName || !sex || !age || !phone || !password) {
      return { success: false, error: "All fields are required." };
    }

    const cleanPhone = String(phone).replace(/\s+/g, "");

    // Securely generate unique healthId with PRE-MHI-XXXXXX format
    let healthId = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 20) {
      const randomDigits = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
      healthId = `PRE-MHI-${randomDigits}`;

      // Check if it already exists
      const existing = await prisma.patient.findFirst({
        where: {
          ...CROSS_FACILITY,
          healthId,
        } as any,
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return { success: false, error: "Failed to generate a unique temporary Health ID. Please try again." };
    }

    // Check if phone number is already registered
    const existingPhone = await prisma.patient.findFirst({
      where: {
        ...CROSS_FACILITY,
        phoneNumber: cleanPhone,
      } as any,
    });

    if (existingPhone) {
      return { success: false, error: "A patient with this phone number is already registered." };
    }

    // Hash the password using the existing system HMAC-SHA256 helper
    const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
    const passwordHash = crypto
      .createHmac("sha256", salt)
      .update(password)
      .digest("hex");

    const internalId = `MHI-${crypto.randomUUID()}`;

    let newPatient;
    try {
      newPatient = await prisma.patient.create({
        data: {
          healthId,
          internalId,
          fullName,
          sex,
          age: parseInt(String(age), 10),
          phoneNumber: cleanPhone,
          passwordHash,
          isVerified: false,
          registrationSource: "SELF",
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        const targets = err.meta?.target || [];
        const isHealthId = (typeof targets === "string" && targets.includes("healthId")) ||
                           (Array.isArray(targets) && targets.includes("healthId")) ||
                           (err.message?.includes("healthId"));
        if (isHealthId) {
          return { success: false, error: "Health ID is already registered in the system." };
        }
      }
      throw err;
    }

    return {
      success: true,
      patientId: newPatient.id,
      healthId: newPatient.healthId,
    };
  } catch (error: any) {
    console.error("❌ selfRegisterCitizen error:", error);
    if (error.code === "P2002") {
      const targets = error.meta?.target || [];
      const isHealthId = (typeof targets === "string" && targets.includes("healthId")) ||
                         (Array.isArray(targets) && targets.includes("healthId")) ||
                         (error.message?.includes("healthId"));
      if (isHealthId) {
        return { success: false, error: "Health ID is already registered in the system." };
      }
    }
    return { success: false, error: error.message || "Failed to register citizen." };
  }
}

/**
 * Verify a patient's identity. Swaps their "PRE-MHI-" prefix to standard clinical "MHI-".
 * Restricted to authenticated medical personnel (RECEPTIONIST, Doctor).
 */
export async function verifyPatientIdentity(patientId: string) {
  try {
    const cookieStore = cookies();
    const callerRole = cookieStore.get("userRole")?.value || "";

    const { normalizeHealthcareRole } = await import("@/lib/locales/enums");
    const normalizedRole = normalizeHealthcareRole(callerRole);

    const isValidStaff =
      normalizedRole === "RECEPTIONIST" ||
      normalizedRole === "GENERAL_PRACTITIONER" ||
      normalizedRole === "MEDICAL_SPECIALIST" ||
      normalizedRole === "SUB_SPECIALIST" ||
      callerRole === "RECEPTIONIST" ||
      callerRole === "DOCTOR" ||
      callerRole === "ADMIN";

    if (!isValidStaff) {
      return { success: false, error: "Unauthorized. Verification is restricted to medical personnel." };
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return { success: false, error: "Patient profile not found." };
    }

    let newHealthId = patient.healthId;
    if (patient.healthId.startsWith("PRE-MHI-")) {
      newHealthId = patient.healthId.replace("PRE-MHI-", "MHI-");
    }

    // Check if the new Health ID already exists to avoid unique constraint violations
    if (newHealthId !== patient.healthId) {
      const clash = await prisma.patient.findFirst({
        where: {
          OR: [
            { healthId: newHealthId },
            { internalId: newHealthId }
          ]
        }
      });
      if (clash) {
        return { success: false, error: `The target clinical Health ID ${newHealthId} already exists.` };
      }
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        isVerified: true,
        healthId: newHealthId
      }
    });

    // Revalidate paths
    revalidatePath(`/patients/${patientId}/clinical-records`);
    revalidatePath(`/patients/${patientId}/dashboard`);
    revalidatePath(`/patients/${updated.healthId}/clinical-records`);
    revalidatePath(`/patients/${updated.healthId}/dashboard`);

    return { success: true, healthId: updated.healthId };
  } catch (error: any) {
    console.error("❌ verifyPatientIdentity error:", error);
    return { success: false, error: error.message || "Failed to verify patient identity." };
  }
}

export async function loginPatientSession(data: { patientId: string; healthId: string }) {
  try {
    const { patientId, healthId } = data;
    const tokenPayload = {
      patientId,
      role: "CITIZEN",
      iat: Date.now(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    const token = signToken(tokenPayload);

    const cookieStore = cookies();
    const isProd = process.env.NODE_ENV === "production";

    cookieStore.set("citizenSessionToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    const clientCookieOpts = {
      httpOnly: false,
      secure: isProd,
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    };
    cookieStore.set("userRole", "CITIZEN", clientCookieOpts);
    cookieStore.set("citizenPatientId", patientId, clientCookieOpts);

    return { success: true };
  } catch (error: any) {
    console.error("❌ loginPatientSession error:", error);
    return { success: false, error: error.message || "Failed to start session." };
  }
}
