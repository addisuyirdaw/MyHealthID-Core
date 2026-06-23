import { PrismaClient } from '@prisma/client';
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || "myhealthid-dev-salt-only";
  return crypto
    .createHmac("sha256", salt)
    .update(password)
    .digest("hex");
}

async function main() {
  try {
    const orgId = "MH-AMH-WER-DEBRE-6B82";
    
    // Ensure the organization exists
    let org = await prisma.organization.findUnique({
      where: { id: orgId }
    });
    
    if (!org) {
      org = await prisma.organization.create({
        data: {
          id: orgId,
          name: "Debre Berhan Referral Hospital (ADMIN)",
          nameLng: { en: "Debre Berhan Referral Hospital", am: "ደብረ ብርሃን ሪፈራል ሆስፒታል" },
          code: orgId,
          registrationId: orgId,
          ownershipType: "PUBLIC",
          serviceType: "REFERRAL_HOSPITAL"
        }
      });
      console.log("Created Organization:", org.name);
    } else {
      console.log("Organization already exists:", org.name);
    }

    const email = "admin@my.edu.et";
    const passwordHash = hashPassword("123456");

    let admin = await prisma.user.findFirst({
      where: { email }
    });

    if (admin) {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: {
          passwordHash,
          role: "HOSPITAL_CEO",
          organizationId: orgId,
          isActive: true
        }
      });
      console.log("Updated admin password and role for:", admin.email);
    } else {
      admin = await prisma.user.create({
        data: {
          email,
          emailOrUsername: "admin",
          passwordHash,
          role: "HOSPITAL_CEO",
          firstName: "Admin",
          lastName: "User",
          professionalLicenseNumber: "ADMIN-001",
          organizationId: orgId,
          hospitalId: orgId,
          hospitalName: org.name,
          nationalId: "admin-nid-001",
          isActive: true
        }
      });
      console.log("Created new admin user:", admin.email);
    }

    console.log("\n=== ADMIN CREDENTIALS ===");
    console.log("Hospital/Facility ID :", orgId);
    console.log("Email or License     :", email);
    console.log("PIN/Password         :", "123456");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
