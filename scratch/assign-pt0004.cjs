const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Delete the mock patient we created
  await prisma.patient.deleteMany({
    where: { healthId: 'HLT-PT0004' }
  });

  // Find the real presentation patient
  const realPatient = await prisma.patient.findFirst({
    where: { healthId: 'HLT-1965' }
  });

  if (realPatient) {
    // Give them the PT-00004 ID so the user can search for them
    await prisma.patient.update({
      where: { id: realPatient.id },
      data: {
        nationalId: 'PT-00004'
      }
    });
    console.log(`Successfully assigned PT-00004 to your real presentation patient (${realPatient.fullName}).`);
  } else {
    console.log("Could not find the real patient HLT-1965.");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
