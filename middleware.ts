import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Basic mock check for roles. In a real application, you would decode a JWT or check a session cookie.
  const userRole = request.cookies.get('userRole')?.value;

  const path = request.nextUrl.pathname;

  // Allow access during development without a cookie
  if (process.env.NODE_ENV === 'development' && !userRole) {
    return NextResponse.next();
  }

  // Protect Dashboard
  if (path.startsWith('/dashboard') && userRole !== 'DOCTOR' && userRole !== 'ADMIN') {
    // If not a doctor, redirect them appropriately or to login.
    // For this basic check, we'll imagine a /login page exists.
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect Lab
  if (path.startsWith('/lab') && userRole !== 'LAB_TECH' && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect Pharmacy
  if (path.startsWith('/pharmacy') && userRole !== 'PHARMACIST' && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Basic redirection from root or login if already authenticated with a role
  if ((path === '/' || path === '/login') && userRole) {
    if (userRole === 'DOCTOR') return NextResponse.redirect(new URL('/dashboard', request.url));
    if (userRole === 'LAB_TECH') return NextResponse.redirect(new URL('/lab', request.url));
    if (userRole === 'PHARMACIST') return NextResponse.redirect(new URL('/pharmacy', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply this middleware to these specific paths
  matcher: ['/dashboard/:path*', '/lab/:path*', '/pharmacy/:path*', '/', '/login'],
};
