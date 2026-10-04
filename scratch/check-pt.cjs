const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log(orgs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
