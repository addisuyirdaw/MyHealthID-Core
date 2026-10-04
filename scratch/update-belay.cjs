const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const patient = await prisma.patient.update({
    where: { healthId: 'HLT-1965' },
    data: {
      fullName: 'Belay Kassanew Wasie',
      age: 24,
      sex: 'Male',
      nationalId: 'PT-00004', // Keeping this as PT-00004 so they can search for it!
      organizationId: 'TI01', // Give them a facility so it doesn't say "Unknown" (TI01 is lal2 in Tigray)
      ward: 'OPD_OUTPATIENT'
    }
  });
  console.log(`Updated patient: ${patient.fullName}, Age: ${patient.age}, Sex: ${patient.sex}, Facility: ${patient.organizationId}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
