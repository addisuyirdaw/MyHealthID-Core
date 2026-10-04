import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SYSTEM_ADMIN_ROLES } from "@/lib/locales/enums";
import DoctorPatientChart from "@/components/DoctorPatientChart";

export default async function AdminPatientView({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const userId = cookieStore.get("userId")?.value || "";
  const userRole = cookieStore.get("userRole")?.value || "";

  if (!SYSTEM_ADMIN_ROLES.includes(userRole as any)) {
    redirect("/login");
  }

  // Load FULL patient chart data for demo purposes.
  // In a real environment, this route would be restricted or heavily audited.
  const patient = await prisma.patient.findFirst({
    where: { id: params.id },
    include: {
      vitals:         { orderBy: { createdAt: 'desc' } },
      investigations: { orderBy: { createdAt: 'desc' } },
      prescriptions:  { orderBy: { createdAt: 'desc' } },
      clinicalExams:  { orderBy: { createdAt: 'desc' } },
      appointments: {
        where: { status: { in: ["ARRIVED", "TRIAGED", "IN_CONSULTATION"] } },
        orderBy: { dateTime: "desc" },
        take: 1,
        include: { assignedWard: true, clinicalExam: true },
      },
    }
  });

  if (!patient) return notFound();

  const activeAppointment = patient.appointments?.[0];
  if (activeAppointment && activeAppointment.clinicalExam) {
    (patient as any).clinicalExam = activeAppointment.clinicalExam;
  } else {
    (patient as any).clinicalExam = null;
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 text-center">
        <p className="text-amber-400 font-bold text-sm tracking-wide">
          ⚠️ DEMO MODE ACTIVE: System Administrators are viewing restricted clinical records.
        </p>
      </div>
      <div className="p-4">
        <DoctorPatientChart patient={patient} currentUserId={userId} />
      </div>
    </div>
  );
}
