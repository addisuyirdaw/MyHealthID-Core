import { cookies } from "next/headers";
import { ReceptionPortal } from "@/components/ReceptionPortal";

export default function ReceptionPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value || "";
  const userId = cookieStore.get("userId")?.value || "";

  return <ReceptionPortal userRole={userRole} userId={userId} />;
}
