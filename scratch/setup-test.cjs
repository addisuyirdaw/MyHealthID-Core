const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({
    where: { nationalId: 'PT-00004' }
  });

  if (!patient) return;

  // Cleanup old test prescriptions
  await prisma.prescription.deleteMany({
    where: { patientId: patient.id }
  });

  // Re-create exact test spec
  await prisma.prescription.create({
    data: {
      patientId: patient.id,
      drugName: "Amoxicillin",
      dosage: "500 mg",
      frequency: "TID",
      duration: "5 days",
      notes: "Take after meals",
      status: "DISPENSED"
    }
  });

  await prisma.prescription.create({
    data: {
      patientId: patient.id,
      drugName: "Ibuprofen",
      dosage: "400 mg",
      frequency: "BID",
      duration: "3 days",
      notes: null,
      status: "PENDING"
    }
  });

  console.log("Prescriptions created successfully.");
}

main().finally(() => prisma.$disconnect());
