const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const pts = await prisma.patient.findMany({
    include: {
      _count: {
        select: {
          vitals: true,
          investigations: true,
          prescriptions: true,
          clinicalExams: true
        }
      }
    }
  });
  
  pts.sort((a, b) => {
    const totalA = a._count.vitals + a._count.investigations + a._count.prescriptions + a._count.clinicalExams;
    const totalB = b._count.vitals + b._count.investigations + b._count.prescriptions + b._count.clinicalExams;
    return totalB - totalA;
  });

  const topPts = pts.slice(0, 3).map(p => ({
    fullName: p.fullName,
    healthId: p.healthId,
    nationalId: p.nationalId,
    hospitalId: p.hospitalId,
    counts: p._count
  }));
  console.log(JSON.stringify(topPts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
