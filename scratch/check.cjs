const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.patient.findMany({
    where: {
      OR: [
        { healthId: { contains: 'PLT-0004', mode: 'insensitive' } },
        { nationalId: { contains: 'PLT-0004', mode: 'insensitive' } },
        { faydaId: { contains: 'PLT-0004', mode: 'insensitive' } },
        { hospitalId: { contains: 'PLT-0004', mode: 'insensitive' } },
        { internalId: { contains: 'PLT-0004', mode: 'insensitive' } },
        { fullName: { contains: 'PLT-0004', mode: 'insensitive' } }
      ]
    }
  });
  console.log(JSON.stringify(p, null, 2));
}
main().finally(() => prisma.$disconnect());
