const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({
    where: { healthId: "HLT-648073" },
    include: {
      clinicalExams: { orderBy: { createdAt: "desc" } },
      appointments: {
        include: { clinicalExam: true }
      }
    }
  });
  
  if (!patient) {
    console.log("Patient not found");
    return;
  }
  
  console.log("Patient:", patient.fullName);
  console.log("Clinical Exams Count:", patient.clinicalExams.length);
  if (patient.clinicalExams.length > 0) {
    const exam = patient.clinicalExams[0];
    console.log("Most recent exam ID:", exam.id);
    console.log("Appointment ID on exam:", exam.appointmentId);
    console.log("HPI:", exam.hpi);
    console.log("Chief Complaints:", exam.chiefComplaints);
    console.log("General Appearance:", exam.generalAppearance);
  }
  
  console.log("Appointments Count:", patient.appointments.length);
  for (const app of patient.appointments) {
    console.log(`Appt ${app.id}: status=${app.status}, hasClinicalExam=${!!app.clinicalExam}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
