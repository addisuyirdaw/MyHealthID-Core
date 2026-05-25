"use server";

import prisma from "@/lib/prisma";

export async function getHospitalStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const totalPatientsToday = await prisma.patient.count({
    where: {
      createdAt: { gte: startOfDay }
    }
  });

  const wardSaturationRaw = await prisma.patient.groupBy({
    by: ['ward'],
    _count: { ward: true },
    where: {
      createdAt: { gte: startOfDay }
    }
  });

  const wardSaturation = wardSaturationRaw.map(w => ({
    ward: w.ward,
    count: w._count.ward
  })).sort((a, b) => b.count - a.count);

  // Average wait time (Difference between checkInTime and update time for IN_PROGRESS and COMPLETED queue entries)
  const queues = await prisma.queue.findMany({
    where: {
      status: { in: ["IN_PROGRESS", "COMPLETED"] },
      createdAt: { gte: startOfDay }
    },
    select: {
      checkInTime: true,
      updatedAt: true
    }
  });

  let totalWaitMs = 0;
  queues.forEach(q => {
    totalWaitMs += q.updatedAt.getTime() - q.checkInTime.getTime();
  });
  const avgWaitMs = queues.length > 0 ? totalWaitMs / queues.length : 0;
  const avgWaitMinutes = Math.floor(avgWaitMs / 60000);

  return { totalPatientsToday, wardSaturation, avgWaitMinutes };
}

export async function getLiveActivity() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Fetch latest 10 creations/updates from various tables for today
  const [queues, prescriptions, investigations, patients] = await Promise.all([
    prisma.queue.findMany({
      take: 10,
      where: { updatedAt: { gte: startOfDay } },
      orderBy: { updatedAt: 'desc' },
      include: { patient: { select: { fullName: true } } }
    }),
    prisma.prescription.findMany({
      take: 10,
      where: { updatedAt: { gte: startOfDay } },
      orderBy: { updatedAt: 'desc' },
      include: { patient: { select: { fullName: true } } }
    }),
    prisma.investigation.findMany({
      take: 10,
      where: { updatedAt: { gte: startOfDay } },
      orderBy: { updatedAt: 'desc' },
      include: { patient: { select: { fullName: true } } }
    }),
    prisma.patient.findMany({
      take: 10,
      where: { createdAt: { gte: startOfDay } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const activity: any[] = [];

  queues.forEach(q => {
    if (q.status === 'COMPLETED') activity.push({ date: q.updatedAt, title: "Doctor finished visit", description: `Visit completed for ${q.patient.fullName}` });
    else if (q.status === 'IN_PROGRESS') activity.push({ date: q.updatedAt, title: "Patient called", description: `Doctor called ${q.patient.fullName}` });
  });

  prescriptions.forEach(p => {
    if (p.status === 'DISPENSED') activity.push({ date: p.updatedAt, title: "Prescription Dispensed", description: `Pharmacist dispensed ${p.drugName} for ${p.patient.fullName}` });
    else activity.push({ date: p.createdAt, title: "Prescription Ordered", description: `Doctor ordered ${p.drugName} for ${p.patient.fullName}` });
  });

  investigations.forEach(i => {
    if (i.status === 'COMPLETED') activity.push({ date: i.updatedAt, title: "Lab Results Ready", description: `Results uploaded for ${i.testName} (${i.patient.fullName})` });
    else activity.push({ date: i.createdAt, title: "Lab Order Placed", description: `Test ${i.testName} requested for ${i.patient.fullName}` });
  });

  patients.forEach(p => {
    activity.push({ date: p.createdAt, title: "Patient Registered", description: `New registration: ${p.fullName} (${p.ward.replace(/_/g, ' ')})` });
  });

  // Sort and pick top 10
  activity.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  return JSON.parse(JSON.stringify(activity.slice(0, 10)));
}

export async function getTriageHeatmap() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const patients = await prisma.patient.findMany({
    where: {
      createdAt: { gte: startOfDay },
      chiefComplaint: { not: null }
    },
    select: { chiefComplaint: true }
  });

  const keywordCounts: Record<string, number> = {};
  const commonKeywords = ['chest', 'pain', 'fever', 'cough', 'breath', 'blood', 'headache', 'stomach', 'accident', 'unconscious', 'severe', 'vomiting', 'nausea', 'dizzy', 'injury'];

  patients.forEach(p => {
    if (p.chiefComplaint) {
      const lowerComplaint = p.chiefComplaint.toLowerCase();
      // Track uniqueness per patient so they don't count twice for same symptom
      const seen = new Set<string>();
      commonKeywords.forEach(kw => {
        if (lowerComplaint.includes(kw) && !seen.has(kw)) {
          keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
          seen.add(kw);
        }
      });
    }
  });

  const heatmap = Object.entries(keywordCounts).map(([keyword, count]) => ({
    keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1),
    count
  })).sort((a, b) => b.count - a.count);

  return heatmap;
}
