# MyHealthID Platform - Full-Stack Architecture & Design Document

## Executive Summary

This document outlines the comprehensive architecture for MyHealthID, a multi-tenant healthcare platform with:
- **Role-based access control** (21+ healthcare professional roles)
- **Bilingual UI** (English & Amharic)
- **Multi-facility isolation** (strict data compartmentalization)
- **Patient appointment routing** (facility-specific booking)
- **Hierarchical facility classification** (ownership & type tiers)

---

## Part 1: Database Schema Design

### 1.1 Core Data Models Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Organization (Facility) ──┐                                    │
│  ├── Facility Metadata     │                                    │
│  ├── Classification        │  ┌──── User (Healthcare Pro)      │
│  ├── Ownership Type        │  │     ├── Role                   │
│  └── Service Type          │  │     ├── License                │
│                            │  │     └── Facility Assignment    │
│                            ├──┤                                 │
│  Patient ◄─────────────────┤  └──── Appointment                │
│  ├── Health ID             │        ├── Target Facility        │
│  ├── Bio Data              │        ├── Appointment Status    │
│  ├── Medical Records       │        └── Isolation: OrgId       │
│  └── Facility Registration │                                    │
│      (Multi-Facility Join) │                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

KEY PRINCIPLE: organizationId is the primary isolation key across all queries
```

### 1.2 Enhanced Prisma Schema

#### A. Healthcare Professional Roles Enum

```prisma
enum HealthcareProfessionalRole {
  // Clinical Roles
  GENERAL_PRACTITIONER          // አጠቃላይ ሐኪም
  MEDICAL_SPECIALIST            // ስፔሻሊስት ሐኪም
  SUB_SPECIALIST                // ሰብ-ስፔሪያሊስት ሐኪም
  CLINICAL_NURSE                // ክሊኒካል ነርስ
  SPECIALIZED_NURSE             // ልዩ ነርስ
  MIDWIFE                        // ወሊድ ባለሙያ
  HEALTH_EXTENSION_WORKER        // የጤና ኤክስቴንሽን ባለሙያ
  
  // Diagnostic & Laboratory
  LABORATORY_TECHNICIAN         // የላቦራቶሪ ቴክኒሻን
  LABORATORY_TECHNOLOGIST       // የላቦራቶሪ ቴክኖሎጂስት
  RADIOGRAPHER                  // የራጅ ባለሙያ
  
  // Specialized Clinical
  ANESTHETIST                    // ማደንዘዣ ባለሙያ
  HEALTH_OFFICER                // ጤና መኮንን
  IESO                           // Integrated Emergency Surgical Officer
  
  // Pharmacy & Medicines
  PHARMACIST                     // ፋርማሲስት
  
  // Administrative & Support
  HOSPITAL_MANAGER              // ሆስፒታል ስራ አስኪያጅ
  HIS_ADMINISTRATOR             // የጤና መረጃ ስርዓት (አይቲ) ባለሙያ
  RECEPTIONIST                   // አስተናጋጅ
  CARD_ROOM_CLERK               // የካርድ ክፍል ሰራተኛ
  FINANCE_OFFICER               // ሂሳብ ክፍያ
  
  // Support Staff
  AMBULANCE_DRIVER              // የአምቡላንስ አሽከርካሪ
  SECURITY_GUARD                // የጥበቃ ሰራተኛ
  CLEANER                        // የፅዳት ሰራተኛ
}
```

#### B. Facility Classification Enums

```prisma
enum FacilityOwnershipType {
  PUBLIC                 // የመንግስት
  PRIVATE                // የግል
}

enum FacilityServiceType {
  PHCU                            // Primary Health Care Unit
  HEALTH_POST                     // ጤና ኬላ
  HEALTH_CENTER                   // ጤና ጣቢያ
  PRIMARY_HOSPITAL                // የመጀመሪያ ደረጃ ሆስፒታል
  GENERAL_HOSPITAL                // አጠቃላይ ሆስፒታል
  SPECIALIZED_HOSPITAL            // ልዩ ሆስፒታል
  REFERRAL_HOSPITAL               // ሪፈራል ሆስፒታል
  PRIMARY_CLINIC                  // መካከለኛ ክሊኒክ
  SPECIALTY_CLINIC                // ልዩ ክሊኒክ
}
```

#### C. Location Hierarchy Model

```prisma
model Location {
  id            String   @id @default(uuid()) @map("_id")
  
  // Hierarchical structure
  region        String   // e.g., "Addis Ababa" / "አዲስ አበባ"
  zone          String?  // e.g., "Zone 5"
  woreda        String   // e.g., "Gulele"
  kebele        String?  // e.g., "Kebele 5"
  
  // Full hierarchy for fast querying
  hierarchyPath String   // e.g., "Addis Ababa/Zone5/Gulele/Kebele5"
  
  // Reference data
  organizationId String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### D. Organization (Facility) Model

```prisma
model Organization {
  id                String   @id @default(uuid()) @map("_id")
  
  // ─── Basic Identity ───
  name              String   @unique                    // e.g., "Debre Berhan Referral Hospital"
  nameLng           BilingualContent                    // Bilingual reference
  code              String   @unique                    // Hospital code: MH-{REGION}-{FACILITY}-{UUID}
  registrationId    String   @unique                    // Unique registration identifier
  
  // ─── Classification ───
  ownershipType     FacilityOwnershipType               // PUBLIC / PRIVATE
  serviceType       FacilityServiceType                 // Hospital, Clinic, PHCU, etc.
  
  // ─── Contact & Location ───
  email             String?
  phone             String?
  website           String?
  location          Location?
  longitude         Float?
  latitude          Float?
  
  // ─── Registration Status ───
  isActive          Boolean  @default(true)
  isVerified        Boolean  @default(false)
  verificationCode  String?
  registeredAt      DateTime @default(now())
  
  // ─── Multi-Tenant Isolation ───
  // All foreign keys MUST filter by organizationId
  
  // Relations
  users             User[]
  patients          Patient[]
  appointments      Appointment[]
  services          Service[]
  departments       Department[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([code])
  @@index([registrationId])
  @@index([isActive, isVerified])
}
```

#### E. Bilingual Content Helper

```prisma
type BilingualContent {
  en String
  am String
}
```

#### F. Enhanced User Model

```prisma
model User {
  id                String   @id @default(uuid()) @map("_id")
  
  // ─── Authentication ───
  emailOrUsername   String   @unique
  email             String?  @unique
  passwordHash      String
  
  // ─── Professional Identity ───
  firstName         String
  lastName          String
  fullName          String
  
  // ─── Role & Credentials ───
  role              HealthcareProfessionalRole
  professionalLicenseNumber String? @unique
  licenseExpiry     DateTime?
  specialization    String?                           // e.g., "Cardiology"
  
  // ─── Facility Assignment ───
  organizationId    String   @map("organization_id")
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // ─── Additional Profile ───
  nationalId        String?  @unique
  phoneNumber       String?
  profilePhotoUrl   String?
  
  // ─── Permissions & Status ───
  isActive          Boolean  @default(true)
  canApproveAccounts Boolean @default(false)         // For admin roles
  canManageUsers    Boolean  @default(false)
  
  // ─── Audit Trail ───
  lastLoginAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  createdAppointments Appointment[] @relation("createdBy")
  handledAppointments Appointment[] @relation("handledBy")
  
  @@index([organizationId])
  @@index([role, organizationId])
  @@index([isActive, organizationId])
}
```

#### G. Patient Model (Enhanced)

```prisma
model Patient {
  id                String   @id @default(uuid()) @map("_id")
  
  // ─── Health ID & Identification ───
  healthId          String   @unique                 // MyHealthID Unique Identifier
  nationalId        String?  @unique
  mrn               String?                          // Per-facility MRN
  
  // ─── Demographics ───
  firstName         String
  lastName          String
  fullName          String
  dateOfBirth       DateTime?
  age               Int
  sex               String                           // M / F / Other
  bloodGroup        String?
  
  // ─── Contact ───
  phoneNumber       String?
  email             String?
  
  // ─── Address (Hierarchical) ───
  region            String
  zone              String?
  woreda            String
  kebele            String?
  
  // ─── Medical Background ───
  allergyInformation    String?
  preExistingConditions String?
  familyHistory         String?
  surgicalHistory       String?
  
  // ─── Multi-Facility Registration ───
  // A patient can be registered at multiple facilities
  facilitiesRegistered FacilityPatientJoin[]
  
  // Primary facility (most recent or active)
  primaryOrganizationId String?
  
  // ─── Status ───
  isActive          Boolean  @default(true)
  isRestricted      Boolean  @default(false)
  emergencyFlag     Boolean  @default(false)
  
  // ─── Audit ───
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  appointments      Appointment[]
  medicalRecords    MedicalRecord[]
  
  @@index([healthId])
  @@index([nationalId])
  @@index([primaryOrganizationId])
}
```

#### H. Multi-Facility Patient Registration Join

```prisma
model FacilityPatientJoin {
  id                String   @id @default(uuid()) @map("_id")
  
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])
  
  patientId         String
  patient           Patient @relation(fields: [patientId], references: [id])
  
  // Facility-specific patient data
  facilityMrn       String?                          // Hospital-specific MRN
  isActive          Boolean  @default(true)
  registrationDate  DateTime @default(now())
  
  createdAt         DateTime @default(now())
  
  @@unique([organizationId, patientId])
  @@index([organizationId, patientId])
}
```

#### I. Appointment Model (Strict Isolation)

```prisma
model Appointment {
  id                String   @id @default(uuid()) @map("_id")
  
  // ─── Isolation Key ───
  organizationId    String   @map("organization_id")                    // PRIMARY FILTER
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // ─── Patient Info ───
  patientId         String
  patient           Patient @relation(fields: [patientId], references: [id])
  patientHealthId   String                           // Denormalized for quick lookup
  
  // ─── Appointment Details ───
  appointmentType   String                           // e.g., "General Consultation", "Lab Test"
  requestedService  String                           // Department/Service
  appointmentDate   DateTime
  appointmentTime   String                           // HH:mm format
  duration          Int?                             // Minutes
  
  // ─── Status & Workflow ───
  status            AppointmentStatus @default(PENDING)
  priority          AppointmentPriority @default(NORMAL)
  notes             String?
  
  // ─── Assignment ───
  createdById       String?                          // Who created it
  createdBy         User? @relation("createdBy", fields: [createdById], references: [id])
  
  handledById       String?                          // Who approved/handled it
  handledBy         User? @relation("handledBy", fields: [handledById], references: [id])
  
  handledAt         DateTime?
  
  // ─── Audit ───
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([organizationId, patientId])
  @@index([organizationId, status])
  @@index([organizationId, appointmentDate])
  
  // CRITICAL: All queries MUST include organizationId filter
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum AppointmentPriority {
  ROUTINE
  URGENT
  EMERGENCY
}
```

#### J. Medical Records (Isolated)

```prisma
model MedicalRecord {
  id                String   @id @default(uuid()) @map("_id")
  
  // ─── Isolation Key ───
  organizationId    String                           // PRIMARY FILTER
  
  // ─── Record Info ───
  patientId         String
  patient           Patient @relation(fields: [patientId], references: [id])
  
  recordType        String                           // "Consultation", "Lab Result", "Prescription"
  title             String
  content           String                           // Rich text or JSON
  
  // ─── Clinical Data ───
  recordedBy        String?                          // Provider name
  recordedAt        DateTime @default(now())
  
  @@index([organizationId, patientId])
  @@index([organizationId, recordType])
}
```

#### K. Services & Departments

```prisma
model Department {
  id                String   @id @default(uuid()) @map("_id")
  
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])
  
  name              String
  nameLng           BilingualContent
  description       String?
  
  isActive          Boolean  @default(true)
  
  @@unique([organizationId, name])
  @@index([organizationId])
}

model Service {
  id                String   @id @default(uuid()) @map("_id")
  
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])
  
  name              String
  nameLng           BilingualContent
  description       String?
  serviceCode       String
  
  isActive          Boolean  @default(true)
  
  @@unique([organizationId, serviceCode])
  @@index([organizationId])
}
```

---

## Part 2: Bilingual Content Strategy

### 2.1 Architecture Decision: Hybrid Approach

#### Option 1: Database Native (RECOMMENDED FOR THIS SYSTEM)
```
❌ Single field per language: Doubles field count, harder to maintain
✅ Structured type (BilingualContent): Type-safe, schema-enforced consistency
```

#### Option 2: i18n JSON Files
```
✅ Better for: UI labels, buttons, error messages (constant strings)
❌ Not suitable for: Dynamic content (facility names, role descriptions, patient data)
```

### 2.2 Recommended Strategy: HYBRID

**Use Case Distribution:**

| Content Type | Storage | Approach | Example |
|---|---|---|---|
| Static UI Labels | i18n JSON | `next-i18next` | "Login", "Dashboard", "Add Patient" |
| Dynamic Content | Database | `BilingualContent` type | Facility names, Department names |
| User-Generated | Database | `BilingualContent` type | Appointment notes |
| Role Descriptions | i18n JSON | Constant lookup | "General Practitioner" / "አጠቃላይ ሐኪም" |
| Enums | i18n JSON + Database | Map enum to translation keys | `FacilityServiceType.PRIMARY_HOSPITAL` |

### 2.3 Implementation Pattern

#### A. Enum Translation File (lib/locales/enums.ts)

```typescript
// lib/locales/enums.ts
export const HEALTHCARE_ROLES = {
  GENERAL_PRACTITIONER: {
    en: "General Practitioner (GP/Medical Doctor)",
    am: "አጠቃላይ ሐኪም",
  },
  CLINICAL_NURSE: {
    en: "Clinical Nurse",
    am: "ክሊኒካል ነርስ",
  },
  MIDWIFE: {
    en: "Midwife",
    am: "ወሊድ ባለሙያ",
  },
  // ... 21+ roles
};

export const FACILITY_SERVICE_TYPES = {
  PRIMARY_HOSPITAL: {
    en: "Primary Hospital",
    am: "የመጀመሪያ ደረጃ ሆስፒታል",
  },
  GENERAL_HOSPITAL: {
    en: "General Hospital",
    am: "አጠቃላይ ሆስፒታል",
  },
  HEALTH_CENTER: {
    en: "Health Center",
    am: "ጤና ጣቢያ",
  },
  // ... all 9 types
};

export const FACILITY_OWNERSHIP = {
  PUBLIC: {
    en: "Public",
    am: "የመንግስት",
  },
  PRIVATE: {
    en: "Private",
    am: "የግል",
  },
};
```

#### B. Translation Helper Function

```typescript
// lib/locales/getTranslation.ts
export function getTranslation(
  type: "role" | "facilityType" | "ownership",
  key: string,
  lang: "en" | "am" = "en"
): string {
  const dictionaries = {
    role: HEALTHCARE_ROLES,
    facilityType: FACILITY_SERVICE_TYPES,
    ownership: FACILITY_OWNERSHIP,
  };

  const dict = dictionaries[type];
  return dict[key]?.[lang] || key;
}
```

#### C. Database Usage in Components

```typescript
// Example: Display facility info with bilingual support
function FacilityCard({ facility, lang }: { facility: Organization; lang: "en" | "am" }) {
  const ownershipLabel = getTranslation("ownership", facility.ownershipType, lang);
  const serviceTypeLabel = getTranslation("facilityType", facility.serviceType, lang);

  return (
    <div>
      <h2>{lang === "en" ? facility.nameLng.en : facility.nameLng.am}</h2>
      <p>{ownershipLabel}</p>
      <p>{serviceTypeLabel}</p>
    </div>
  );
}
```

---

## Part 3: Multi-Tenant Data Isolation Strategy

### 3.1 Isolation Principles

```sql
-- ALL queries must include organizationId filter
-- Pattern:
SELECT * FROM table 
WHERE organizationId = ? 
AND additionalFilters...
```

### 3.2 Query Pattern Guards

#### A. Server Action Pattern (Recommended)

```typescript
// lib/actions/appointment.actions.ts
import { getOrgId } from "@/lib/auth-utils";

export async function createAppointment(data: AppointmentInput) {
  // STEP 1: Get organizationId from session/cookies
  const orgId = getOrgId();
  if (!orgId) throw new Error("Unauthorized");

  // STEP 2: Verify patient belongs to this org
  const patient = await prisma.patient.findUnique({
    where: { id: data.patientId },
  });
  
  if (patient?.primaryOrganizationId !== orgId) {
    throw new Error("Patient not registered at this facility");
  }

  // STEP 3: Create appointment with orgId
  return prisma.appointment.create({
    data: {
      organizationId: orgId,  // MANDATORY
      patientId: data.patientId,
      appointmentDate: data.appointmentDate,
      // ... other fields
    },
  });
}
```

#### B. Middleware Pattern (Verify at Edge)

```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  const orgId = req.cookies.get("organizationId")?.value;
  const role = req.cookies.get("userRole")?.value;

  // Verify orgId exists
  if (!orgId && !publicRoutes.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verify role has access to route
  if (!hasAccess(role, req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}
```

### 3.3 Database-Level Constraints

```prisma
// Enforce at schema level
model Appointment {
  organizationId String  // No @default, must be set explicitly
  
  // Add unique constraint per org
  @@unique([organizationId, id])
  @@index([organizationId, patientId])
}
```

---

## Part 4: API Endpoint Architecture

### 4.1 Appointment API (Example)

```typescript
// app/api/appointments/route.ts

// GET /api/appointments?status=pending&date=2026-06-01
export async function GET(req: Request) {
  const orgId = req.headers.get("x-organization-id");  // From middleware
  const { searchParams } = new URL(req.url);
  
  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: orgId,  // ← ALWAYS filter
      status: searchParams.get("status") ?? undefined,
    },
    include: { patient: true, handledBy: true },
  });

  return Response.json(appointments);
}

// POST /api/appointments
export async function POST(req: Request) {
  const orgId = req.headers.get("x-organization-id");
  const data = await req.json();

  // Validate patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: {
      id: data.patientId,
      facilitiesRegistered: {
        some: { organizationId: orgId },
      },
    },
  });

  if (!patient) {
    return Response.json(
      { error: "Patient not found in this facility" },
      { status: 404 }
    );
  }

  const appointment = await prisma.appointment.create({
    data: {
      organizationId: orgId,  // ← Force isolation
      patientId: data.patientId,
      appointmentDate: data.appointmentDate,
      appointmentType: data.appointmentType,
      requestedService: data.requestedService,
      status: "PENDING",
    },
  });

  return Response.json(appointment, { status: 201 });
}
```

### 4.2 Facility Directory API (Patient Portal)

```typescript
// app/api/facilities/search/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region");
  const zone = searchParams.get("zone");
  const woreda = searchParams.get("woreda");
  const ownership = searchParams.get("ownership");
  const serviceType = searchParams.get("serviceType");

  // CRITICAL: Only return REGISTERED & ACTIVE facilities
  const facilities = await prisma.organization.findMany({
    where: {
      isActive: true,
      isVerified: true,  // ← Only verified
      location: {
        region: region ?? undefined,
        zone: zone ?? undefined,
        woreda: woreda ?? undefined,
      },
      ownershipType: ownership ?? undefined,
      serviceType: serviceType ?? undefined,
    },
    select: {
      id: true,
      nameLng: true,
      code: true,
      ownershipType: true,
      serviceType: true,
      phone: true,
      email: true,
      location: true,
    },
  });

  return Response.json(facilities);
}
```

---

## Part 5: UI Component Structure

### 5.1 Login Component (Bilingual)

```typescript
// app/login/page.tsx
export default function LoginPage() {
  const [language, setLanguage] = useState<"en" | "am">("en");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <button onClick={() => setLanguage("en")} className={language === "en" ? "font-bold" : ""}>
          English
        </button>
        <button onClick={() => setLanguage("am")} className={language === "am" ? "font-bold" : ""}>
          አማርኛ
        </button>
      </div>

      {/* Login Form */}
      <Card>
        <CardTitle>
          {language === "en" ? "MyHealthID Staff Login" : "MyHealthID ሰራተኛ ግባ"}
        </CardTitle>
        
        <FormField label={language === "en" ? "Facility Code" : "የሆስፒታል ኮድ"} />
        <FormField label={language === "en" ? "Email or Username" : "ኢሜይል ወይም ተጠቃሚ ስም"} />
        <FormField label={language === "en" ? "Password" : "የሚስጥር ቃል"} />
      </Card>
    </div>
  );
}
```

### 5.2 Appointment Booking Component

```typescript
// components/AppointmentBooking.tsx
export function AppointmentBooking({ patientId }: { patientId: string }) {
  const [step, setStep] = useState<"facility" | "details">("facility");
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

  if (step === "facility") {
    return (
      <FacilityDirectory
        onSelect={(facility) => {
          setSelectedFacility(facility.id);
          setStep("details");
        }}
      />
    );
  }

  return (
    <AppointmentDetails
      patientId={patientId}
      facilityId={selectedFacility!}
      onSubmit={async (data) => {
        // Submission is isolated to selectedFacility (organizationId)
        await createAppointment({
          ...data,
          patientId,
          organizationId: selectedFacility,  // Enforced isolation
        });
      }}
    />
  );
}
```

---

## Part 6: Security & Validation

### 6.1 Input Validation

```typescript
// lib/validation/appointment.ts
import { z } from "zod";

export const appointmentSchema = z.object({
  patientHealthId: z.string().min(1, "Patient ID required"),
  appointmentDate: z.date().min(new Date(), "Date must be in future"),
  appointmentType: z.string().min(3, "Type required"),
  requestedService: z.string().min(1, "Service required"),
});
```

### 6.2 Authorization Guards

```typescript
// lib/auth-guards.ts
export async function assertUserOrgAccess(
  userId: string,
  organizationId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user?.organizationId !== organizationId) {
    throw new Error("Unauthorized: User does not belong to this organization");
  }
}

export async function assertPatientOrgAccess(
  patientId: string,
  organizationId: string
): Promise<void> {
  const registration = await prisma.facilityPatientJoin.findUnique({
    where: {
      organizationId_patientId: {
        organizationId,
        patientId,
      },
    },
  });

  if (!registration) {
    throw new Error("Unauthorized: Patient not registered at this facility");
  }
}
```

---

## Part 7: Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)
- [ ] Update Prisma schema with all models
- [ ] Create TypeScript types
- [ ] Set up Zod validation schemas
- [ ] Implement auth guards & middleware

### Phase 2: Bilingual Support (Weeks 2-3)
- [ ] Create enum translation files
- [ ] Implement i18n configuration
- [ ] Build language toggle component
- [ ] Update all UI components

### Phase 3: Healthcare Professional Roles (Week 3)
- [ ] Migrate Role enum (6 → 21 roles)
- [ ] Update permission matrix
- [ ] Create role-specific dashboards
- [ ] Implement role-based sidebar navigation

### Phase 4: Facility Management (Weeks 4-5)
- [ ] Facility registration flow
- [ ] Classification tier assignment
- [ ] Multi-facility patient joins
- [ ] Facility directory search

### Phase 5: Appointment System (Weeks 5-6)
- [ ] Appointment booking UI
- [ ] Status workflow engine
- [ ] Notification system
- [ ] Appointment analytics

### Phase 6: Testing & Hardening (Week 7)
- [ ] Multi-tenant isolation tests
- [ ] Permission matrix validation
- [ ] Data breach simulation
- [ ] Load testing

---

## Part 8: Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 + React | Server-side rendering, SSR |
| **Styling** | Tailwind CSS + shadcn/ui | Responsive, accessible UI |
| **Type Safety** | TypeScript + Zod | Runtime validation |
| **State** | Server Actions | Form submissions, mutations |
| **Localization** | next-i18next | i18n for static labels |
| **Database** | MongoDB + Prisma | Multi-tenant ORM |
| **Authentication** | Next.js Cookies + Middleware | Session management |
| **Validation** | Middleware + Guards | Authorization enforcement |

---

## Document Version

- **Version**: 1.0
- **Last Updated**: May 31, 2026
- **Status**: Architecture Review Complete - Ready for Implementation
- **Next Phase**: Prisma Schema Migration
