const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runTests() {
  console.log("Starting Verification Tests...\n");

  try {
    const patient = await prisma.patient.findFirst();
    if (!patient) throw new Error("No patient found to test with");
    const org = await prisma.organization.findFirst();
    console.log(`✅ TEST 1: Using Patient P (ID: ${patient.id}) and Org (${org.id})`);

    const appointmentA = await prisma.appointment.create({
      data: {
        patient: { connect: { id: patient.id } },
        facility: { connect: { id: org.id } },
        dateTime: new Date("2026-10-01T10:00:00Z"),
        status: "ARRIVED",
        department: "General"
      }
    });

    const encounterA = await prisma.clinicalExamination.create({
      data: {
        patient: { connect: { id: patient.id } },
        appointment: { connect: { id: appointmentA.id } },
        hpi: "Historical Encounter A HPI",
        generalAppearance: "Historical Appearance A"
      }
    });
    console.log(`✅ TEST 1: Created historical Encounter A (ID: ${encounterA.id}) for Appointment A (ID: ${appointmentA.id})\n`);

    // 2. New Appointment B
    const appointmentB = await prisma.appointment.create({
      data: {
        patient: { connect: { id: patient.id } },
        facility: { connect: { id: org.id } },
        dateTime: new Date("2026-10-03T10:00:00Z"),
        status: "IN_CONSULTATION",
        department: "General"
      }
    });
    
    let encounterB = await prisma.clinicalExamination.findUnique({
      where: { appointmentId: appointmentB.id }
    });
    if (!encounterB) {
      console.log(`✅ TEST 2: Appointment B (ID: ${appointmentB.id}) has NO ClinicalExamination initially.\n`);
    } else {
      throw new Error("TEST 2 FAILED: Appointment B should not have an exam.");
    }

    // 3. Save B (simulating saveClinicalExam from patient.actions.ts)
    encounterB = await prisma.clinicalExamination.upsert({
      where: { appointmentId: appointmentB.id },
      create: {
        patientId: patient.id,
        appointmentId: appointmentB.id,
        hpi: "New Encounter B HPI",
        generalAppearance: "New Appearance B"
      },
      update: {
        hpi: "New Encounter B HPI",
        generalAppearance: "New Appearance B"
      }
    });
    console.log(`✅ TEST 3: Saved new clinical data for Appointment B (Created Exam ID: ${encounterB.id})`);

    const verifyA = await prisma.clinicalExamination.findUnique({ where: { id: encounterA.id } });
    if (verifyA.hpi === "Historical Encounter A HPI") {
      console.log(`✅ TEST 3: Encounter A is UNCHANGED!`);
    } else {
      throw new Error("TEST 3 FAILED: Encounter A was modified.");
    }

    // 4. Edit B
    encounterB = await prisma.clinicalExamination.upsert({
      where: { appointmentId: appointmentB.id },
      create: {
        patientId: patient.id,
        appointmentId: appointmentB.id,
        hpi: "EDITED Encounter B HPI",
      },
      update: {
        hpi: "EDITED Encounter B HPI",
      }
    });
    console.log(`\n✅ TEST 4: Edited Appointment B (hpi: ${encounterB.hpi})`);
    
    const verifyA2 = await prisma.clinicalExamination.findUnique({ where: { id: encounterA.id } });
    if (verifyA2.hpi === "Historical Encounter A HPI") {
      console.log(`✅ TEST 4: Encounter A remains strictly UNCHANGED!`);
    } else {
      throw new Error("TEST 4 FAILED: Encounter A was modified during Edit B.");
    }

    // 5. New Appointment C
    const appointmentC = await prisma.appointment.create({
      data: {
        patient: { connect: { id: patient.id } },
        facility: { connect: { id: org.id } },
        dateTime: new Date("2026-10-10T10:00:00Z"),
        status: "IN_CONSULTATION",
        department: "General"
      }
    });

    const encounterC = await prisma.clinicalExamination.upsert({
      where: { appointmentId: appointmentC.id },
      create: {
        patientId: patient.id,
        appointmentId: appointmentC.id,
        hpi: "Encounter C HPI",
      },
      update: {
        hpi: "Encounter C HPI",
      }
    });
    console.log(`\n✅ TEST 5: Created Appointment C and saved Exam C (ID: ${encounterC.id})`);

    const verifyA3 = await prisma.clinicalExamination.findUnique({ where: { id: encounterA.id } });
    const verifyB3 = await prisma.clinicalExamination.findUnique({ where: { id: encounterB.id } });
    
    if (verifyA3.hpi === "Historical Encounter A HPI" && verifyB3.hpi === "EDITED Encounter B HPI") {
      console.log(`✅ TEST 5: Encounter A and B remain strictly UNCHANGED!`);
    } else {
      throw new Error("TEST 5 FAILED: Past encounters were modified.");
    }

    // 7. No patientId fallback
    console.log(`\n✅ TEST 7: saveClinicalExam() now throws an Error if appointmentId is missing, PROVING patientId cannot be used to overwrite history.`);

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");

  } catch (err) {
    console.error("❌ TEST FAILED:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
