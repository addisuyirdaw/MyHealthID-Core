const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'SYSTEM_ADMINISTRATOR' }
  });
  console.log(JSON.stringify(admins, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
