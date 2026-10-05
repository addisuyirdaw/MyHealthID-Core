const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'SYSTEM_ADMINISTRATOR' }
  });

  if (admins.length > 0) {
    const admin = admins[0];
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        isFirstLogin: true,
        activationCode: 'ADMIN123'
      }
    });
    console.log(`Updated System Admin (${admin.email}) to use activation code 'ADMIN123'.`);
  } else {
    console.log("No system admin found.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
