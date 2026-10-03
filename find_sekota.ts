import prisma from './lib/prisma';

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      name: {
        contains: 'sekota',
        mode: 'insensitive'
      }
    }
  });

  console.log("Found Organizations:");
  console.log(orgs.map(o => ({ id: o.id, name: o.name, code: o.code })));

  if (orgs.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        organizationId: {
          in: orgs.map(o => o.id)
        }
      },
      select: {
        id: true,
        email: true,
        emailOrUsername: true,
        firstName: true,
        lastName: true,
        role: true,
        professionalLicenseNumber: true
      }
    });
    console.log("\nFound Users for these organizations:");
    console.log(users);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
