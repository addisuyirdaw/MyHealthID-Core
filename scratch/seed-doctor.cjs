const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function main() {
  const hospital = await prisma.organization.findFirst();
  if (!hospital) {
    console.log("No organization found to attach doctor to!");
    return;
  }
  
  const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
  const hashedPassword = crypto
    .createHmac("sha256", salt)
    .update("password123")
    .digest("hex");
  
  await prisma.user.deleteMany({
    where: {
      OR: [
        { emailOrUsername: 'doctor_test' },
        { emailOrUsername: 'doctortest' },
        { professionalLicenseNumber: 'DOC-12345' }
      ]
    }
  });

  const doctor = await prisma.user.create({
    data: {
      email: 'doctortest@myhealthid.gov.et',
      emailOrUsername: 'doctortest',
      passwordHash: hashedPassword,
      firstName: 'Test',
      lastName: 'Doctor',
      role: 'GENERAL_PRACTITIONER',
      isFirstLogin: false,
      isActive: true,
      organizationId: hospital.id,
      professionalLicenseNumber: 'DOC-12345',
      specialization: 'Internal Medicine',
      hospitalName: hospital.name,
      nationalId: 'DOC-12345-NID'
    }
  });
  console.log("Doctor created/found:", doctor.emailOrUsername, "| Password: password123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
