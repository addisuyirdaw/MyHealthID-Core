import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generateCode(name) {
  const prefix = name
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase() || "ORG";
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MH-AMH-${prefix}-${rand}`;
}

function generateRegId() {
  return `REG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function main() {
  console.log("🔍 Fetching all organizations...");
  const orgs = await prisma.organization.findMany();
  console.log(`Found ${orgs.length} organizations in database.`);

  let patchedCount = 0;

  for (const org of orgs) {
    const updates = {};
    
    // Check if code is missing/null/empty
    if (!org.code) {
      updates.code = generateCode(org.name);
    }
    
    // Check if registrationId is missing/null/empty
    if (!org.registrationId) {
      updates.registrationId = generateRegId();
    }
    
    // Check if nameLng is missing/null
    if (!org.nameLng || !org.nameLng.en || !org.nameLng.am) {
      updates.nameLng = {
        en: org.name || "Unknown Facility",
        am: org.name || "ያልታወቀ ተቋም"
      };
    }

    // Check if ownershipType is missing/null
    if (!org.ownershipType) {
      updates.ownershipType = "PUBLIC";
    }

    // Check if serviceType is missing/null
    if (!org.serviceType) {
      updates.serviceType = "GENERAL_HOSPITAL";
    }

    // Check if dates are missing/null
    const now = new Date();
    if (!org.registeredAt) {
      updates.registeredAt = now;
    }
    if (!org.createdAt) {
      updates.createdAt = now;
    }
    if (!org.updatedAt) {
      updates.updatedAt = now;
    }

    if (Object.keys(updates).length > 0) {
      console.log(`⚡ Updating organization ID ${org.id} (${org.name}):`, updates);
      await prisma.organization.update({
        where: { id: org.id },
        data: updates
      });
      patchedCount++;
    }
  }

  console.log(`\n🎉 Organization backfill complete! Patched ${patchedCount} organization records.`);
}

main()
  .catch((e) => {
    console.error("❌ Organization backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
