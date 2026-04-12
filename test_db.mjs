import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const patients = await prisma.patient.findMany({
      select: { fullName: true, nationalId: true }
    });
    console.log("Registered Patients:");
    console.log(patients);
  } catch (err) {
    console.error("Failed to query DB:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
