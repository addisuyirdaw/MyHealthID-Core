const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const CROSS_FACILITY = { __bypassTenantFilter: true };

async function main() {
  const q = "PT-00004";
  const patients = await prisma.patient.findMany({
    where: {
      ...CROSS_FACILITY,
      OR: [
        { healthId:  { contains: q, mode: "insensitive" } },
        { nationalId:{ contains: q, mode: "insensitive" } },
        { faydaId:   { contains: q, mode: "insensitive" } },
        { hospitalId:{ contains: q, mode: "insensitive" } },
        { internalId:{ contains: q, mode: "insensitive" } },
        { fullName:  { contains: q, mode: "insensitive" } },
      ],
    },
  });
  console.log("Found:", patients.map(p => p.fullName));
}
main().finally(() => prisma.$disconnect());
