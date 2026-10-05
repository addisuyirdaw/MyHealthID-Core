const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

async function test() {
  try {
    console.log("1. Creating Test Hospital...");
    const org = await prisma.organization.create({
      data: {
        name: "Test Hospital Flow",
        nameLng: { en: "Test Hospital Flow" },
        code: "TESTHOSP1",
        registrationId: "REG-TEST-1",
        ownershipType: "PUBLIC",
        serviceType: "GENERAL_HOSPITAL",
        isActive: true,
        isVerified: false
      }
    });
    console.log("Created Organization:", org.id, org.code);

    console.log("\n2. Simulating User Registration using Code...");
    // Simulate what `registerHealthcareProfessional` does
    const searchOrg = await prisma.organization.findFirst({
      where: {
        OR: [
          { id: "TESTHOSP1" },
          { code: { equals: "TESTHOSP1", mode: 'insensitive' } }
        ]
      }
    });
    
    if (!searchOrg) {
      throw new Error("Organization not found by code!");
    }
    console.log("Found organization by code:", searchOrg.id);

    const roleCode = "AD";
    const licenseNumber = `01${roleCode}-${searchOrg.id}`;
    const email = `${licenseNumber.toLowerCase()}@myhealthid.gov.et`;
    
    const hash = await hashPassword("SecurePin123");
    
    const user = await prisma.user.create({
      data: {
        email: email,
        emailOrUsername: licenseNumber.toLowerCase(),
        passwordHash: hash,
        firstName: "Test",
        lastName: "Admin",
        role: "HOSPITAL_ADMIN",
        organizationId: searchOrg.id,
        professionalLicenseNumber: licenseNumber,
        isFirstLogin: false,
        isActive: true,
      }
    });
    console.log("Created User:", user.email);

    console.log("\n3. Simulating Login...");
    // Simulate loginUser
    const loginIdentifier = user.email; // or emailOrUsername
    const loginUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { emailOrUsername: loginIdentifier },
          { professionalLicenseNumber: { equals: loginIdentifier, mode: "insensitive" } }
        ]
      }
    });

    if (!loginUser) {
      throw new Error("Login failed: User not found");
    }

    const testHash = await hashPassword("SecurePin123");
    if (loginUser.passwordHash !== testHash) {
      throw new Error("Login failed: Invalid password");
    }
    
    console.log("Login Successful! User role:", loginUser.role, "Org:", loginUser.organizationId);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    console.log("Cleanup complete.");

  } catch (e) {
    console.error("Test failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
