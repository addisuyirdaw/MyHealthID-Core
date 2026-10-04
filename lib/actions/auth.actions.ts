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
import { signToken } from "@/lib/session";



export async function bootstrapSystemAdmin(data: { email: string; passwordRaw: string }) {
  // Security check: only allow if exactly 0 system admins exist.
  const existingCount = await prisma.user.count({
    where: { role: "SYSTEM_ADMINISTRATOR" }
  });

  if (existingCount > 0) {
    return { success: false, error: "A System Administrator already exists. Bootstrapping is permanently disabled." };
  }

  if (!data.email || !data.email.includes("@")) {
    return { success: false, error: "A valid email is required." };
  }
  if (!data.passwordRaw || data.passwordRaw.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  try {
    const hash = await hashPassword(data.passwordRaw);
    
    // Generate secure synthetic IDs
    const hexSegment = crypto.randomBytes(4).toString("hex").toUpperCase();
    
    const admin = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        emailOrUsername: data.email.toLowerCase(),
        passwordHash: hash,
        role: "SYSTEM_ADMINISTRATOR",
        firstName: "System",
        lastName: "Administrator",
        professionalLicenseNumber: `SYSADMIN-${hexSegment}`,
        nationalId: `SYSADMIN-${hexSegment}`,
        isFirstLogin: false,
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("❌ System Admin Bootstrap Error:", error);
    return { success: false, error: error.message || "Failed to bootstrap system administrator." };
  }
}

function normalizeLoginIdentifier(value: string) {
  return String(value || "").trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = process.env.PASSWORD_SALT;
  if (!salt && process.env.NODE_ENV === "production") {
    console.warn(
      "[Security Warning] PASSWORD_SALT environment variable is not set. " +
      "Using insecure fallback salt in production. Please configure PASSWORD_SALT in your environment."
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

    const ROLE_CODES: Record<string, string> = {
      "DOCTOR": "MD",
      "NURSE": "RN",
      "PHARMACIST": "PH",
      "LAB_TECH": "LT",
      "ADMIN": "AD",
      "RECEPTIONIST": "RC"
    };
    const roleCode = ROLE_CODES[data.role] || "XX";

    const count = await prisma.user.count({
      where: { organizationId: activeOrgId }
    });
    
    const genLicenseNumber = `${String(count + 1).padStart(2, '0')}${roleCode}-${activeOrgId}`;

    const email = `${genLicenseNumber.toLowerCase()}@myhealthid.gov.et`;
    const emailOrUsername = genLicenseNumber.toLowerCase();
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

    const nationalId = `onb-nid-${genLicenseNumber.toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`;

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
        professionalLicenseNumber: genLicenseNumber,
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

    const ROLE_CODES: Record<string, string> = {
      "DOCTOR": "MD",
      "NURSE": "RN",
      "PHARMACIST": "PH",
      "LAB_TECH": "LT",
      "ADMIN": "AD",
      "RECEPTIONIST": "RC"
    };
    const roleCode = ROLE_CODES[data.role] || "XX";

    const count = await prisma.user.count({
      where: { organizationId: org.id }
    });
    
    const genLicenseNumber = `${String(count + 1).padStart(2, '0')}${roleCode}-${org.id}`;

    const email = `${genLicenseNumber.toLowerCase()}@myhealthid.gov.et`;
    const emailOrUsername = genLicenseNumber.toLowerCase();
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

    const nationalId = `self-nid-${genLicenseNumber.toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`;

    const normalizedRole = normalizeHealthcareRole(data.role);
    const newUser = await prisma.user.create({
      data: {
        email,
        emailOrUsername,
        passwordHash: await hashPassword(data.pin),
        role: normalizedRole as any,
        firstName,
        lastName,
        professionalLicenseNumber: genLicenseNumber,
        hospitalId: org.id,
        hospitalName,
        organizationId: org.id,
        nationalId,
        isFirstLogin: false,
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
  const hospitalIdCodeVal = extractedHospitalIdCode ? String(extractedHospitalIdCode).trim().toUpperCase() : "";

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
        { professionalLicenseNumber: { equals: finalIdentifier.trim(), mode: "insensitive" } },
      ],
    },
  });

  if (!dbUser) {
    return { error: "Account not found. Please contact your facility administrator to register your account." };
  }

  let finalOrgId = dbUser.organizationId;
  
  if (dbUser.role !== "SYSTEM_ADMINISTRATOR") {
    if (!finalOrgId) {
      return { error: "Invalid Hospital/Facility. User is not assigned to an organization." };
    }

    const org = await prisma.organization.findUnique({
      where: { id: finalOrgId }
    });

    if (!org) {
      return { error: "Invalid Hospital/Facility. Organisation not found." };
    }

    finalOrgId = org.id;
  }

  // Deactivation guard – admin can suspend accounts via /admin/users
  if (!dbUser.isActive) {
    return { error: "This account has been suspended by your facility administrator. Please contact your system administrator." };
  }

  // Password check – check activationCode if first login with an activation code, otherwise standard check
  if (dbUser.isFirstLogin && dbUser.activationCode) {
    if (!password || dbUser.activationCode.toUpperCase() !== password.toUpperCase()) {
      return { error: "Invalid initial activation code." };
    }
  } else {
    if (dbUser.passwordHash && password && dbUser.passwordHash !== await hashPassword(password)) {
      return { error: "Invalid Security PIN/Password." };
    }
    // Auto-fix isFirstLogin for self-registered users who logged in successfully with passwordHash
    if (dbUser.isFirstLogin) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { isFirstLogin: false },
      });
      dbUser.isFirstLogin = false;
    }
    // Backfill missing passwordHash for legacy documents on next successful login
    if (!dbUser.passwordHash && password) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { passwordHash: await hashPassword(password) },
      });
    }
  }

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
  if (finalOrgId) {
    cookies().set("organizationId", finalOrgId, cookieOptions);
  } else {
    cookies().delete("organizationId");
  }
  cookies().set("userId", dbUser!.id, cookieOptions);
  cookies().set("userName", `${dbUser!.firstName} ${dbUser!.lastName}`, cookieOptions);

  // SECURE SESSION TOKEN:
  const tokenPayload = {
    patientId: dbUser!.id, // Reusing patientId field for userId in this generic token
    role: role,
    organizationId: finalOrgId,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const sessionToken = signToken(tokenPayload as any);
  cookies().set("session_token", sessionToken, cookieOptions);

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
  if (roleStr === "SYSTEM_ADMINISTRATOR") redirect("/system-admin/dashboard");
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
  // Delete all primary session tokens
  cookies().delete("session_token");
  cookies().delete("citizenSessionToken");
  cookies().delete("citizenPatientId");
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
    if (roleStr === "SYSTEM_ADMINISTRATOR") destination = "/system-admin/dashboard";
    else if (ADMIN_ROLES.includes(roleStr as any)) destination = "/admin/dashboard";
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

