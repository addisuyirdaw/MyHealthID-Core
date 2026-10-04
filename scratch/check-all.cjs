const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const pts = await prisma.patient.findMany({
    where: { fullName: { contains: 'Belay', mode: 'insensitive' } }
  });
  console.log('Patients with Belay:', pts);
  
  const allPts = await prisma.patient.findMany({ select: { fullName: true, healthId: true, nationalId: true } });
  console.log('All Patients:', allPts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
