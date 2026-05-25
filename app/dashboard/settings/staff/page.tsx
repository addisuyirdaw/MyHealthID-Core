import React from "react";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Users, ShieldAlert, Award, ShieldCheck, Plus, Key, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StaffManagementClient from "./StaffManagementClient";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage() {
  const cookieStore = cookies();
  const userRole = cookieStore.get("userRole")?.value;
  const activeOrgId = cookieStore.get("organizationId")?.value;

  // Security Access Control
  if (userRole !== "ADMIN" || !activeOrgId) {
    redirect("/unauthorized");
  }

  // Fetch the active organization details
  const organization = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    select: { name: true }
  });

  // Fetch all staff members belonging to the active organization
  const staffMembers = await prisma.user.findMany({
    where: { organizationId: activeOrgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      professionalLicenseNumber: true,
      createdAt: true
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm mb-1 uppercase tracking-wider">
            <Award className="w-4 h-4 text-blue-500" /> Administrative Dashboard
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="h-8 w-8 text-blue-600" />
            Staff Management Board
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Active Tenant Facility: <span className="text-slate-800 font-bold">{organization?.name || "Debre Berhan Referral Hospital"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-full border border-blue-200 font-medium text-sm shadow-sm">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <span>Tenant Context: Isolated</span>
        </div>
      </header>

      {/* Main Grid: Staff Roster + Dynamic Onboarding Form */}
      <StaffManagementClient initialStaff={staffMembers} isAdmin={userRole === "ADMIN"} />
    </div>
  );
}
