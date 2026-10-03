import prisma from './lib/prisma';
import crypto from "crypto";

async function main() {
  const CROSS_FACILITY = { __bypassTenantFilter: true };
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

main().catch(console.error);
