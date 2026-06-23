"use server";

import prisma from "@/lib/prisma";

export interface TimelineEvent {
  id: string;
  date: string; // ISO string representing the Date
  type: "VITALS" | "EXAMINATION" | "DIAGNOSTIC" | "PRESCRIPTION" | "RECORD";
  title: string;
  clinicianName: string;
  description: string;
  metadata: any;
}

export interface TimelineFilters {
  categories?: string[];
  search?: string;
}

/**
 * Fetches database records concurrently across Vitals, ClinicalExamination,
 * DiagnosticOrder, Prescription, and MedicalRecord, mapping them to a
 * unified, date-sorted array sequence.
 */
export async function getPatientHealthTimeline(
  patientId: string,
  filters?: TimelineFilters
): Promise<TimelineEvent[]> {
  if (!patientId) {
    throw new Error("Patient ID is required.");
  }

  const categories = filters?.categories ?? [];
  const search = filters?.search?.trim().toLowerCase() ?? "";

  // Helper to check if a category is active/requested
  const shouldFetch = (cat: string) => categories.length === 0 || categories.includes(cat);

  // 1. Fetch concurrently from all 5 sources
  const [
    vitalsRecords,
    clinicalExams,
    diagnosticOrders,
    prescriptions,
    medicalRecords
  ] = await Promise.all([
    // A. Vitals
    shouldFetch("VITALS")
      ? prisma.vitals.findMany({
          where: { patientId },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),

    // B. ClinicalExamination
    shouldFetch("EXAMINATION")
      ? prisma.clinicalExamination.findMany({
          where: { patientId }
        })
      : Promise.resolve([]),

    // C. DiagnosticOrder (with related Investigation)
    shouldFetch("DIAGNOSTIC")
      ? prisma.diagnosticOrder.findMany({
          where: { patientId },
          include: {
            investigation: true,
            referredByUser: {
              select: {
                id: true,
                fullName: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),

    // D. Prescription
    shouldFetch("PRESCRIPTION")
      ? prisma.prescription.findMany({
          where: { patientId },
          orderBy: { createdAt: "desc" }
        })
      : Promise.resolve([]),

    // E. MedicalRecord
    shouldFetch("RECORD")
      ? prisma.medicalRecord.findMany({
          where: { patientId },
          orderBy: { recordedAt: "desc" }
        })
      : Promise.resolve([])
  ]);

  // 2. Resolve Doctor names for Prescriptions (since there is no direct relation mapped in schema)
  const doctorIds = Array.from(
    new Set(prescriptions.map((p) => p.doctorId).filter(Boolean) as string[])
  );
  const prescriptionDoctors = doctorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: doctorIds } },
        select: {
          id: true,
          fullName: true,
          firstName: true,
          lastName: true
        }
      })
    : [];

  const doctorNameMap = new Map<string, string>();
  prescriptionDoctors.forEach((doc) => {
    const name = doc.fullName ?? [doc.firstName, doc.lastName].filter(Boolean).join(" ");
    doctorNameMap.set(doc.id, name || "Attending Doctor");
  });

  const events: TimelineEvent[] = [];

  // Map VITALS
  vitalsRecords.forEach((v) => {
    const summary = `BP: ${v.bp} mmHg | Pulse: ${v.pulse} bpm | Temp: ${v.temp}°C | SpO2: ${v.spO2}% | RR: ${v.rr} cpm`;
    events.push({
      id: `vital-${v.id}`,
      date: v.createdAt.toISOString(),
      type: "VITALS",
      title: "Vital Signs Recorded",
      clinicianName: "Triage Desk",
      description: summary,
      metadata: {
        bp: v.bp,
        pulse: v.pulse,
        rr: v.rr,
        temp: v.temp,
        spO2: v.spO2,
        bmi: v.bmi,
        painLevel: v.painLevel,
        weightKg: v.weightKg,
        heightCm: v.heightCm,
        summary
      }
    });
  });

  // Map EXAMINATION
  clinicalExams.forEach((c) => {
    const summary = c.workingDiagnosis || c.chiefAssessment || "Physical exam completed.";
    events.push({
      id: `exam-${c.id}`,
      date: c.createdAt.toISOString(),
      type: "EXAMINATION",
      title: "Clinical Examination",
      clinicianName: "Attending Physician",
      description: summary,
      metadata: {
        provisionalDiagnosis: c.workingDiagnosis || null,
        chiefAssessment: c.chiefAssessment || null,
        differentialDiagnosis: c.differentialDiagnosis || null,
        clinicalNotes: c.clinicalNotes || null,
        progressNotes: c.progressNotes || null,
        summary,
        systems: {
          generalAppearance: c.generalAppearance,
          heent: c.heent,
          lymphoglandular: c.lymphoglandular,
          respiratory: c.respiratory,
          cardiovascular: c.cardiovascular,
          abdomen: c.abdomen,
          genitourinary: c.genitourinary,
          musculoskeletal: c.musculoskeletal,
          integumentary: c.integumentary,
          neurological: c.neurological
        }
      }
    });
  });

  // Map DIAGNOSTIC
  diagnosticOrders.forEach((d) => {
    const testName = d.investigation?.testName ?? d.diagnosticType;
    const result = d.investigation?.result ?? "Pending";
    const status = d.investigation?.status ?? d.routingStatus;
    const clinician = d.referredByUser
      ? d.referredByUser.fullName ?? [d.referredByUser.firstName, d.referredByUser.lastName].filter(Boolean).join(" ")
      : "Attending Physician";
    const summary = `Status: ${status} | Result: ${result}`;

    events.push({
      id: `diag-${d.id}`,
      date: d.createdAt.toISOString(),
      type: "DIAGNOSTIC",
      title: `Lab Test: ${testName}`,
      clinicianName: clinician || "Attending Physician",
      description: summary,
      metadata: {
        orderNumber: d.id,
        diagnosticType: d.diagnosticType,
        priority: d.priority,
        clinicalIndication: d.clinicalIndication,
        status,
        result,
        destinationNotes: d.destinationNotes,
        expectedTurnaroundTime: d.expectedTurnaroundTime
      }
    });
  });

  // Map PRESCRIPTION
  prescriptions.forEach((p) => {
    const clinician = p.doctorId ? doctorNameMap.get(p.doctorId) : "Attending Physician";
    const summary = `Dosage: ${p.dosage} | Frequency: ${p.frequency} | Duration: ${p.duration} | Status: ${p.status}`;
    events.push({
      id: `presc-${p.id}`,
      date: p.createdAt.toISOString(),
      type: "PRESCRIPTION",
      title: `Prescription: ${p.drugName}`,
      clinicianName: clinician ?? "Attending Physician",
      description: summary,
      metadata: {
        prescriptionNumber: p.id,
        medicationName: p.drugName,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        status: p.status,
        notes: p.notes
      }
    });
  });

  // Map RECORD
  medicalRecords.forEach((m) => {
    events.push({
      id: `record-${m.id}`,
      date: m.recordedAt.toISOString(),
      type: "RECORD",
      title: m.title || `${m.recordType} Record`,
      clinicianName: m.recordedBy || "System Log",
      description: m.content || "",
      metadata: {
        recordType: m.recordType,
        title: m.title,
        description: m.content,
        clinicalNotes: m.content,
        chiefComplaint: m.title
      }
    });
  });

  // 3. Client-side search optimization (if filter query supplied)
  let filteredEvents = events;
  if (search) {
    filteredEvents = events.filter((e) => {
      const matchText = (
        e.title +
        " " +
        e.clinicianName +
        " " +
        e.description +
        " " +
        JSON.stringify(e.metadata)
      ).toLowerCase();
      return matchText.includes(search);
    });
  }

  // 4. Sort descending by date
  return filteredEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
