import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getInboundReferrals } from "@/lib/actions/referral.actions";
import ReferralIngestionQueue from "@/components/referrals/ReferralIngestionQueue";
import prisma from "@/lib/prisma";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbound Referrals | MyHealthID",
  description: "Manage and respond to inbound patient referrals sent to your facility.",
};

// Clinical and administrative roles permitted to view inbound referrals
const PERMITTED_ROLES = [
  "GENERAL_PRACTITIONER",
  "MEDICAL_SPECIALIST",
  "SUB_SPECIALIST",
  "CLINICAL_NURSE",
  "SPECIALIZED_NURSE",
  "MIDWIFE",
  "HEALTH_OFFICER",
  "HOSPITAL_CEO",
  "IT_HIS_ADMIN",
  "RECEPTIONIST",
  "CARD_ROOM_CLERK",
];

export default async function ReceivedReferralsPage() {
  const cookieStore = cookies();
  const role = cookieStore.get("role")?.value;
  const organizationId = cookieStore.get("organizationId")?.value;

  // Guard: must be authenticated with a known facility
  if (!organizationId) {
    redirect("/signin");
  }

  // Guard: must be a permitted clinical or admin role
  if (!role || !PERMITTED_ROLES.includes(role)) {
    redirect("/dashboard");
  }

  // Fetch the facility name for the page header
  let facilityName = "Your Facility";
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    if (org) facilityName = org.name;
  } catch {
    // Non-fatal — we still render the page with a fallback name
  }

  // Fetch inbound referrals for this facility
  let referrals: any[] = [];
  try {
    referrals = await getInboundReferrals();
  } catch {
    // Render with an empty list — avoids a full page crash if DB is unavailable
    referrals = [];
  }

  return (
    <ReferralIngestionQueue
      initialReferrals={referrals}
      facilityName={facilityName}
    />
  );
}
