import prisma from "@/lib/prisma";

/**
 * Fetches a complete, serialized clinical context snapshot for a given patient.
 * All queries run in parallel. Dates are converted to ISO strings for safe JSON serialization.
 * This snapshot is passed verbatim into the Gemini system prompt to prevent hallucination.
 */
export async function getPatientClinicalContext(patientId: string) {
  const [patient, medicalRecords, vitals, prescriptions, labResults, appointments] =
    await Promise.all([
      // Core demographics + allergies
      prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          fullName: true,
          age: true,
          sex: true,
          bloodGroup: true,
          allergyInformation: true,
          preExistingConditions: true,
          familyHistory: true,
          surgicalHistory: true,
          chiefComplaint: true,
          detailedSituation: true,
          suspectedDisease: true,
          ward: true,
          triageStatus: true,
          priorityLevel: true,
          dateOfAdmission: true,
          emergencyFlag: true,
        },
      }),

      // Last 15 clinical encounter notes
      prisma.medicalRecord.findMany({
        where: { patientId },
        orderBy: { recordedAt: "desc" },
        take: 15,
        select: {
          recordType: true,
          title: true,
          content: true,
          recordedBy: true,
          recordedAt: true,
        },
      }),

      // Last 10 vitals recordings
      prisma.vitals.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          bp: true,
          pulse: true,
          rr: true,
          temp: true,
          spO2: true,
          bmi: true,
          weightKg: true,
          heightCm: true,
          painLevel: true,
          createdAt: true,
        },
      }),

      // Last 20 prescriptions
      prisma.prescription.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          drugName: true,
          dosage: true,
          frequency: true,
          duration: true,
          notes: true,
          status: true,
          createdAt: true,
        },
      }),

      // Last 15 lab result items via lab requests
      prisma.labResultItem.findMany({
        where: { request: { patientId } },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          testName: true,
          value: true,
          textValue: true,
          isAbnormal: true,
          isCritical: true,
          createdAt: true,
          request: {
            select: {
              status: true,
              tests: true,
              orderDate: true,
              completedDate: true,
            },
          },
        },
      }),

      // Last 10 appointments
      prisma.appointment.findMany({
        where: { patientId },
        orderBy: { dateTime: "desc" },
        take: 10,
        select: {
          department: true,
          dateTime: true,
          status: true,
          chiefComplaints: true,
        },
      }),
    ]);

  // Serialize dates to ISO strings for safe JSON embedding
  return {
    patient: patient
      ? {
          ...patient,
          dateOfAdmission: patient.dateOfAdmission?.toISOString() ?? null,
        }
      : null,
    medicalRecords: medicalRecords.map((r) => ({
      ...r,
      recordedAt: r.recordedAt.toISOString(),
    })),
    vitals: vitals.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    })),
    prescriptions: prescriptions.map((p) => ({
      ...p,
      status: p.status.toString(),
      createdAt: p.createdAt.toISOString(),
    })),
    labResults: labResults.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      request: {
        ...l.request,
        status: l.request.status.toString(),
        orderDate: l.request.orderDate.toISOString(),
        completedDate: l.request.completedDate?.toISOString() ?? null,
      },
    })),
    appointments: appointments.map((a) => ({
      ...a,
      status: a.status.toString(),
      dateTime: a.dateTime.toISOString(),
    })),
  };
}

export type PatientClinicalContext = Awaited<
  ReturnType<typeof getPatientClinicalContext>
>;
