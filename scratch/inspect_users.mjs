import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users in database:`);
    users.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, nationalId: ${u.nationalId}, license: ${u.professionalLicenseNumber}`);
    });
  } catch (err) {
    console.error("Failed to query DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
