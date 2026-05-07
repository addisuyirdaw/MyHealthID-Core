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
        legacyProviderName: 'SmartCare',
        externalSystemId: 'SC-10293'
      }
    });
    console.log(`Updated patient ${patient.fullName} with legacy details.`);
  } else {
    console.log("Patient 'ads' not found.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
