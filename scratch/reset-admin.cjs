const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function hashPassword(password) {
  // Using the fallback salt or the one from env
  const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
  return crypto
    .createHmac("sha256", salt)
    .update(password)
    .digest("hex");
}

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: 'SYSTEM_ADMINISTRATOR' }
  });

  if (admins.length === 0) {
    console.log("No System Administrator found in the database.");
    console.log("You can create one by visiting the /system-bootstrap route in your browser.");
  } else {
    console.log(`Found ${admins.length} System Administrator(s):`);
    for (const admin of admins) {
      console.log(`- Email: ${admin.email}`);
    }
    
    // Reset the first admin's password to 'Admin@123'
    const newPassword = 'Admin@123';
    const hash = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id: admins[0].id },
      data: { passwordHash: hash }
    });
    
    console.log(`\nPassword for ${admins[0].email} has been reset to: ${newPassword}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
