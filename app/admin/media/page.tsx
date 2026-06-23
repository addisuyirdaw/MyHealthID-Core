import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ROLES } from "@/lib/locales/enums";
import { getLandingMediaAdmin } from "@/lib/actions/media.actions";
import MediaManagerClient from "./MediaManagerClient";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const activeOrgId = cookieStore.get("organizationId")?.value;
  const userName = cookieStore.get("userName")?.value || "Administrator";

  if (!activeOrgId || !ADMIN_ROLES.includes(userRole as any)) {
    redirect("/login");
  }

  let mediaItems: any[] = [];
  try {
    mediaItems = await getLandingMediaAdmin();
  } catch (error) {
    console.error("Failed to fetch landing media:", error);
  }

  return (
    <MediaManagerClient initialItems={mediaItems} userName={userName} />
  );
}
