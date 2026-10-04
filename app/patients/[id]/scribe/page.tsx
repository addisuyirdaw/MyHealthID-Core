import React from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/session";
import { PatientScribeClient } from "./PatientScribeClient";

export default async function PatientScribePage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("citizenSessionToken")?.value;
  const payload = sessionToken ? verifyToken(sessionToken) : null;
  
  if (!payload || payload.patientId !== params.id) {
    redirect("/signin");
  }

  const patient = await prisma.patient.findFirst({
    where: { id: params.id },
  });

  if (!patient) return notFound();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <PatientScribeClient patient={patient} />
      </div>
    </div>
  );
}
