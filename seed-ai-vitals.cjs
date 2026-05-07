const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.patient.findFirst({where:{fullName:'ads'}});
  if(p){
    await prisma.vitals.create({
      data:{
        patientId:p.id,
        bp:'150/95',
        pulse:105,
        temp:37.2,
        spO2:98,
        rr:20,
        createdAt: new Date()
      }
    });
    console.log('added high bp vital');
  }
}
main().finally(() => prisma.$disconnect());
