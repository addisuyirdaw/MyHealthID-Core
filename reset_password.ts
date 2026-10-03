import prisma from './lib/prisma';
import crypto from 'crypto';

async function main() {
  const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
  const newPassword = "123456";
  const passwordHash = crypto.createHmac("sha256", salt).update(newPassword).digest("hex");

  await prisma.user.updateMany({
    where: { emailOrUsername: '12345670' },
    data: { passwordHash: passwordHash }
  });

  console.log("Password reset successfully for 12345670 to 123456");
}

main().catch(console.error).finally(() => prisma.$disconnect());
