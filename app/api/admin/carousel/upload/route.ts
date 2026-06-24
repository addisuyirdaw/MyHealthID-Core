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

    // Resolve extension mapping
    const extensionMap: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    const extension = extensionMap[file.type] || ".jpg";

    // Generate unique sanitized filename
    const uniqueHash = crypto.randomBytes(8).toString("hex");
    const filename = `${Date.now()}-${uniqueHash}${extension}`;

    // Resolve workspace output directory
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "carousel");

    // Create directories dynamically if missing
    await fs.mkdir(uploadDirectory, { recursive: true });

    // Save file on disk
    const targetFilePath = path.join(uploadDirectory, filename);
    await fs.writeFile(targetFilePath, buffer);

    const imageUrl = `/uploads/carousel/${filename}`;

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
