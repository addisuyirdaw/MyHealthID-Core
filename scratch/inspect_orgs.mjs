import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        registrationId: true
      }
    });
    console.log(`Found ${orgs.length} organizations in database:`);
    orgs.forEach(o => {
      console.log(`- ID: ${o.id}, Name: ${o.name}, Code: ${o.code}, RegId: ${o.registrationId}`);
    });
  } catch (err) {
    console.error("Failed to query DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
