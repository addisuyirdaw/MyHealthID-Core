import prisma from "../lib/prisma";

async function main() {
  const patients = await prisma.patient.findMany({
    select: {
      id: true,
      fullName: true,
      healthId: true,
      nationalId: true,
      faydaId: true,
      hospitalId: true,
    }
  });

  console.log(`Total patients: ${patients.length}`);
  const withHospitalId = patients.filter(p => p.hospitalId !== null);
  console.log(`Patients with hospitalId set: ${withHospitalId.length}`);
  if (withHospitalId.length > 0) {
    console.log("Sample patients with hospitalId:", withHospitalId.slice(0, 5));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
