/**
 * One-shot fix script: lookup patient by national ID / FIN 631508354891,
 * display their current profile, and set a new password.
 *
 * Usage:
 *   node scripts/fix-patient-631508354891.mjs <password>
 *
 * Example:
 *   node scripts/fix-patient-631508354891.mjs MyNewPass@2025
 */

import { createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();
const NATIONAL_ID = "631508354891";

function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
  return createHmac("sha256", salt).update(password).digest("hex");
}

async function main() {
  const newPassword = process.argv[2];
  if (!newPassword) {
    console.error("❌  Usage: node scripts/fix-patient-631508354891.mjs <new-password>");
    process.exit(1);
  }

  console.log(`\n🔍  Looking up patient with national ID: ${NATIONAL_ID}...\n`);

  // Search across multiple identifier fields
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [
        { nationalId: NATIONAL_ID },
        { faydaId: NATIONAL_ID },
        { healthId: NATIONAL_ID },
        { phoneNumber: NATIONAL_ID },
      ],
    },
  });

  if (!patient) {
    console.error(`❌  No patient found for identifier: ${NATIONAL_ID}`);
    console.log("    Trying partial match on all patients...\n");

    // Fallback: show any patient whose any string field contains the ID
    const all = await prisma.patient.findMany({ take: 200 });
    const matches = all.filter(
      (p) =>
        JSON.stringify(p).includes(NATIONAL_ID)
    );
    if (matches.length === 0) {
      console.log("    No partial matches either. Record may not exist yet.");
    } else {
      console.log(`    Found ${matches.length} partial match(es):`);
      matches.forEach((p) => {
        console.log(`    → _id: ${p.id} | healthId: ${p.healthId} | name: ${p.fullName} | phone: ${p.phoneNumber}`);
      });
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("✅  Patient found:");
  console.log(`    _id      : ${patient.id}`);
  console.log(`    healthId : ${patient.healthId}`);
  console.log(`    name     : ${patient.fullName}`);
  console.log(`    phone    : ${patient.phoneNumber}`);
  console.log(`    gender   : ${patient.sex}`);
  console.log(`    hasPassword: ${!!patient.passwordHash}`);

  // Set the new password
  const newHash = hashPassword(newPassword);
  await prisma.patient.update({
    where: { id: patient.id },
    data: { passwordHash: newHash },
  });

  console.log(`\n✅  Password set successfully for: ${patient.fullName}`);
  console.log(`    They can now sign in at /signin with their Health ID or phone.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Script error:", e);
  prisma.$disconnect();
  process.exit(1);
});
