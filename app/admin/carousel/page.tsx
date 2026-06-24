import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ROLES } from "@/lib/locales/enums";
import prisma from "@/lib/prisma";
import CarouselSlideClient from "./CarouselSlideClient";

export const dynamic = "force-dynamic";

export default async function CarouselAdminPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const userName = cookieStore.get("userName")?.value || "Administrator";

  // RBAC guard — only IT_HIS_ADMIN and HOSPITAL_CEO may access this page
  if (!userRole || !ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number])) {
    redirect("/login");
  }

  // Fetch initial slides server-side for instant render (no loading flash)
  let initialSlides: any[] = [];
  try {
    initialSlides = await prisma.carouselSlide.findMany({
      orderBy: { sortOrder: "asc" },
    });
    // Serialize dates to JSON-safe format for client component hydration
    initialSlides = JSON.parse(JSON.stringify(initialSlides));
  } catch (err) {
    console.error("[CarouselAdminPage] Failed to fetch initial slides:", err);
  }

  return (
    <CarouselSlideClient
      initialSlides={initialSlides}
      userName={userName}
    />
  );
}
