import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const patients = await prisma.patient.findMany({ take: 5 });
  console.log("Patients:", patients.map(p => ({
    id: p.id,
    healthId: p.healthId,
    nationalId: p.nationalId,
    internalId: p.internalId,
    fullName: p.fullName
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
