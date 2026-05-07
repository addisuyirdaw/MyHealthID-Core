"use server";

import prisma from "@/lib/prisma";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string;
  // Note: password is intentionally bypassed for this simulation mode demo
  // const password = formData.get("password") as string;

  if (!email) {
    throw new Error("Email/ID is required for login.");
  }

  const cleanEmail = email.toLowerCase().trim();
  let dbUser = await prisma.user.findUnique({
    where: { email: cleanEmail }
  });

  // Pitch Hook: Auto-generate Dr. Dawit if he doesn't exist
  if (cleanEmail === "dr.dawit@myhealthid.gov.et") {
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: cleanEmail,
          password: "demo-password-hash", // Placeholder
          role: "DOCTOR",
          firstName: "Dawit",
          lastName: "Tadesse",
          professionalLicenseNumber: "MD-2026-ETH",
        }
      });
      console.log("[PITCH HOOK] Auto-created Dr. Dawit record in MongoDB Atlas.");
    }
  }

  if (!dbUser) {
    // For strict demo continuity, if not found, fallback to the role submitted from the form
    // but in a real system we would throw: throw new Error("Professional credentials not found.");
    const formRole = formData.get("role") as string;
    if (formRole) {
      console.log("[SIMULATION MODE] User not found, falling back to form role:", formRole);
      dbUser = { role: formRole as any } as any;
    } else {
      throw new Error("Professional credentials not found in MongoDB.");
    }
  }

  const role = dbUser!.role;

  // Set the cookie. httpOnly is false to gracefully support the existing client-side bypass checks.
  cookies().set("userRole", role, {
    httpOnly: false, 
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });

  // Redirect based on the authenticated Estonian role check
  const roleStr = role as string;
  if (roleStr === "ADMIN") redirect("/admin/dashboard");
  if (roleStr === "DOCTOR") redirect("/doctor/dashboard");
  if (roleStr === "NURSE" || roleStr === "RECEPTIONIST") redirect("/register");
  if (roleStr === "LAB_TECH") redirect("/lab");
  if (roleStr === "PHARMACIST") redirect("/pharmacy");
}

export async function logoutUser() {
  cookies().delete("userRole");
  redirect("/");
}
