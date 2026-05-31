"use server";

import crypto from "crypto";
import prisma from "@/lib/prisma";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function ensureDefaultOrganization(): Promise<string> {
  const orgName = "Debre Berhan Referral Hospital";
  let org = await prisma.organization.findFirst({
    where: { name: orgName }
  });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: orgName }
    });
    console.log(`[TENANCY] Auto-created default organization: ${orgName}`);
  }
  return org.id;
}

export async function registerOrganization(data: {
  officialName: string;
  facilityType: string;
  kilil: string;
  zone: string;
  woreda: string;
  kebele: string;
}) {
  try {
    // Memorable dynamic Organization ID generation logic
    const reg = data.kilil.replace(/\s+/g, "").substring(0, 3).toUpperCase();
    const wor = data.woreda.replace(/\s+/g, "").substring(0, 3).toUpperCase();
    
    const fillers = ["hospital", "clinic", "health", "center", "and", "the"];
    const tokens = data.officialName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(token => token && !fillers.includes(token));
    
    const coreWord = tokens.length > 0 ? tokens[0].toUpperCase() : "FACILITY";
    const hex = Math.floor(4096 + Math.random() * 61439).toString(16).toUpperCase(); // 4-char hex

    const orgId = `MH-${reg}-${wor}-${coreWord}-${hex}`;
    const serializedName = `${data.officialName} (${data.facilityType})`;
    
    const org = await prisma.organization.create({
      data: {
        id: orgId,
        name: `${serializedName} - ${data.kilil}, ${data.zone}, ${data.woreda}, ${data.kebele}`
      }
    });

    return {
      success: true,
      organizationId: org.id,
      name: org.name,
    };
  } catch (error: any) {
    console.error("❌ Organization registration error:", error);
    return {
      success: false,
      error: error.message || "Failed to register organization."
    };
  }
}

function normalizeLoginIdentifier(value: string) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("@")) {
    return raw;
  }
  return raw.replace(/[^a-z0-9]/g, "");
}

function hashPassword(password: string) {
  return crypto
    .createHmac("sha256", process.env.PASSWORD_SALT || "myhealthid-secret")
    .update(password)
    .digest("hex");
}

export async function onboardHealthcareProfessional(data: {
  fullName: string;
  licenseNumber: string;
  role: "DOCTOR" | "NURSE" | "PHARMACIST" | "RECEPTIONIST" | "ADMIN" | "LAB_TECH";
  pin: string;
}) {
  try {
    const cookieStore = cookies();
    const activeOrgId = cookieStore.get("organizationId")?.value;
    if (!activeOrgId) {
      throw new Error("Unauthorized: No active facility context found for administrator.");
    }

    const email = `${data.licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}@myhealthid.gov.et`;
    const emailOrUsername = normalizeLoginIdentifier(data.licenseNumber);
    const hospitalName = (await prisma.organization.findUnique({ where: { id: activeOrgId }, select: { name: true } }))?.name || null;

    const [firstName = "", ...lastNameParts] = data.fullName.trim().split(" ");
    const lastName = lastNameParts.join(" ");

    // Check if professional is already registered
    let existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error("A professional with this license number is already registered.");
    }

    const nationalId = `onb-nid-${data.licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Math.random().toString(36).substring(2, 6)}`;

    const newUser = await prisma.user.create({
      data: {
        email,
        emailOrUsername,
        passwordHash: hashPassword(data.pin),
        role: data.role as any,
        firstName,
        lastName,
        professionalLicenseNumber: data.licenseNumber,
        hospitalId: activeOrgId,
        hospitalName,
        organizationId: activeOrgId,
        nationalId,
      }
    });

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: `${newUser.firstName} ${newUser.lastName}`,
        role: newUser.role,
        organizationId: newUser.organizationId
      }
    };
  } catch (error: any) {
    console.error("❌ Onboarding professional error:", error);
    return {
      success: false,
      error: error.message || "Failed to onboard professional."
    };
  }
}

export async function registerHealthcareProfessional(data: {
  fullName: string;
  licenseNumber: string;
  role: "DOCTOR" | "NURSE" | "PHARMACIST" | "RECEPTIONIST" | "ADMIN" | "LAB_TECH";
  pin: string;
  organizationId: string;
}) {
  try {
    const orgId = data.organizationId.trim();
    if (!orgId) {
      throw new Error("Hospital / Facility ID Token is required.");
    }

    // Verify Organization exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId }
    });
    if (!org) {
      throw new Error("Invalid Hospital/Facility ID Token. Organization not found.");
    }

    const email = `${data.licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}@myhealthid.gov.et`;
    const emailOrUsername = normalizeLoginIdentifier(data.licenseNumber);
    const hospitalName = org.name;

    const [firstName = "", ...lastNameParts] = data.fullName.trim().split(" ");
    const lastName = lastNameParts.join(" ");

    // Check if professional is already registered
    let existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error("A professional with this license number is already registered.");
    }

    const nationalId = `self-nid-${data.licenseNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Math.random().toString(36).substring(2, 6)}`;

    const newUser = await prisma.user.create({
      data: {
        email,
        emailOrUsername,
        passwordHash: hashPassword(data.pin),
        role: data.role as any,
        firstName,
        lastName,
        professionalLicenseNumber: data.licenseNumber,
        hospitalId: org.id,
        hospitalName,
        organizationId: org.id,
        nationalId,
      }
    });

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: `${newUser.firstName} ${newUser.lastName}`,
        role: newUser.role,
        organizationId: newUser.organizationId
      }
    };
  } catch (error: any) {
    console.error("❌ Self-registration professional error:", error);
    return {
      success: false,
      error: error.message || "Failed to self-register."
    };
  }
}

export async function loginUser(formData: FormData) {
  const emailOrUsername = formData.get("emailOrUsername") as string;
  const password = formData.get("password") as string;
  const hospitalIdCode = formData.get("hospitalIdCode") as string;

  if (!emailOrUsername) {
    throw new Error("Email/Username is required for login.");
  }

  const cleanIdentifier = normalizeLoginIdentifier(emailOrUsername);
  let dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanIdentifier },
        { emailOrUsername: cleanIdentifier }
      ]
    }
  });

  let finalOrgId: string;
  const cleanEmail = cleanIdentifier;

  if (cleanEmail === "dr.dawit@myhealthid.gov.et") {
    const orgId = await ensureDefaultOrganization();
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: cleanEmail,
          emailOrUsername: cleanEmail,
          passwordHash: hashPassword("demo-password-hash"),
          role: "DOCTOR",
          firstName: "Dawit",
          lastName: "Tadesse",
          professionalLicenseNumber: "MD-2026-ETH",
          hospitalId: orgId,
          hospitalName: "Debre Berhan Referral Hospital",
          organizationId: orgId,
          nationalId: `demo-nid-${Math.random().toString(36).substring(2, 9)}`,
        }
      });
      console.log("[PITCH HOOK] Auto-created Dr. Dawit record in MongoDB Atlas.");
    }
    finalOrgId = orgId;
  } else {
    if (!hospitalIdCode) {
      throw new Error("Hospital/Facility ID Code is required.");
    }

    // Verify Organization exists
    const org = await prisma.organization.findUnique({
      where: { id: hospitalIdCode }
    });
    if (!org) {
      throw new Error("Invalid Hospital/Facility ID Code. Organization not found.");
    }

    if (!dbUser) {
      // First login for a new facility → create as ADMIN so they can manage the hospital
      const formRole = (formData.get("role") as string) || "ADMIN";
      const [firstName, ...lastNameParts] = cleanIdentifier.split("@")[0].split(".");
      dbUser = await prisma.user.create({
        data: {
          email: cleanIdentifier.includes("@") ? cleanIdentifier : `${cleanIdentifier}@myhealthid.gov.et`,
          emailOrUsername: cleanIdentifier,
          passwordHash: hashPassword(password || "password"),
          role: formRole as any,
          firstName: firstName || "Facility",
          lastName: lastNameParts.join(" ") || "Administrator",
          hospitalId: org.id,
          hospitalName: org.name,
          organizationId: org.id,
          nationalId: `sim-nid-${Math.random().toString(36).substring(2, 9)}`,
        }
      });
      console.log(`[TENANCY] Auto-created facility admin: ${cleanIdentifier} for org ${org.id}`);
    }

    if (dbUser.organizationId !== org.id) {
      throw new Error("This account is not registered under this facility. Check your Organization ID.");
    }

    if (password && dbUser.passwordHash !== hashPassword(password)) {
      throw new Error("Invalid Security PIN/Password.");
    }

    finalOrgId = org.id;
  }

  const role = dbUser!.role;

  cookies().set("userRole", role, {
    httpOnly: false, 
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });

  cookies().set("organizationId", finalOrgId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });

  const roleStr = role as string;
  if (roleStr === "ADMIN") redirect("/admin/dashboard");
  if (roleStr === "DOCTOR") redirect("/doctor/dashboard");
  if (roleStr === "NURSE") redirect("/queue");
  if (roleStr === "RECEPTIONIST") redirect("/register");
  if (roleStr === "LAB_TECH") redirect("/lab");
  if (roleStr === "PHARMACIST") redirect("/pharmacy");
  // Fallback
  redirect("/admin/dashboard");
}

export async function logoutUser() {
  cookies().delete("userRole");
  cookies().delete("organizationId");
  redirect("/");
}

