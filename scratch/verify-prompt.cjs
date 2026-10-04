const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patientId = "870a9059-1165-4d3f-b6b5-d1e653362733"; // Patient ID from previous log

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      vitals: { orderBy: { createdAt: 'desc' }, take: 1 },
      prescriptions: { orderBy: { createdAt: 'desc' }, take: 5 }
    }
  });

  const activePrescriptionsText = patient.prescriptions.length > 0 ? patient.prescriptions.map(p => `  * Medication:
    - Name: ${p.drugName || "Not recorded"}
    - Dosage: ${p.dosage || "Not recorded"}
    - Frequency: ${p.frequency || "Not recorded"}
    - Duration: ${p.duration || "Not recorded"}
    - Instructions: ${p.notes || "Not recorded"}
    - Status: ${p.status || "Not recorded"}
    - Date: ${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Not recorded"}`).join("\n") : "  No active prescriptions";

  console.log("=== CONSTRUCTED CONTEXT ===");
  console.log(activePrescriptionsText);
  console.log("===========================");
}

main().finally(() => prisma.$disconnect());
