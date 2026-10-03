import { PrismaClient } from '@prisma/client';
import crypto from "crypto";

const prisma = new PrismaClient();

const CROSS_FACILITY = { __bypassTenantFilter: true };

async function main() {
  const cleanCredential = "HLT-380984";
  
  const phoneVariations = [cleanCredential];
  
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
        ...phoneVariations.map((p) => ({ phoneNumber: p })),
      ],
    },
  });

  console.log("Patient query result:", patient ? patient.healthId : "NULL");
}

main().catch(console.error).finally(() => prisma.$disconnect());
