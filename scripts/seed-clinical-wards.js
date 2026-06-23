import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
  return crypto
    .createHmac("sha256", salt)
    .update(password)
    .digest("hex");
}

async function main() {
  const wards = [
    { name: "General Medicine", code: "GEN_MED" },
    { name: "Pediatrics", code: "PED" },
    { name: "Cardiology", code: "CARD" },
  ];

  console.log("Seeding clinical wards...");
  const wardMap = {};
  for (const w of wards) {
    const upserted = await prisma.clinicalWard.upsert({
      where: { code: w.code },
      update: { name: w.name },
      create: { name: w.name, code: w.code },
    });
    console.log(`Upserted ward: ${upserted.name} (${upserted.code})`);
    wardMap[w.code] = upserted;
  }

  const passwordHash = hashPassword("123456");

  const doctors = [
    {
      email: "dr.dawit@myhealthid.gov.et",
      emailOrUsername: "dr.dawit@myhealthid.gov.et",
      firstName: "Dawit",
      lastName: "Tadesse",
      fullName: "Dr. Dawit Tadesse",
      role: "GENERAL_PRACTITIONER",
      professionalLicenseNumber: "MD-2026-ETH",
      nationalId: "NID-DR-DAWIT",
      isActive: true,
      assignedWardId: wardMap["GEN_MED"].id,
    },
    {
      email: "dr.hanna@myhealthid.gov.et",
      emailOrUsername: "dr.hanna@myhealthid.gov.et",
      firstName: "Hanna",
      lastName: "Belay",
      fullName: "Dr. Hanna Belay",
      role: "MEDICAL_SPECIALIST",
      professionalLicenseNumber: "MD-2026-ETH-2",
      nationalId: "NID-DR-HANNA",
      isActive: true,
      assignedWardId: wardMap["PED"].id,
    },
    {
      email: "dr.kebede@myhealthid.gov.et",
      emailOrUsername: "dr.kebede@myhealthid.gov.et",
      firstName: "Kebede",
      lastName: "Alemu",
      fullName: "Dr. Kebede Alemu",
      role: "SUB_SPECIALIST",
      professionalLicenseNumber: "MD-2026-ETH-3",
      nationalId: "NID-DR-KEBEDE",
      isActive: true,
      assignedWardId: wardMap["CARD"].id,
    }
  ];

  console.log("Seeding doctor users...");
  for (const doc of doctors) {
    const upsertedDoc = await prisma.user.upsert({
      where: { email: doc.email },
      update: {
        emailOrUsername: doc.emailOrUsername,
        firstName: doc.firstName,
        lastName: doc.lastName,
        fullName: doc.fullName,
        role: doc.role,
        professionalLicenseNumber: doc.professionalLicenseNumber,
        nationalId: doc.nationalId,
        isActive: doc.isActive,
        passwordHash,
        assignedWardId: doc.assignedWardId,
      },
      create: {
        email: doc.email,
        emailOrUsername: doc.emailOrUsername,
        firstName: doc.firstName,
        lastName: doc.lastName,
        fullName: doc.fullName,
        role: doc.role,
        professionalLicenseNumber: doc.professionalLicenseNumber,
        nationalId: doc.nationalId,
        isActive: doc.isActive,
        passwordHash,
        assignedWardId: doc.assignedWardId,
      }
    });
    console.log(`Upserted doctor: ${upsertedDoc.email} assigned to ward: ${upsertedDoc.assignedWardId}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
