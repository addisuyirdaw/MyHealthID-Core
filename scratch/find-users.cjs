const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { emailOrUsername: true, role: true, firstName: true, lastName: true }
  });
  console.log("All Users:");
  users.forEach(u => console.log(`- ${u.emailOrUsername} | ${u.role} | ${u.firstName} ${u.lastName}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
