const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const SESSION_SECRET = process.env.SESSION_SECRET || "mhi-secure-patient-portal-session-secret-key-987654321";

function signToken(payload) {
  const data = JSON.stringify(payload);
  const base64Payload = Buffer.from(data).toString("base64");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(base64Payload).digest("hex");
  return `${base64Payload}.${signature}`;
}

async function runTest() {
  console.log("Starting E2E AI Test...");
  
  const users = await prisma.user.findMany();
  const doctor = users.find(u => u.organizationId !== null && u.role !== "CITIZEN");
  if (!doctor) throw new Error("No doctor found");

  const patient = await prisma.patient.findFirst();
  if (!patient) throw new Error("No patient found");

  console.log(`Doctor: ${doctor.email}, Facility: ${doctor.organizationId}`);

  const validAppt = await prisma.appointment.findFirst({
    where: { facilityId: doctor.organizationId }
  });
  
  if (!validAppt) throw new Error("No valid appointment found");

  const invalidAppt = await prisma.appointment.findFirst({
    where: { facilityId: { not: doctor.organizationId } }
  });

  if (!invalidAppt) throw new Error("No invalid appointment found");

  const sessionToken = signToken({ patientId: doctor.id, organizationId: doctor.organizationId, role: "DOCTOR", iat: Date.now(), exp: Date.now() + 100000 });
  const headers = {
    "Cookie": `session_token=${sessionToken}`,
    "Content-Type": "application/json"
  };

  console.log("Waiting 2 seconds for MongoDB replication...");
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("validAppt.id:", validAppt.id);
  console.log("invalidAppt.id:", invalidAppt.id);

  try {
    // TEST 1: Scribe extraction (valid)
    console.log("Testing /api/ai/scribe (Valid)...");
    const transcript = "Doctor: Good morning. What brings you here today? Patient: I have had a headache for three days. It becomes worse in the afternoon. I do not have vomiting. Doctor: Any previous medical problems? Patient: No known previous medical problems.";
    
    const scribeRes = await fetch("http://localhost:3000/api/ai/scribe", {
      method: "POST",
      headers,
      body: JSON.stringify({ transcript, appointmentId: validAppt.id })
    });
    
    const scribeData = await scribeRes.json();
    console.log("Scribe Output:", scribeData);
    if (!scribeRes.ok) throw new Error("Scribe failed: " + JSON.stringify(scribeData));

    // TEST 2: Scribe extraction (cross-facility rejection)
    console.log("Testing /api/ai/scribe (Cross-Facility)...");
    const rejectRes = await fetch("http://localhost:3000/api/ai/scribe", {
      method: "POST",
      headers,
      body: JSON.stringify({ transcript, appointmentId: invalidAppt.id })
    });
    const rejectData = await rejectRes.json();
    console.log("Rejection Output:", rejectData);
    if (rejectRes.status !== 403) throw new Error("Failed to reject cross-facility appointment");

    console.log("Tests Passed!");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest().catch(console.error);
