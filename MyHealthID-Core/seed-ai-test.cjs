const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({
    where: { fullName: 'ads' }
  });

  if (patient) {
    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        preExistingConditions: 'Cardiac arrhythmia, Type 2 Diabetes'
      }
    });
    console.log(`Updated patient ${patient.fullName} with cardiac history.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
