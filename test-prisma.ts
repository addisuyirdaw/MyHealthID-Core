import { registerPatient } from "./lib/actions/patient.actions";
import { Ward } from "@prisma/client";

async function main() {
  const result = await registerPatient({
    fullName: "Addisu Yirdaw",
    age: 26,
    sex: "Male",
    dateOfBirth: new Date("2000-12-22T00:00:00.000Z"),
    reasonForVisit: "Routine Triage Assessment",
    ward: "MATERNITY" as Ward,
    chiefComplaint: "Routine Assessment",
    generateMyHealthId: true,
  });
  console.log("RESULT:", result);
}

main().catch(console.error);
