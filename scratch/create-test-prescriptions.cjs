const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({
    where: { nationalId: 'PT-00004' }
  });

  if (!patient) {
    console.log("Patient PT-00004 not found!");
    return;
  }

  // Create a prescription with notes but no explicit timing
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

  // Create a prescription with empty notes
  await prisma.prescription.create({
    data: {
      patientId: patient.id,
      drugName: "Ibuprofen",
      dosage: "400 mg",
      frequency: "PRN",
      duration: "As needed for pain",
      notes: null,
      status: "PENDING"
    }
  });

  console.log("Created test prescriptions for patient " + patient.id);
}
main().finally(() => prisma.$disconnect());
