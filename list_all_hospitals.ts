import prisma from './lib/prisma';

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, code: true }
  });

  console.log("-----------------------------------------");
  console.log(`ALL HOSPITALS IN DATABASE (Total: ${orgs.length}):`);
  orgs.forEach(o => console.log(`- ${o.name} (Code: ${o.code}, ID: ${o.id})`));
  console.log("-----------------------------------------");
  
  if (orgs.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['HOSPITAL_CEO', 'SYSTEM_ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        emailOrUsername: true,
        firstName: true,
        lastName: true,
        role: true,
        hospitalName: true,
        organizationId: true
      }
    });
    console.log("ALL ADMIN USERS:");
    users.forEach(u => console.log(`- ${u.firstName} ${u.lastName} | Role: ${u.role} | Username/Email: ${u.emailOrUsername} | Hospital: ${u.hospitalName}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
