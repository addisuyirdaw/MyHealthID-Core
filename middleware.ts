import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const userRole = request.cookies.get("userRole")?.value;
  const path = request.nextUrl.pathname;

  if (!userRole) {
    if (
      path.startsWith("/admin") ||
      path.startsWith("/doctor") ||
      path.startsWith("/lab") ||
      path.startsWith("/pharmacy") ||
      path.startsWith("/manage")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else {
    if (path.startsWith("/admin") && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/register?error=Access+Denied:+Admin+Role+Required", request.url));
    }
    if (path.startsWith("/doctor") && userRole !== "DOCTOR" && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/register?error=Access+Denied:+Doctor+Role+Required.", request.url));
    }
    /** Longitudinal EMR — clinical staff only (not admin, lab, or pharmacy). */
    if (path.startsWith("/manage") && userRole !== "DOCTOR" && userRole !== "NURSE") {
      return NextResponse.redirect(
        new URL("/register?error=Access+Denied:+Doctor+or+Nurse+role+required+for+EMR.", request.url)
      );
    }
    if (path.startsWith("/lab") && userRole !== "LAB_TECH" && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/register?error=Access+Denied:+Lab+Tech+Role+Required.", request.url));
    }
    if (path.startsWith("/pharmacy") && userRole !== "PHARMACIST" && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/register?error=Access+Denied:+Pharmacist+Role+Required.", request.url));
    }

    if (path === "/login") {
      if (userRole === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      if (userRole === "DOCTOR") return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
      if (userRole === "NURSE") return NextResponse.redirect(new URL("/queue", request.url));
      if (userRole === "LAB_TECH") return NextResponse.redirect(new URL("/lab", request.url));
      if (userRole === "PHARMACIST") return NextResponse.redirect(new URL("/pharmacy", request.url));
      if (userRole === "RECEPTIONIST") return NextResponse.redirect(new URL("/register", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/doctor/:path*", "/lab/:path*", "/pharmacy/:path*", "/manage/:path*", "/login"],
};
