import { config } from "dotenv";
import { resolve } from "node:path";

// Base env, then allow `.env.local` to override (Next.js convention).
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

import prisma from "../lib/prisma";

async function main() {
  console.log("Seeding screening questions...");

  // Get all organizations
  const orgs = await prisma.organization.findMany();
  if (orgs.length === 0) {
    console.log("No organizations found in database. Please run other seeds first.");
    return;
  }

  // Delete all existing screening questions/options to be idempotent
  await prisma.screeningOption.deleteMany({});
  await prisma.screeningQuestion.deleteMany({});

  for (const org of orgs) {
    console.log(`Seeding screening questions for organization: ${org.name} (${org.id})`);

    // Question 1: Who is the appointment for?
    const q1 = await prisma.screeningQuestion.create({
      data: {
        organizationId: org.id,
        order: 1,
        labelEn: "Who is the appointment for?",
        labelAm: "ቀጠሮው ለማን ነው?",
        isActive: true,
      },
    });

    await prisma.screeningOption.createMany({
      data: [
        {
          questionId: q1.id,
          order: 1,
          labelEn: "Myself (Adult 18+)",
          labelAm: "ለራሴ (አዋቂ 18+)",
          isEmergencyFlag: false,
        },
        {
          questionId: q1.id,
          order: 2,
          labelEn: "A child under 5",
          labelAm: "ከ5 ዓመት በታች ለሆነ ህጻን",
          isEmergencyFlag: false,
          autoSelectDepartment: "Pediatrics",
        },
        {
          questionId: q1.id,
          order: 3,
          labelEn: "A pregnant woman",
          labelAm: "ለነፍሰጡር ሴት",
          isEmergencyFlag: false,
          autoSelectDepartment: "Gynecology & Obstetrics",
        },
      ],
    });

    // Question 2: How would you describe your symptoms?
    const q2 = await prisma.screeningQuestion.create({
      data: {
        organizationId: org.id,
        order: 2,
        labelEn: "How would you describe your current symptoms?",
        labelAm: "የአሁኑን ምልክቶችዎን እንዴት ይገልጹታል?",
        isActive: true,
      },
    });

    await prisma.screeningOption.createMany({
      data: [
        {
          questionId: q2.id,
          order: 1,
          labelEn: "Mild – routine checkup",
          labelAm: "ቀላል - መደበኛ ምርመራ",
          isEmergencyFlag: false,
        },
        {
          questionId: q2.id,
          order: 2,
          labelEn: "Moderate – worsening over days",
          labelAm: "መካከለኛ - በቀናት ውስጥ እየባሰ የመጣ",
          isEmergencyFlag: false,
        },
        {
          questionId: q2.id,
          order: 3,
          labelEn: "Severe – sudden onset",
          labelAm: "ከባድ - ድንገት የጀመረ",
          isEmergencyFlag: true,
        },
        {
          questionId: q2.id,
          order: 4,
          labelEn: "Critical – chest pain / difficulty breathing",
          labelAm: "እጅግ ከባድ - የደረት ህመም / ለመተንፈስ መቸገር",
          isEmergencyFlag: true,
        },
      ],
    });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
