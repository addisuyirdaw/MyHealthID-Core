const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

async function main() {
  console.log("🌱 Seeding Demo Dataset for Jury Presentation...");

  // 1. Create Demo Hospitals (Idempotent)
  console.log("🏥 Setting up Hospital A (Tikur Anbessa)...");
  const hospitalA = await prisma.organization.upsert({
    where: { id: "demo-hosp-addis" },
    update: { name: "Tikur Anbessa Specialized Hospital" },
    create: {
      id: "demo-hosp-addis",
      name: "Tikur Anbessa Specialized Hospital",
      nameLng: { en: "Tikur Anbessa Specialized Hospital", am: "ጥቁር አንበሳ ስፔሻላይዝድ ሆስፒታል" },
      code: "DEMO-ADDIS-01",
      registrationId: "REG-DEMO-ADDIS-01",
      ownershipType: "PUBLIC",
      serviceType: "SPECIALIZED_HOSPITAL"
    }
  });

  console.log("🏥 Setting up Hospital B (Ayder Comprehensive)...");
  const hospitalB = await prisma.organization.upsert({
    where: { id: "demo-hosp-mekelle" },
    update: { name: "Ayder Comprehensive Specialized Hospital" },
    create: {
      id: "demo-hosp-mekelle",
      name: "Ayder Comprehensive Specialized Hospital",
      nameLng: { en: "Ayder Comprehensive Specialized Hospital", am: "ዓይደር ኮምፕሬሄንሲቭ ስፔሻላይዝድ ሆስፒታል" },
      code: "DEMO-MEKELLE-01",
      registrationId: "REG-DEMO-MEKELLE-01",
      ownershipType: "PUBLIC",
      serviceType: "SPECIALIZED_HOSPITAL"
    }
  });

  // 2. Create Demo Users (Doctors)
  console.log("👨‍⚕️ Setting up Doctor A (Tikur Anbessa)...");
  const doctorAEmail = "demo.addis@myhealthid.demo";
  const doctorAPassword = hashPassword("DemoAddis2026!");
  
  const doctorA = await prisma.user.upsert({
    where: { email: doctorAEmail },
    update: { 
      passwordHash: doctorAPassword,
      organizationId: hospitalA.id,
      hospitalId: hospitalA.id,
    },
    create: {
      email: doctorAEmail,
      emailOrUsername: doctorAEmail,
      passwordHash: doctorAPassword,
      role: "GENERAL_PRACTITIONER",
      firstName: "Dr. Addis",
      lastName: "Demo",
      fullName: "Dr. Addis Demo",
      professionalLicenseNumber: "DEMO-MD-ADDIS",
      hospitalId: hospitalA.id,
      hospitalName: hospitalA.name,
      organizationId: hospitalA.id,
      isActive: true,
      isApproved: true,
      isFirstLogin: false,
    }
  });

  console.log("👨‍⚕️ Setting up Doctor B (Ayder Comprehensive)...");
  const doctorBEmail = "demo.mekelle@myhealthid.demo";
  const doctorBPassword = hashPassword("DemoMekelle2026!");
  
  const doctorB = await prisma.user.upsert({
    where: { email: doctorBEmail },
    update: { 
      passwordHash: doctorBPassword,
      organizationId: hospitalB.id,
      hospitalId: hospitalB.id,
    },
    create: {
      email: doctorBEmail,
      emailOrUsername: doctorBEmail,
      passwordHash: doctorBPassword,
      role: "GENERAL_PRACTITIONER",
      firstName: "Dr. Mekelle",
      lastName: "Demo",
      fullName: "Dr. Mekelle Demo",
      professionalLicenseNumber: "DEMO-MD-MEKELLE",
      hospitalId: hospitalB.id,
      hospitalName: hospitalB.name,
      organizationId: hospitalB.id,
      isActive: true,
      isApproved: true,
      isFirstLogin: false,
    }
  });

  // 3. Create Demo Patient
  console.log("🧑‍⚕️ Setting up Demo Patient (Abebe Tesfaye)...");
  const patientHealthId = "MHI-DEMO-2026";
  const patientInternalId = "INT-DEMO-2026-A";
  
  const patient = await prisma.patient.upsert({
    where: { healthId: patientHealthId },
    update: {
      hospitalId: hospitalA.id,
    },
    create: {
      healthId: patientHealthId,
      internalId: patientInternalId,
      fullName: "Abebe Tesfaye",
      age: 31,
      sex: "Male",
      dateOfBirth: new Date("1995-04-18T00:00:00Z"),
      phoneNumber: "0911000000",
      hospitalId: hospitalA.id,
      chiefComplaint: "Frequent headaches and mild dizziness",
      isVerified: true,
    }
  });

  // 4. Create Historical Encounter for Hospital A
  console.log("📋 Setting up Historical Encounter for Hospital A...");
  const encounterId = "demo-encounter-addis";
  await prisma.clinicalExamination.upsert({
    where: { id: encounterId },
    update: {
      patientId: patient.id,
      organizationId: hospitalA.id,
      generalAppearance: "Patient looks well, in no acute distress.",
      neurological: "Cranial nerves intact, no focal deficits.",
    },
    create: {
      id: encounterId,
      patientId: patient.id,
      organizationId: hospitalA.id,
      generalAppearance: "Patient looks well, in no acute distress.",
      neurological: "Cranial nerves intact, no focal deficits.",
      chiefComplaints: { data: [{ complaint: "Headache", duration: "2 weeks" }] },
      hpi: "Patient reports intermittent headaches over the last two weeks, mostly in the evenings.",
    }
  });

  console.log("✅ Demo Setup Complete!");
  console.log(`
  Credentials for Demo:
  Hospital A (Tikur Anbessa):
    Email:    ${doctorAEmail}
    Password: DemoAddis2026!
  
  Hospital B (Ayder Comprehensive):
    Email:    ${doctorBEmail}
    Password: DemoMekelle2026!
    
  Patient:
    Name:     Abebe Tesfaye
    HealthID: ${patientHealthId}
  `);

}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
