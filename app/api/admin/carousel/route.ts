import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/locales/enums";

// ─────────────────────────────────────────────────────────────────────────────
// Auth Guard
// ─────────────────────────────────────────────────────────────────────────────
function getAdminSession(): { userId: string; userRole: string } | null {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userId = cookieStore.get("userId")?.value;

  if (
    !userRole ||
    !userId ||
    !ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number])
  ) {
    return null;
  }

  return { userId, userRole };
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Sanitization — strips all HTML / script tag payloads
// ─────────────────────────────────────────────────────────────────────────────
function sanitize(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/carousel — Fetch all slides ordered by sortOrder
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Forbidden: Administrator role required." },
      { status: 403 }
    );
  }

  try {
    const slides = await prisma.carouselSlide.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ success: true, slides }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/admin/carousel] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/carousel — Create a new slide
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Forbidden: Administrator role required." },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { imageUrl, headingEn, headingAm, textEn, textAm, sortOrder } = body;

  // Required field validation
  if (!imageUrl || !headingEn || !headingAm || !textEn || !textAm) {
    return NextResponse.json(
      {
        error:
          "Validation Error: imageUrl, headingEn, headingAm, textEn, and textAm are all required.",
      },
      { status: 400 }
    );
  }

  try {
    const slide = await prisma.carouselSlide.create({
      data: {
        imageUrl: sanitize(imageUrl),
        headingEn: sanitize(headingEn),
        headingAm: sanitize(headingAm),
        textEn: sanitize(textEn),
        textAm: sanitize(textAm),
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    return NextResponse.json({ success: true, slide }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/admin/carousel] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
