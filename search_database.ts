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

  console.log("-----------------------------------------");
  console.log("HOSPITALS FOUND:");
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
    console.log("-----------------------------------------");
    console.log("USERS / STAFF FOR THIS HOSPITAL:");
    console.log(users);
    console.log("-----------------------------------------");
  } else {
    console.log("No hospital found with the name 'sekota' in the local database.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
