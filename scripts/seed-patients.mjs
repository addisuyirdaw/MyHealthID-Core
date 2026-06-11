import { PrismaClient, Ward, TriageStatus, PriorityLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding patient database...");

  // Clear existing patients to start fresh (optional, but good for clean seed)
  const deleteCount = await prisma.patient.deleteMany({});
  console.log(`Cleared ${deleteCount.count} existing patient records.`);

  const samplePatients = [
    {
      fullName: "Alemayehu Tadesse",
      healthId: "MHI-9283-1823",
      nationalId: "109283748293",
      faydaId: "109283748293",
      fcn: "4829301928374615",
      internalId: "ALE-9283",
      age: 45,
      sex: "Male",
      chiefComplaint: "Severe crushing chest pain radiating to left arm",
      detailedSituation: "Patient arrived clutching chest, sweating profusely, short of breath for the last 45 minutes.",
      reasonForVisit: "Emergency chest pain",
      ward: Ward.EMERGENCY,
      triageStatus: TriageStatus.RED,
      priorityLevel: PriorityLevel.EMERGENCY,
      emergencyFlag: true,
      phoneNumber: "+251911223344",
      addressRegion: "Amhara",
      addressZone: "North Shewa",
      addressWoreda: "Debre Berhan",
      addressKebele: "Kebele 04",
      religion: "Orthodox",
      occupation: "Farmer",
      maritalStatus: "Married",
      educationalStatus: "Primary School",
      emergencyContactName: "Tigist Tadesse (Wife)",
      emergencyContactPhone: "+251911556677",
      vitals: {
        create: {
          bp: "155/95",
          pulse: 110,
          rr: 24,
          temp: 36.8,
          spO2: 92.0,
          painLevel: 9,
          weightKg: 72.0,
          heightCm: 175.0,
          bmi: 23.5
        }
      }
    },
    {
      fullName: "Fatuma Ahmed",
      healthId: "MHI-4729-2819",
      nationalId: "209384729102",
      faydaId: "209384729102",
      fcn: "1928374650192837",
      internalId: "FAT-4729",
      age: 28,
      sex: "Female",
      chiefComplaint: "High grade fever, chills, and severe headache for 3 days",
      detailedSituation: "Patient reports sudden onset of high fever accompanied by joint pains and shivering.",
      reasonForVisit: "Acute febrile illness",
      ward: Ward.OPD_OUTPATIENT,
      triageStatus: TriageStatus.YELLOW,
      priorityLevel: PriorityLevel.URGENT,
      emergencyFlag: false,
      phoneNumber: "+251912334455",
      addressRegion: "Oromia",
      addressZone: "East Shewa",
      addressWoreda: "Adama",
      addressKebele: "Kebele 02",
      religion: "Islam",
      occupation: "Teacher",
      maritalStatus: "Single",
      educationalStatus: "University Graduate",
      emergencyContactName: "Ahmed Ibrahim (Father)",
      emergencyContactPhone: "+251912667788",
      vitals: {
        create: {
          bp: "110/70",
          pulse: 98,
          rr: 18,
          temp: 39.1,
          spO2: 97.0,
          painLevel: 5,
          weightKg: 58.0,
          heightCm: 162.0,
          bmi: 22.1
        }
      }
    },
    {
      fullName: "Chala Kebede",
      healthId: "MHI-5829-1029",
      nationalId: "309283740192",
      faydaId: "309283740192",
      fcn: "7392810293847561",
      internalId: "CHA-5829",
      age: 34,
      sex: "Male",
      chiefComplaint: "Chronic dry cough and night sweats for 3 weeks, mild weight loss",
      detailedSituation: "Patient complains of persistent cough that gets worse at night. Has lost about 3kg in the last month.",
      reasonForVisit: "Chronic cough evaluation",
      ward: Ward.MEDICAL_WARD,
      triageStatus: TriageStatus.GREEN,
      priorityLevel: PriorityLevel.ROUTINE,
      emergencyFlag: false,
      phoneNumber: "+251913445566",
      addressRegion: "Oromia",
      addressZone: "West Arsi",
      addressWoreda: "Shashemene",
      addressKebele: "Kebele 08",
      religion: "Protestant",
      occupation: "Merchant",
      maritalStatus: "Married",
      educationalStatus: "High School Graduate",
      emergencyContactName: "Lensa Kebede (Sister)",
      emergencyContactPhone: "+251913778899",
      suspectedDisease: "High Suspect: TB (Tuberculosis)",
      vitals: {
        create: {
          bp: "120/80",
          pulse: 82,
          rr: 16,
          temp: 37.4,
          spO2: 98.0,
          painLevel: 2,
          weightKg: 65.0,
          heightCm: 180.0,
          bmi: 20.1
        }
      }
    },
    {
      fullName: "Tigist Assefa",
      healthId: "MHI-1029-4829",
      nationalId: "409283748102",
      faydaId: "409283748102",
      fcn: "8291038475610293",
      internalId: "TIG-1029",
      age: 19,
      sex: "Female",
      chiefComplaint: "Stomach burning, nausea, and epigastric pain after meals",
      detailedSituation: "Patient reports recurrent burning pain in the upper abdomen, relieved occasionally by food or antacids.",
      reasonForVisit: "Gastrointestinal discomfort",
      ward: Ward.OPD_OUTPATIENT,
      triageStatus: TriageStatus.GREEN,
      priorityLevel: PriorityLevel.ROUTINE,
      emergencyFlag: false,
      phoneNumber: "+251914556677",
      addressRegion: "Addis Ababa",
      addressZone: "Bole Subcity",
      addressWoreda: "Woreda 03",
      addressKebele: "House 402",
      religion: "Orthodox",
      occupation: "Student",
      maritalStatus: "Single",
      educationalStatus: "High School Student",
      emergencyContactName: "Assefa Hailu (Father)",
      emergencyContactPhone: "+251914889900",
      suspectedDisease: "High Suspect: Peptic Ulcer Disease",
      vitals: {
        create: {
          bp: "115/75",
          pulse: 75,
          rr: 16,
          temp: 36.6,
          spO2: 99.0,
          painLevel: 4,
          weightKg: 50.0,
          heightCm: 158.0,
          bmi: 20.0
        }
      }
    }
  ];

  for (const patient of samplePatients) {
    const created = await prisma.patient.create({
      data: patient,
      include: { vitals: true }
    });
    console.log(`Created sample patient: ${created.fullName} (${created.healthId})`);
  }

  // Ensure Dr. Dawit exists
  const existingDoctor = await prisma.user.findUnique({
    where: { email: "dr.dawit@myhealthid.gov.et" }
  });

  if (!existingDoctor) {
    await prisma.user.create({
      data: {
        email: "dr.dawit@myhealthid.gov.et",
        password: "demo-password-hash",
        role: "DOCTOR",
        firstName: "Dawit",
        lastName: "Tadesse",
        professionalLicenseNumber: "MD-2026-ETH",
      }
    });
    console.log("Created demo Doctor user: dr.dawit@myhealthid.gov.et");
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
