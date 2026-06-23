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

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";

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

    // ─── Auto-create the default facility ADMIN account ────────────────────────
    // Generate a stable, memorable default license number for the admin account
    const adminLicenseNumber = `admin-${orgId.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const adminEmail = `${adminLicenseNumber.replace(/[^a-z0-9]/g, "")}@myhealthid.gov.et`;
    // IMPORTANT: normalizeLoginIdentifier strips hyphens during login, so we must
    // store the hyphen-stripped version so the DB lookup finds this account.
    const adminEmailOrUsername = adminLicenseNumber.replace(/[^a-z0-9]/g, "");

    // Generate a readable 8-character one-time activation code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let activationCode = "";
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      activationCode += chars[bytes[i] % chars.length];
    }

    // Synthetic national ID for the auto-admin
    const nationalId = `fadmin-${orgId.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Math.random().toString(36).substring(2, 6)}`;

    const adminRole = normalizeHealthcareRole("ADMIN");
    await prisma.user.create({
      data: {
        email: adminEmail,
        emailOrUsername: adminEmailOrUsername,
        role: adminRole as any,
        firstName: "Facility",
        lastName: "Administrator",
        professionalLicenseNumber: adminLicenseNumber,
        hospitalId: orgId,
        hospitalName: org.name,
        organizationId: orgId,
        nationalId,
        isFirstLogin: true,
        activationCode,
      }
    });
    // ───────────────────────────────────────────────────────────────────────────

    return {
      success: true,
      organizationId: org.id,
      name: org.name,
      // Return admin credentials so the UI can display them to the registrant
      adminLicenseNumber,
      adminActivationCode: activationCode,
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

export async function hashPassword(password: string) {
  const salt = process.env.PASSWORD_SALT;
  if (!salt && process.env.NODE_ENV === "production") {
    // FIX 4: Hard-fail in production if the salt is not configured.
    // Set PASSWORD_SALT in your Vercel Environment Variables.
    throw new Error(
      "[Security] PASSWORD_SALT environment variable is not set. " +
      "Refusing to hash passwords with the insecure fallback in production."
    );
  }
  return crypto
    .createHmac("sha256", salt || "myhealthid-dev-salt-only")
    .update(password)
    .digest("hex");
}

export async function onboardHealthcareProfessional(data: {
  fullName: string;
  licenseNumber: string;
  role: "DOCTOR" | "NURSE" | "PHARMACIST" | "RECEPTIONIST" | "ADMIN" | "LAB_TECH";
  pin?: string;
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

    // Generate a readable, random 6-character alphanumeric key
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let activationCode = "";
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      activationCode += chars[bytes[i] % chars.length];
    }

    const normalizedRole = normalizeHealthcareRole(data.role);
    const newUser = await prisma.user.create({
      data: {
        email,
        emailOrUsername,
        role: normalizedRole as any,
        firstName,
        lastName,
        professionalLicenseNumber: data.licenseNumber,
        hospitalId: activeOrgId,
        hospitalName,
        organizationId: activeOrgId,
        nationalId,
        isFirstLogin: true,
        activationCode,
      }
    });

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: `${newUser.firstName} ${newUser.lastName}`,
        role: newUser.role,
        organizationId: newUser.organizationId,
        activationCode: newUser.activationCode
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
        passwordHash: await hashPassword(data.pin),
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

  if (!hospitalIdCode) {
    throw new Error("Hospital/Facility ID Code is required.");
  }

  // Verify Organisation exists
  const org = await prisma.organization.findUnique({
    where: { id: hospitalIdCode }
  });
  if (!org) {
    throw new Error("Invalid Hospital/Facility ID Code. Organisation not found.");
  }

  // Unknown identifier → reject. New staff must be registered by a facility
  // admin via /register-staff or the admin onboarding flow.
  if (!dbUser) {
    throw new Error("Account not found. Please contact your facility administrator to register your account.");
  }

  if (dbUser.organizationId !== org.id) {
    throw new Error("This account is not registered under this facility. Check your Organisation ID.");
  }

  // Deactivation guard – admin can suspend accounts via /admin/users
  if (!dbUser.isActive) {
    throw new Error("This account has been suspended by your facility administrator. Please contact your system administrator.");
  }

  // Password check – check activationCode if first login, otherwise standard check
  if (dbUser.isFirstLogin) {
    if (!dbUser.activationCode || !password || dbUser.activationCode.toUpperCase() !== password.toUpperCase()) {
      throw new Error("Invalid initial activation code.");
    }
  } else {
    if (dbUser.passwordHash && password && dbUser.passwordHash !== await hashPassword(password)) {
      throw new Error("Invalid Security PIN/Password.");
    }
    // Backfill missing passwordHash for legacy documents on next successful login
    if (!dbUser.passwordHash && password) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { passwordHash: await hashPassword(password) },
      });
    }
  }

  finalOrgId = org.id;

  const role = dbUser!.role;

  // FIX 1: All session cookies are now httpOnly: true.
  // This prevents JavaScript (and any XSS attack) from reading them via document.cookie.
  // The middleware and server actions read these server-side, so this is safe.
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  };

  cookies().set("userRole", role, cookieOptions);
  cookies().set("organizationId", finalOrgId, cookieOptions);
  cookies().set("userId", dbUser!.id, cookieOptions);
  cookies().set("userName", `${dbUser!.firstName} ${dbUser!.lastName}`, cookieOptions);

  if (dbUser.isFirstLogin) {
    cookies().set("isFirstLogin", "true", cookieOptions);
    redirect("/initialize-password");
  }

  // isTempPassword guard — admin-mediated password reset requires immediate change
  if (dbUser.isTempPassword) {
    cookies().set("isTempPassword", "true", cookieOptions);
    redirect("/change-password");
  }

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
  cookies().delete("isFirstLogin");
  cookies().delete("isTempPassword");
  redirect("/");
}

export async function finalizeAccountPassword(newPassword: string) {
  try {
    const cookieStore = cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) {
      throw new Error("Unauthorized: No active session found.");
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error("User not found.");
    }

    if (!user.isFirstLogin) {
      throw new Error("Account has already been initialized.");
    }

    const hashed = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashed,
        isFirstLogin: false,
        activationCode: null,
      }
    });

    // Clear first login cookie
    cookieStore.delete("isFirstLogin");

    // Redirect to matching role dashboard view
    const roleStr = normalizeHealthcareRole(user.role as string);
    let destination = "/login";
    if (ADMIN_ROLES.includes(roleStr as any)) destination = "/admin/dashboard";
    else if (CLINICAL_ROLES.includes(roleStr as any)) destination = "/doctor/dashboard";
    else if (TRIAGE_ROLES.includes(roleStr as any)) destination = "/triage";
    else if (LAB_ROLES.includes(roleStr as any)) destination = "/lab";
    else if (PHARMACY_ROLES.includes(roleStr as any)) destination = "/pharmacy";
    else if (REGISTRATION_ROLES.includes(roleStr as any)) destination = "/register";

    redirect(destination);
  } catch (error: any) {
    if (error.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("❌ Finalize password error:", error);
    return {
      success: false,
      error: error.message || "Failed to initialize password."
    };
  }
}

