"use server";

import prisma from "@/lib/prisma";
import { revalidateTag, unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_ROLES } from "@/lib/locales/enums";
import { promises as fs } from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Admin RBAC guard
// ─────────────────────────────────────────────────────────────────────────────
async function requireAdminSession(): Promise<{ userId: string }> {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userId = cookieStore.get("userId")?.value;

  if (
    !userRole ||
    !userId ||
    !ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number])
  ) {
    throw new Error("Unauthorized Access Error: Administrator role required.");
  }

  return { userId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Actions (Cached)
// ─────────────────────────────────────────────────────────────────────────────
export const getLandingMedia = unstable_cache(
  async () => {
    return prisma.landingMedia.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  },
  ["landing-media"],
  { revalidate: 3600, tags: ["landing-media"] }
);

// ─────────────────────────────────────────────────────────────────────────────
// Admin Actions
// ─────────────────────────────────────────────────────────────────────────────
export async function getLandingMediaAdmin() {
  await requireAdminSession();
  return prisma.landingMedia.findMany({
    orderBy: { displayOrder: "asc" },
  });
}

export async function uploadLandingMedia(formData: FormData) {
  const { userId } = await requireAdminSession();

  const title = formData.get("title")?.toString() || null;
  const description = formData.get("description")?.toString() || null;
  const altText = formData.get("altText")?.toString() || "Landing Image";
  const displayOrderStr = formData.get("displayOrder")?.toString() || "0";
  const displayOrder = parseInt(displayOrderStr, 10) || 0;
  const isActive = formData.get("isActive") === "true";

  const file = formData.get("file") as File | null;
  const directImageUrl = formData.get("imageUrl")?.toString();

  let imageUrl = "";

  if (file && file.size > 0) {
    // Intercept non-image types
    if (!file.type.startsWith("image/")) {
      throw new Error("Validation Error: Only image files are allowed.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");
    imageUrl = `data:${file.type};base64,${base64Data}`;
  } else if (directImageUrl) {
    imageUrl = directImageUrl;
  } else {
    throw new Error("Validation Error: Either an image file upload or an image URL is required.");
  }

  const newMedia = await prisma.landingMedia.create({
    data: {
      imageUrl,
      altText,
      title,
      description,
      displayOrder,
      isActive,
      uploadedBy: userId,
    },
  });

  revalidateTag("landing-media");
  return newMedia;
}

export async function updateLandingMedia(
  id: string,
  data: {
    title?: string | null;
    description?: string | null;
    altText?: string;
    displayOrder?: number;
    isActive?: boolean;
    imageUrl?: string;
  }
) {
  await requireAdminSession();

  const updated = await prisma.landingMedia.update({
    where: { id },
    data,
  });

  revalidateTag("landing-media");
  return updated;
}

export async function deleteLandingMedia(id: string) {
  await requireAdminSession();

  // Optionally delete the physical file if it was uploaded locally
  try {
    const media = await prisma.landingMedia.findUnique({ where: { id } });
    if (media && media.imageUrl.startsWith("/uploads/landing/")) {
      const filePath = path.join(process.cwd(), "public", media.imageUrl);
      await fs.unlink(filePath).catch(() => {});
    }
  } catch (e) {
    console.error("Failed to delete local file:", e);
  }

  await prisma.landingMedia.delete({
    where: { id },
  });

  revalidateTag("landing-media");
  return { success: true };
}
