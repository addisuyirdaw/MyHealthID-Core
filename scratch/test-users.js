import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true }
    });
    console.log("=== Organizations ===");
    console.log(orgs);

    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ["IT_HIS_ADMIN", "HOSPITAL_CEO"]
        }
      },
      select: {
        id: true,
        email: true,
        emailOrUsername: true,
        role: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        isActive: true
      }
    });
    console.log("\n=== Admin/Staff Users ===");
    console.log(admins);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
