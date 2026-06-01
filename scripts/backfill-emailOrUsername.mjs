/**
 * backfill-emailOrUsername.mjs
 * ────────────────────────────
 * Patches legacy User documents that are missing fields which the Prisma
 * schema now treats as nullable but that existed as non-nullable before.
 *
 * Fields covered:
 *   - emailOrUsername  → set to the document's `email` value
 *   - passwordHash     → set to a placeholder hash (user must reset PIN)
 *
 * Safe to run multiple times (idempotent).
 * Usage:  node scripts/backfill-emailOrUsername.mjs
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function placeholderHash(email) {
  // Deterministic placeholder — user will be prompted to reset on first real login
  return crypto
    .createHmac("sha256", process.env.PASSWORD_SALT || "myhealthid-secret")
    .update(`legacy-reset-${email}`)
    .digest("hex");
}

async function main() {
  let totalPatched = 0;
  let totalSkipped = 0;

  // ── 1. Backfill emailOrUsername ──────────────────────────────────────────────
  console.log("🔍 [1/2] Finding users with null emailOrUsername...");
  const noUsername = await prisma.user.findMany({
    where: { emailOrUsername: null },
    select: { id: true, email: true },
  });

  if (noUsername.length === 0) {
    console.log("   ✅ None found.");
  } else {
    console.log(`   📋 Found ${noUsername.length} user(s).`);
    for (const user of noUsername) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailOrUsername: user.email },
        });
        console.log(`   ✔ ${user.id}  emailOrUsername = "${user.email}"`);
        totalPatched++;
      } catch (err) {
        console.warn(`   ⚠ Skipped ${user.id}: ${err.message}`);
        totalSkipped++;
      }
    }
  }

  // ── 2. Backfill passwordHash ─────────────────────────────────────────────────
  console.log("\n🔍 [2/2] Finding users with null passwordHash...");
  const noHash = await prisma.user.findMany({
    where: { passwordHash: null },
    select: { id: true, email: true },
  });

  if (noHash.length === 0) {
    console.log("   ✅ None found.");
  } else {
    console.log(`   📋 Found ${noHash.length} user(s).`);
    for (const user of noHash) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: placeholderHash(user.email) },
        });
        console.log(`   ✔ ${user.id}  passwordHash set (placeholder)`);
        totalPatched++;
      } catch (err) {
        console.warn(`   ⚠ Skipped ${user.id}: ${err.message}`);
        totalSkipped++;
      }
    }
  }

  console.log(`\n🎉 Done. Patched: ${totalPatched}, Skipped: ${totalSkipped}`);
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
