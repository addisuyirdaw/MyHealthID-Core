# 🏥 MyHealthID-Core

> A comprehensive healthcare clinic management system built with Next.js 14, TypeScript, and Prisma ORM.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

---

## 🚀 Blueprint Hackathon Edition (July 2026 Release)

This release packages the core features of the MyHealthID platform optimized for the Blueprint Hackathon:

* **💳 Localized Healthcare Payment Gateway**: Fully integrated **Chapa Payment Gateway** to handle secure clinic billing, client consultations, and mobile transactions.
* **🧠 Grounded AI Clinical Assistant**: A live AI-powered patient summary and command widget integrated into the Doctor Dashboard header, leveraging **Gemini 1.5 Flash** with context-aware clinical data streaming.
* **🔒 Multi-Tenant Role-Based Isolation**: Enhanced data boundaries and strict tenant isolation rules, along with clinical onboarding and appointment intake wizard routing fixes.

---

## 📋 Table of Contents

- [Blueprint Hackathon Edition (July 2026 Release)](#-blueprint-hackathon-edition-july-2026-release)
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Available Scripts](#available-scripts)
- [Portals](#portals)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

**MyHealthID-Core** is a full-stack healthcare management platform designed to streamline operations across a clinic or hospital. It provides role-based portals for doctors, patients, pharmacists, lab technicians, triage nurses, and administrators — all in one unified system.

Patients are identified using a unique **Health ID**, which can be scanned via **QR code** or read using **OCR (optical character recognition)**, making the system fast and paperless.

---

## ✨ Features

- 🧑‍⚕️ **Doctor Portal** — View patient records, write prescriptions, request lab tests
- 👤 **Patient Portal** — Access personal health records and visit history
- 💊 **Pharmacy Portal** — Manage and dispense prescriptions
- 🔬 **Laboratory Portal** — Receive and record investigation results
- 🩺 **Triage Portal** — Record vital signs and assess patient urgency
- 📋 **Screening Portal** — Initial patient screening and registration
- 📊 **Admin Dashboard** — System-wide management and reporting
- 🔢 **Queue Management** — Real-time patient queue tracking
- 📷 **QR & OCR Scanning** — Instant patient identification
- 📧 **Email Notifications** — Automated email support via Nodemailer
- 📈 **Charts & Analytics** — Visual data with Recharts

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 14** (App Router) | Full-stack React framework |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Prisma ORM** | Database access and migrations |
| **React + Radix UI** | UI components |
| **Recharts** | Data visualization |
| **html5-qrcode / jsqr** | QR code scanning |
| **Tesseract.js** | OCR — reading text from images |
| **Nodemailer** | Email sending |

---

## 📁 Project Structure

```
MyHealthID-Core-main/
├── app/                    # Next.js App Router pages & routes
│   ├── admin/              # Admin dashboard
│   ├── doctor/             # Doctor portal
│   ├── patient/            # Patient portal
│   ├── pharmacy/           # Pharmacy portal
│   ├── laboratory/         # Lab portal
│   ├── triage/             # Triage portal
│   ├── screening/          # Screening portal
│   └── queue/              # Queue management
├── components/             # Shared UI components
├── lib/                    # Utilities: AI, Prisma client, OCR, QR
├── prisma/                 # Database schema & migrations
│   └── schema.prisma
├── scripts/                # Helper/utility scripts
├── .env.example            # Example environment variables
├── middleware.ts           # Route protection middleware
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- A **PostgreSQL** (or compatible) database

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-username/MyHealthID-Core.git
cd MyHealthID-Core
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
```

Then fill in the required values (see [Environment Variables](#environment-variables)).

4. **Generate Prisma client**

```bash
npx prisma generate
```

5. **Apply the database schema**

```bash
npx prisma db push
```

6. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 🎉

---

## 🔐 Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myhealthid"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Email (Nodemailer)
EMAIL_HOST="smtp.example.com"
EMAIL_PORT=587
EMAIL_USER="your@email.com"
EMAIL_PASS="your-email-password"
```

> ⚠️ **Never commit your `.env` or `.env.local` files to GitHub.** They are already listed in `.gitignore`.

---

## 🗄️ Database Setup

This project uses **Prisma ORM**. The schema is defined in `prisma/schema.prisma`.

```bash
# Generate the Prisma client after schema changes
npx prisma generate

# Push schema to the database (development)
npx prisma db push

# Run migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |

---

## 🏥 Portals

| Portal | Route | Description |
|---|---|---|
| Admin | `/admin` | System administration |
| Doctor | `/doctor` | Clinical workflows |
| Patient | `/patient` | Patient self-service |
| Pharmacy | `/pharmacy` | Prescription management |
| Laboratory | `/laboratory` | Lab results & tests |
| Triage | `/triage` | Vitals & urgency triage |
| Screening | `/screening` | Initial registration |
| Queue | `/queue` | Real-time queue board |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m "Add your feature"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a **Pull Request**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Made with ❤️ for better healthcare
</div>
