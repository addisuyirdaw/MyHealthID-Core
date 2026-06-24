/**
 * Seed script: inserts 3 bilingual CarouselSlide records as fallback
 * placeholder slides for the public landing page hero carousel.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/seed-carousel.ts
 *
 * Safe to run multiple times — it checks for existing records first
 * and only inserts slides when the collection is empty.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FALLBACK_SLIDES = [
  {
    imageUrl: "/front.jpg",
    headingEn: "National Digital Health ID",
    headingAm: "ሀገራዊ ዲጂታል ጤና መታወቂያ",
    textEn:
      "Securing identity and enabling verified health records for every citizen across Ethiopia.",
    textAm:
      "ለእያንዳንዱ ዜጋ ማንነትን ጥበቃ ማድረግ እና ተረጋግጦ የጤና መዝገቦችን ማንቃት።",
    sortOrder: 0,
  },
  {
    imageUrl: "/back.jpg",
    headingEn: "Verified Health Profile",
    headingAm: "ተረጋግጦ የጤና መገለጫ",
    textEn:
      "Clinical-integrity and administrative verification for every patient, powered by Fayda integration.",
    textAm:
      "ለእያንዳንዱ ታካሚ ክሊኒካዊ ትክክለኛነት እና አስተዳደራዊ ማረጋገጫ፣ በፋይዳ ውህደት የተሰጠ።",
    sortOrder: 1,
  },
  {
    imageUrl: "/front.jpg",
    headingEn: "Connecting Ethiopia's Healthcare",
    headingAm: "የኢትዮጵያ ጤና አገልግሎት ማስተሳሰር",
    textEn:
      "A unified digital health network bridging public and private facilities for seamless care delivery.",
    textAm:
      "ለቀላል እንክብካቤ አሰጣጥ የህዝብ እና ግል ተቋማትን የሚያስተሳስር ወጥ ዲጂታል ጤና ኔትወርክ።",
    sortOrder: 2,
  },
];

async function main() {
  console.log("🌱 Seeding CarouselSlide collection…");

  const existingCount = await prisma.carouselSlide.count();
  if (existingCount > 0) {
    console.log(
      `⚠️  Collection already has ${existingCount} slide(s). Skipping seed to avoid duplicates.`
    );
    console.log(
      "   Delete existing slides via the admin panel or DB console first if you want a fresh seed."
    );
    return;
  }

  for (const slide of FALLBACK_SLIDES) {
    const created = await prisma.carouselSlide.create({ data: slide });
    console.log(`  ✅ Created slide [${created.sortOrder}]: "${created.headingEn}"`);
  }

  console.log(`\n✨ Seeded ${FALLBACK_SLIDES.length} carousel slides successfully.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
