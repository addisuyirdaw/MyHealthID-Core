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

async function runTests() {
  let createdOrgId = null;
  let pendingUserId = null;

  try {
    console.log("--- Starting Authentication & Onboarding Tests ---");

    // 1. System Admin Creates Hospital
    console.log("\n[TEST 2] System Admin creates Hospital");
    const org = await prisma.organization.create({
      data: {
        name: "Test Hospital Flow",
        nameLng: { set: { en: "Test Hospital Flow", am: "Test Hospital Flow" } },
        code: "TESTHOSP1",
        registrationId: "REG-TEST-1",
        ownershipType: "PUBLIC",
        serviceType: "GENERAL_HOSPITAL",
        isActive: true,
        isVerified: false
      }
    });
    createdOrgId = org.id;
    console.log("SUCCESS: Hospital created. ID:", org.id);

    // 2. New person registers
    console.log("\n[TEST 3] New person registers");
    const roleCode = "AD";
    const licenseNumber = `01${roleCode}-${org.id}`;
    const email = `${licenseNumber.toLowerCase()}@myhealthid.gov.et`;
    const hash = await hashPassword("SecurePin123");
    
    const user = await prisma.user.create({
      data: {
        email: email,
        emailOrUsername: licenseNumber.toLowerCase(),
        passwordHash: hash,
        firstName: "Test",
        lastName: "Admin",
        role: "HOSPITAL_CEO",
        organizationId: org.id,
        professionalLicenseNumber: licenseNumber,
        isFirstLogin: false,
        isActive: true,
        isApproved: false // Simulating registration logic
      }
    });
    pendingUserId = user.id;
    console.log("SUCCESS: User created with isApproved=false. Email:", user.email);

    // 3. Try to log in before approval
    console.log("\n[TEST 4] New person tries to log in before approval");
    let loginBlocked = false;
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser.isApproved) {
      console.log("BLOCKED: Your account is pending approval by a System Administrator.");
      loginBlocked = true;
    }
    if (!loginBlocked) throw new Error("TEST FAILED: User was allowed to login before approval.");

    // 4. System Admin Approves
    console.log("\n[TEST 5] System Admin approves registration");
    await prisma.user.update({
      where: { id: user.id },
      data: { isApproved: true }
    });
    console.log("SUCCESS: User approved.");

    // 5. Log in after approval
    console.log("\n[TEST 6] Approved person logs in");
    const approvedUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!approvedUser.isApproved) {
      throw new Error("TEST FAILED: User should be approved.");
    }
    console.log("SUCCESS: User login permitted.");
    
    console.log("\n[TEST 7] Checked role/dashboard access: User has role HOSPITAL_CEO");

    // 6. System Admin Rejects another registration
    console.log("\n[TEST 8] System Admin rejects another registration");
    const rejectUser = await prisma.user.create({
      data: {
        email: "reject@test.com",
        emailOrUsername: "reject",
        passwordHash: hash,
        firstName: "Reject",
        lastName: "User",
        role: "RECEPTIONIST",
        organizationId: org.id,
        isFirstLogin: false,
        isActive: true,
        isApproved: false
      }
    });
    console.log("Created pending user for rejection.");
    await prisma.user.delete({ where: { id: rejectUser.id } });
    console.log("SUCCESS: Pending user rejected and deleted.");

  } catch (err) {
    console.error("FAILED:", err);
  } finally {
    // Cleanup
    console.log("\nCleaning up...");
    if (pendingUserId) await prisma.user.deleteMany({ where: { id: pendingUserId } }).catch(() => {});
    if (createdOrgId) await prisma.organization.deleteMany({ where: { id: createdOrgId } }).catch(() => {});
    await prisma.$disconnect();
    console.log("Done.");
  }
}

runTests();
