import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, region: true }
    });
    console.log("Registered Hospitals/Facilities:");
    console.log(orgs);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
