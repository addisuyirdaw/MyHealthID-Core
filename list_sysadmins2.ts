import { PrismaClient, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: Role.SYSTEM_ADMIN
    },
    select: {
      id: true,
      email: true,
      emailOrUsername: true,
      firstName: true,
      lastName: true,
      role: true,
      hospitalName: true
    }
  });

  console.log("-----------------------------------------");
  console.log("SYSTEM ADMIN USERS:");
  users.forEach(u => console.log(`- Name: ${u.firstName} ${u.lastName} | Username/Email: ${u.emailOrUsername} | Hospital: ${u.hospitalName}`));
  console.log("-----------------------------------------");
}

main().catch(console.error).finally(() => prisma.$disconnect());
