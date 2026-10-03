import prisma from './lib/prisma';

async function main() {
  const CROSS_FACILITY = { __bypassTenantFilter: true };
  const patients = await prisma.patient.findMany({
    where: CROSS_FACILITY as any
  });
  
  let found = false;
  for (const p of patients) {
    const jsonStr = JSON.stringify(p);
    if (jsonStr.includes("PT-00004") || jsonStr.includes("00004")) {
      console.log("Found something in patient:", p.id, p.healthId, p.nationalId, p.hospitalId, p.faydaId, p.mrn, p.internalId);
      found = true;
    }
  }
  if (!found) {
    console.log("No patient contains PT-00004 at all.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
