const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.patient.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      healthId: true,
      nationalId: true,
      faydaId: true,
      hospitalId: true,
      internalId: true,
      fullName: true
    }
  });
  console.log(JSON.stringify(p, null, 2));
}
main().finally(() => prisma.$disconnect());
