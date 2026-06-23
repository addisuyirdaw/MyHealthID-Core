const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  // Find ALL admin users whose emailOrUsername still contains hyphens (the bug)
  const brokenUsers = await prisma.user.findMany({
    where: {
      emailOrUsername: { contains: '-' }
    }
  });

  if (brokenUsers.length === 0) {
    console.log('No broken users found. Checking all users...');
    const all = await prisma.user.findMany({ select: { id: true, emailOrUsername: true, organizationId: true } });
    all.forEach(u => console.log(u.emailOrUsername, '->', u.organizationId));
    return;
  }

  for (const user of brokenUsers) {
    const fixed = user.emailOrUsername.replace(/[^a-z0-9]/g, '');
    await prisma.user.update({
      where: { id: user.id },
      data: { emailOrUsername: fixed }
    });
    console.log('Fixed:', user.emailOrUsername, '->', fixed);
  }

  console.log('Done. Fixed', brokenUsers.length, 'user(s).');
}

fix()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
