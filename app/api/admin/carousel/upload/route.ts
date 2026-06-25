import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
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
// POST /api/admin/carousel/upload — Secure file uploader
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Forbidden: Administrator role required." },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Validation Error: No file provided." },
        { status: 400 }
      );
    }

    // Enforce 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Validation Error: File exceeds maximum allowed size of 5MB." },
        { status: 400 }
      );
    }

    // Enforce mime type restriction (JPEG, PNG, WEBP)
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Validation Error: Only JPEG, PNG, and WEBP images are allowed." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to Base64 data URL
    const base64Data = buffer.toString("base64");
    const imageUrl = `data:${file.type};base64,${base64Data}`;

    return NextResponse.json(
      { success: true, imageUrl },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[POST /api/admin/carousel/upload] Error:", error);
    return NextResponse.json(
      { error: "Internal server error during upload parsing." },
      { status: 500 }
    );
  }
}
