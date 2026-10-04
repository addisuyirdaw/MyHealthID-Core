const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.patient.deleteMany({ where: { healthId: 'HLT-PT0004' } });
  const newPatient = await prisma.patient.create({
    data: {
      healthId: 'HLT-PT0004',
      nationalId: 'PT-00004',
      fullName: 'Cross Facility Test Patient',
      age: 35,
      sex: 'Male',
      reasonForVisit: 'Testing cross facility search',
      chiefComplaint: 'Testing',
      ward: 'OPD_OUTPATIENT',
      triageStatus: 'GREEN',
      priorityLevel: 'ROUTINE',
      organizationId: 'TI01', // A different hospital from SI01 where doctor is logged in
      status: 'ACTIVE',
      internalId: 'MHI-PT0004-TEST'
    }
  });
  console.log('Created test patient for cross-facility lookup:', newPatient.fullName);
}
main().catch(console.error).finally(() => prisma.$disconnect());
