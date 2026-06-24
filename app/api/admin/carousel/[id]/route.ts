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
// PUT /api/admin/carousel/[id] — Update slide fields
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Forbidden: Administrator role required." },
      { status: 403 }
    );
  }

  const { id } = params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Build partial update payload — only update provided fields
  const data: Record<string, any> = {};
  if (typeof body.imageUrl === "string") data.imageUrl = sanitize(body.imageUrl);
  if (typeof body.headingEn === "string") data.headingEn = sanitize(body.headingEn);
  if (typeof body.headingAm === "string") data.headingAm = sanitize(body.headingAm);
  if (typeof body.textEn === "string") data.textEn = sanitize(body.textEn);
  if (typeof body.textAm === "string") data.textAm = sanitize(body.textAm);
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Validation Error: No valid fields provided to update." },
      { status: 400 }
    );
  }

  try {
    const slide = await prisma.carouselSlide.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, slide }, { status: 200 });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Slide not found." },
        { status: 404 }
      );
    }
    console.error(`[PUT /api/admin/carousel/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/carousel/[id] — Remove a slide permanently
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Forbidden: Administrator role required." },
      { status: 403 }
    );
  }

  const { id } = params;

  try {
    await prisma.carouselSlide.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Slide not found." },
        { status: 404 }
      );
    }
    console.error(`[DELETE /api/admin/carousel/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
