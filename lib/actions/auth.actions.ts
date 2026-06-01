"use server";

import crypto from "crypto";
import prisma from "@/lib/prisma";
import {
  normalizeFacilityServiceType,
  normalizeHealthcareRole,
  ADMIN_ROLES,
  CLINICAL_ROLES,
  TRIAGE_ROLES,
  LAB_ROLES,
  PHARMACY_ROLES,
  REGISTRATION_ROLES,
} from "@/lib/locales/enums";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function ensureDefaultOrganization(): Promise<string> {
  const orgName = "Debre Berhan Referral Hospital";
  let org = await prisma.organization.findFirst({
    where: { name: orgName }
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: orgName,
        nameLng: { en: orgName, am: orgName },
        code: "DBRH",
        registrationId: `REG-${Date.now()}`,
        ownershipType: "PUBLIC",
        serviceType: "REFERRAL_HOSPITAL",
      },
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
    const normalizedFacilityType = normalizeFacilityServiceType(data.facilityType);
    const serializedName = `${data.officialName} (${normalizedFacilityType})`;
    
    const org = await prisma.organization.create({
      data: {
        id: orgId,
        name: `${serializedName} - ${data.kilil}, ${data.zone}, ${data.woreda}, ${data.kebele}`,
        nameLng: { en: data.officialName, am: data.officialName },
        code: orgId,
        registrationId: orgId,
        ownershipType: "PUBLIC",
        serviceType: normalizedFacilityType as any,
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

    const normalizedRole = normalizeHealthcareRole(data.role);
    const newUser = await prisma.user.create({
      data: {
        email,
        emailOrUsername,
        passwordHash: hashPassword(data.pin),
        role: normalizedRole as any,
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

    const normalizedRole = normalizeHealthcareRole(data.role);
    const newUser = await prisma.user.create({
      data: {
        email,
        emailOrUsername,
        passwordHash: hashPassword(data.pin),
        role: normalizedRole as any,
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

export async function loginUser(formData: FormData | any) {
  // Support both FormData object and raw dictionary payload
  let emailOrUsername: any = null;
  let emailOrLicense: any = null;
  let username: any = null;
  let extractedPassword: any = null;
  let extractedHospitalIdCode: any = null;
  let extractedRole: any = null;
  let data: any = {};

  if (formData instanceof FormData) {
    emailOrUsername = formData.get("emailOrUsername");
    emailOrLicense = formData.get("emailOrLicense");
    username = formData.get("username");
    extractedPassword = formData.get("password");
    extractedHospitalIdCode = formData.get("hospitalIdCode");
    extractedRole = formData.get("role");
  } else if (formData && typeof formData === "object") {
    data = formData;
    emailOrUsername = formData.emailOrUsername;
    emailOrLicense = formData.emailOrLicense;
    username = formData.username;
    extractedPassword = formData.password;
    extractedHospitalIdCode = formData.hospitalIdCode;
    extractedRole = formData.role;
  }

  const finalIdentifier = emailOrUsername || emailOrLicense || data.username;

  if (!finalIdentifier || typeof finalIdentifier !== 'string') {
    return { error: "Please enter your valid email or license username." };
  }

  const passwordVal = extractedPassword ? String(extractedPassword).trim() : "";
  const hospitalIdCodeVal = extractedHospitalIdCode ? String(extractedHospitalIdCode).trim() : "";

  const cleanIdentifier = normalizeLoginIdentifier(finalIdentifier);

  // Secondary guard: normalisation must not produce an empty result
  if (!cleanIdentifier || typeof cleanIdentifier !== 'string') {
    return { error: "Please enter your valid email or license username." };
  }

  const password = passwordVal;
  const hospitalIdCode = hospitalIdCodeVal;

  let dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanIdentifier },
        { emailOrUsername: cleanIdentifier },
      ],
    },
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
          role: "GENERAL_PRACTITIONER",
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
      const rawRole = (formData instanceof FormData) ? formData.get("role") : extractedRole;
      const formRole = normalizeHealthcareRole(String(rawRole ?? "HOSPITAL_CEO") || "HOSPITAL_CEO");
      const [firstName, ...lastNameParts] = cleanIdentifier.split("@")[0].split(".");
      dbUser = await prisma.user.create({
        data: {
          email: cleanIdentifier.includes("@") ? cleanIdentifier : `${cleanIdentifier}@myhealthid.gov.et`,
          emailOrUsername: cleanIdentifier,
          passwordHash: hashPassword(password || "password"),
          role: formRole as any,
          firstName: firstName || "Facility",
          lastName: lastNameParts.join(" ") || "Executive",
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

    // If passwordHash is null (legacy document), skip password check and let the
    // auto-update path below set a real hash on next login
    if (dbUser.passwordHash && password && dbUser.passwordHash !== hashPassword(password)) {
      throw new Error("Invalid Security PIN/Password.");
    }
    // Backfill missing passwordHash for legacy documents
    if (!dbUser.passwordHash && password) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { passwordHash: hashPassword(password) },
      });
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

  cookies().set("userId", dbUser!.id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });

  cookies().set("userName", `${dbUser!.firstName} ${dbUser!.lastName}`, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });

  const roleStr = normalizeHealthcareRole(role as string);
  if (ADMIN_ROLES.includes(roleStr as any)) redirect("/admin/dashboard");
  if (CLINICAL_ROLES.includes(roleStr as any)) redirect("/doctor/dashboard");
  if (TRIAGE_ROLES.includes(roleStr as any)) redirect("/triage");
  if (LAB_ROLES.includes(roleStr as any)) redirect("/lab");
  if (PHARMACY_ROLES.includes(roleStr as any)) redirect("/pharmacy");
  if (REGISTRATION_ROLES.includes(roleStr as any)) redirect("/register");
  // Fallback
  redirect("/login");
}

export async function logoutUser() {
  cookies().delete("userRole");
  cookies().delete("organizationId");
  cookies().delete("userId");
  cookies().delete("userName");
  redirect("/");
}

