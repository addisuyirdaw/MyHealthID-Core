import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_ROLES,
  CLINICAL_ROLES,
  TRIAGE_ROLES,
  LAB_ROLES,
  PHARMACY_ROLES,
  REGISTRATION_ROLES,
  normalizeHealthcareRole,
} from "@/lib/locales/enums";

/** Helper – redirect to /unauthorized with a descriptive message. */
function deny(request: NextRequest, reason: string) {
  const url = new URL("/unauthorized", request.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

/** Helper – redirect logged-in user to their home dashboard. */
function toDashboard(request: NextRequest, role: string) {
  const normalizedRole = normalizeHealthcareRole(role);
  if (ADMIN_ROLES.includes(normalizedRole as any)) return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  if (CLINICAL_ROLES.includes(normalizedRole as any)) return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
  if (TRIAGE_ROLES.includes(normalizedRole as any)) return NextResponse.redirect(new URL("/triage", request.url));
  if (LAB_ROLES.includes(normalizedRole as any)) return NextResponse.redirect(new URL("/lab", request.url));
  if (PHARMACY_ROLES.includes(normalizedRole as any)) return NextResponse.redirect(new URL("/pharmacy", request.url));
  if (REGISTRATION_ROLES.includes(normalizedRole as any)) return NextResponse.redirect(new URL("/register", request.url));
  return NextResponse.redirect(new URL("/login", request.url));
}

export function middleware(request: NextRequest) {
  const userRole = request.cookies.get("userRole")?.value;
  const path = request.nextUrl.pathname;

  /* ── Unauthenticated users: protect all staff-only routes ── */
  if (!userRole) {
    const protectedPrefixes = [
      "/admin", "/doctor", "/lab", "/pharmacy",
      "/manage", "/triage", "/screening",
      "/dashboard/settings",
    ];
    if (protectedPrefixes.some((p) => path.startsWith(p))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // /scan is staff-only for unauthenticated users; /register is intentionally public for citizen self-registration (no login required)
    if (path.startsWith("/scan")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  /* ── Authenticated users: hard role checks ── */

  // ── /admin/* → ADMIN only
  if (path.startsWith("/admin") && !ADMIN_ROLES.includes(userRole as any)) {
    return deny(request, "Admin role required.");
  }

  // ── /dashboard/settings/staff → ADMIN only
  if (path.startsWith("/dashboard/settings") && !ADMIN_ROLES.includes(userRole as any)) {
    return deny(request, "Admin role required for staff management.");
  }

  // ── /doctor/* → clinical roles or ADMIN
  if (
    path.startsWith("/doctor") &&
    !CLINICAL_ROLES.includes(userRole as any) &&
    !ADMIN_ROLES.includes(userRole as any)
  ) {
    return deny(request, "Doctor role required.");
  }

  // ── /manage/* → clinical roles or triage roles
  if (
    path.startsWith("/manage") &&
    !CLINICAL_ROLES.includes(userRole as any) &&
    !TRIAGE_ROLES.includes(userRole as any) &&
    !ADMIN_ROLES.includes(userRole as any)
  ) {
    return deny(request, "Doctor, nurse, or admin role required for the EMR timeline.");
  }

  // ── /triage → triage only
  if (path.startsWith("/triage") && !TRIAGE_ROLES.includes(userRole as any) && !ADMIN_ROLES.includes(userRole as any)) {
    return deny(request, "Triage role required for the triage queue.");
  }

  // ── /screening → triage only
  if (path.startsWith("/screening") && !TRIAGE_ROLES.includes(userRole as any) && !ADMIN_ROLES.includes(userRole as any)) {
    return deny(request, "Triage role required for the screening portal.");
  }

  // ── /register is PUBLIC – any citizen or staff member can register a patient

  // ── /scan → registration roles or ADMIN
  if (
    path.startsWith("/scan") &&
    !REGISTRATION_ROLES.includes(userRole as any) &&
    !ADMIN_ROLES.includes(userRole as any)
  ) {
    return deny(request, "Receptionist or Card Room Clerk role required for ID scanning.");
  }

  // ── /lab → laboratory roles or ADMIN
  if (
    path.startsWith("/lab") &&
    !LAB_ROLES.includes(userRole as any) &&
    !ADMIN_ROLES.includes(userRole as any)
  ) {
    return deny(request, "Laboratory role required.");
  }

  // ── /pharmacy → pharmacist or ADMIN
  if (
    path.startsWith("/pharmacy") &&
    !PHARMACY_ROLES.includes(userRole as any) &&
    !ADMIN_ROLES.includes(userRole as any)
  ) {
    return deny(request, "Pharmacist role required.");
  }

  // ── Already logged in → redirect away from /login
  if (path === "/login") {
    return toDashboard(request, userRole);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/doctor/:path*",
    "/lab/:path*",
    "/pharmacy/:path*",
    "/manage/:path*",
    "/triage/:path*",
    "/triage",
    "/screening/:path*",
    "/screening",
    // "/register" is intentionally excluded – it's a public route
    "/scan/:path*",
    "/scan",
    "/dashboard/settings/:path*",
    "/login",
  ],
};
