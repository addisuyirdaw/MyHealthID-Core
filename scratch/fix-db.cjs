const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function main() {
  const exams = await prisma.clinicalExamination.findMany();
  for (const exam of exams) {
    if (!exam.appointmentId) {
      await prisma.clinicalExamination.update({
        where: { id: exam.id },
        data: { appointmentId: crypto.randomUUID() }
      });
    }
  }
  console.log("Fixed dummy records.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
