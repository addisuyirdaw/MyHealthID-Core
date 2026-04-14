"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginUser(formData: FormData) {
  const role = formData.get("role") as string;
  
  if (!role) {
    throw new Error("Role is required for login.");
  }

  // Set the cookie. httpOnly is false to gracefully support the existing client-side bypass checks.
  cookies().set("userRole", role, {
    httpOnly: false, 
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });

  // Redirect based on the authenticated role
  if (role === "ADMIN") redirect("/admin/stats");
  if (role === "DOCTOR") redirect("/doctor/dashboard");
  if (role === "NURSE" || role === "RECEPTIONIST") redirect("/register");
  if (role === "LAB_TECH") redirect("/lab");
  if (role === "PHARMACIST") redirect("/pharmacy");
}

export async function logoutUser() {
  cookies().delete("userRole");
  redirect("/");
}
