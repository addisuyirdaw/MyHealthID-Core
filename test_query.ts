import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cleanCredential = "PT-00004";
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [
        { id: cleanCredential },
        { healthId: cleanCredential },
        { nationalId: cleanCredential },
        { faydaId: cleanCredential },
        { hospitalId: cleanCredential },
        { internalId: cleanCredential },
        { mrn: cleanCredential },
        { phoneNumber: cleanCredential }
      ]
    }
  });

  console.log("Found patient:", patient ? patient.id : "NO");

  const verified = await prisma.verifiedCitizen.findFirst({
    where: {
      OR: [
        { nationalFin: cleanCredential },
        { phoneDigits: cleanCredential }
      ]
    }
  });

  console.log("Found verified citizen:", verified ? verified.id : "NO");
}

main().catch(console.error).finally(() => prisma.$disconnect());
