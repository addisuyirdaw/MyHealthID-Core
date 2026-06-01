import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function placeholderHash(email) {
  return crypto
    .createHmac("sha256", process.env.PASSWORD_SALT || "myhealthid-secret")
    .update(`legacy-reset-${email}`)
    .digest("hex");
}

async function main() {
  console.log("🔍 Fetching all users from database...");
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} total users.`);

  let patchedUsername = 0;
  let patchedPassword = 0;

  for (const user of users) {
    const updates = {};
    
    // Check if emailOrUsername is null, undefined, or empty
    if (!user.emailOrUsername) {
      updates.emailOrUsername = user.email || `user-${user.id}@myhealthid.gov.et`;
      patchedUsername++;
    }

    // Check if passwordHash is null, undefined, or empty
    if (!user.passwordHash) {
      updates.passwordHash = placeholderHash(user.email || user.id);
      patchedPassword++;
    }

    if (Object.keys(updates).length > 0) {
      console.log(`⚡ Updating user ID ${user.id} (${user.email}):`, updates);
      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });
    }
  }

  console.log(`\n🎉 Backfill complete! Patched usernames: ${patchedUsername}, Patched password hashes: ${patchedPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
