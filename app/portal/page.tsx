import { redirect } from "next/navigation";

/**
 * /portal → redirects to /login (the unified staff + citizen login page).
 * The actual login UI lives at app/(public)/login/page.tsx.
 */
export default function PortalPage() {
  redirect("/login");
}
