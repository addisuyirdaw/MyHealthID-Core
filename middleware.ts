import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Helper – redirect to /unauthorized with a descriptive message. */
function deny(request: NextRequest, reason: string) {
  const url = new URL("/unauthorized", request.url);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

/** Helper – redirect logged-in user to their home dashboard. */
function toDashboard(request: NextRequest, role: string) {
  const map: Record<string, string> = {
    ADMIN: "/admin/dashboard",
    DOCTOR: "/doctor/dashboard",
    NURSE: "/triage",
    RECEPTIONIST: "/register",
    LAB_TECH: "/lab",
    PHARMACIST: "/pharmacy",
  };
  return NextResponse.redirect(new URL(map[role] ?? "/login", request.url));
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
  if (path.startsWith("/admin") && userRole !== "ADMIN") {
    return deny(request, "Admin role required.");
  }

  // ── /dashboard/settings/staff → ADMIN only
  if (path.startsWith("/dashboard/settings") && userRole !== "ADMIN") {
    return deny(request, "Admin role required for staff management.");
  }

  // ── /doctor/* → DOCTOR or ADMIN
  if (
    path.startsWith("/doctor") &&
    userRole !== "DOCTOR" &&
    userRole !== "ADMIN"
  ) {
    return deny(request, "Doctor role required.");
  }

  // ── /manage/* → DOCTOR or NURSE (EMR timeline)
  if (
    path.startsWith("/manage") &&
    userRole !== "DOCTOR" &&
    userRole !== "NURSE"
  ) {
    return deny(request, "Doctor or Nurse role required for the EMR timeline.");
  }

  // ── /triage → NURSE only
  if (path.startsWith("/triage") && userRole !== "NURSE") {
    return deny(request, "Nurse role required for the triage queue.");
  }

  // ── /screening → NURSE only
  if (path.startsWith("/screening") && userRole !== "NURSE") {
    return deny(request, "Nurse role required for the screening portal.");
  }

  // ── /register is PUBLIC – any citizen or staff member can register a patient

  // ── /scan → RECEPTIONIST
  if (path.startsWith("/scan") && userRole !== "RECEPTIONIST" && userRole !== "ADMIN") {
    return deny(request, "Receptionist role required for ID scanning.");
  }

  // ── /lab → LAB_TECH or ADMIN
  if (
    path.startsWith("/lab") &&
    userRole !== "LAB_TECH" &&
    userRole !== "ADMIN"
  ) {
    return deny(request, "Lab Technician role required.");
  }

  // ── /pharmacy → PHARMACIST or ADMIN
  if (
    path.startsWith("/pharmacy") &&
    userRole !== "PHARMACIST" &&
    userRole !== "ADMIN"
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
