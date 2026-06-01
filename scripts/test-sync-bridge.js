import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("\n==================================================");
  console.log("   MYHEALTHID INTEROP SYNC BRIDGE VERIFIER");
  console.log("==================================================\n");

  // 1. Ensure a test organization exists in our DB
  const testOrgId = "MH-ADD-EMR-SMARTCARE-8E9A";
  let organization = await prisma.organization.findUnique({
    where: { id: testOrgId }
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        id: testOrgId,
        name: "SmartCare Legacy EMR Clinic - Addis Ababa",
        nameLng: { en: "SmartCare Legacy EMR Clinic - Addis Ababa", am: "ስማርትኬር እባክል ኤምአር ክሊኒክ - አዲስ አበባ" },
        code: testOrgId,
        registrationId: testOrgId,
        ownershipType: "PRIVATE",
        serviceType: "HEALTH_CENTER",
        region: "Addis Ababa",
        zone: "Zone 1",
        woreda: "Woreda 03",
        kebele: "Kebele 08"
      }
    });
    console.log(`[SETUP] Created legacy organization in DB: ${organization.name}`);
  } else {
    console.log(`[SETUP] Legacy organization exists in DB: ${organization.name}`);
  }

  // 2. Ensure a verified citizen exists in National Registry for auto-onboarding
  const testFaydaId = "9999888877776666";
  let verifiedRecord = await prisma.verifiedRegistry.findFirst({
    where: { fin: testFaydaId }
  });

  if (!verifiedRecord) {
    verifiedRecord = await prisma.verifiedRegistry.create({
      data: {
        fin: testFaydaId,
        fcn: "8888777766665555",
        fullName: "Abebe Kebede Legesse",
        dateOfBirth: new Date("1989-08-15"),
        gender: "M"
      }
    });
    console.log(`[SETUP] Created verified citizen record in National Registry: ${verifiedRecord.fullName}`);
  } else {
    console.log(`[SETUP] Verified citizen exists in National Registry: ${verifiedRecord.fullName}`);
  }

  // 3. Encrypt facility API key using the shared secret
  const secret = process.env.INTEROP_SECRET || "MyHealthID-Interop-Secure-Secret-Key-2026";
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  
  // Encrypt the organization ID to prove identity
  let encrypted = cipher.update(`MYHEALTHID-VALID-FACILITY:${testOrgId}`, "utf8", "hex");
  encrypted += cipher.final("hex");
  const secureApiKey = `${iv.toString("hex")}:${encrypted}`;

  console.log(`[SECURITY] Generated encrypted secure API key: ${secureApiKey.substring(0, 30)}...`);

  // 4. Construct EMR Payload (Vitals, Diagnosis, Prescriptions)
  const payload = {
    organizationId: testOrgId,
    apiKey: secureApiKey,
    faydaId: testFaydaId,
    medicalRecord: {
      vitals: {
        bp: "145/95",
        pulse: 92,
        rr: 20,
        temp: 38.2,
        spO2: 95,
        weightKg: 78,
        heightCm: 178,
        painLevel: 5,
        createdAt: new Date().toISOString()
      },
      diagnosis: {
        name: "Lobar Pneumonia",
        code: "ICD-10-J18.1",
        notes: "Auscultation revealed dullness and crackles in right lower lung field.",
        createdAt: new Date().toISOString()
      },
      prescriptions: [
        {
          drugName: "Amoxicillin-Clavulanate 1g",
          dosage: "1000mg",
          frequency: "BID",
          duration: "10 days",
          notes: "Take with food.",
          status: "PENDING",
          createdAt: new Date().toISOString()
        },
        {
          drugName: "Paracetamol 500mg",
          dosage: "500mg",
          frequency: "QID PRN",
          duration: "3 days",
          notes: "For fever > 38.5C",
          status: "DISPENSED",
          createdAt: new Date().toISOString()
        }
      ]
    }
  };

  // 5. Send POST request to Local Next.js Server
  const endpointUrl = "http://localhost:3000/api/interop/sync";
  console.log(`[HTTP] Sending EMR Payload to headless endpoint: ${endpointUrl}...`);

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log(`[HTTP] Response status: ${response.status}`);
    console.log("[HTTP] Response JSON:", JSON.stringify(result, null, 2));

    if (response.status === 200 && result.success) {
      console.log("\n✅ SUCCESS: EMR Sync Ingestion Succeeded!");
      
      // Let's verify DB records!
      const onboardedPatient = await prisma.patient.findFirst({
        where: { faydaId: testFaydaId }
      });
      
      if (onboardedPatient) {
        console.log(`\n--- DATABASE VERIFICATION ---`);
        console.log(`✓ Patient Name: ${onboardedPatient.fullName}`);
        console.log(`✓ Health ID:    ${onboardedPatient.healthId}`);
        console.log(`✓ Auto-Onboarded: ${result.patient.wasAutoOnboarded}`);

        // Check vitals
        const dbVitals = await prisma.vitals.findMany({
          where: { patientId: onboardedPatient.id }
        });
        console.log(`✓ Vitals in DB:   ${dbVitals.length} records found (Latest BP: ${dbVitals[0]?.bp})`);

        // Check prescriptions
        const dbPrescriptions = await prisma.prescription.findMany({
          where: { patientId: onboardedPatient.id }
        });
        console.log(`✓ Meds in DB:     ${dbPrescriptions.length} records found (Latest: ${dbPrescriptions[0]?.drugName})`);

        // Check timeline entries
        const dbTimeline = await prisma.medicalTimelineEntry.findMany({
          where: { patientId: onboardedPatient.id }
        });
        console.log(`✓ Timeline:       ${dbTimeline.length} entries created.`);
        for (const entry of dbTimeline) {
          console.log(`  - [${entry.entryType}] ${entry.title}: ${entry.logEntry}`);
        }
        console.log(`-----------------------------\n`);
      } else {
        console.log("❌ ERROR: Patient not found in DB even though API returned success.");
      }
    } else {
      console.log("\n❌ FAIL: Ingestion failed. Check Next.js server logs.");
    }
  } catch (err) {
    console.error("\n❌ HTTP Connection Error: Could not connect to Next.js server. Is it running on port 3000?");
    console.log("Please run 'npm run dev' to start the server, then run this test script in another terminal.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
