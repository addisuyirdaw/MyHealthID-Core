# MyHealthID-Core

## Overview

This repository is a Next.js 14 application built with TypeScript, Tailwind CSS, Prisma, and React.
It appears to be a healthcare/clinic management system with routes for admin, doctors, patients, pharmacy, laboratory, triage, screening, queue management, and QR/AI scanning.

## Key technologies

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- React + Radix UI
- Recharts for charts
- QR and OCR: `html5-qrcode`, `jsqr`, `qrcode-reader`, `tesseract.js`
- Email support via `nodemailer`

## Folder structure

- `app/` — application routes and pages
- `components/` — UI and shared components
- `lib/` — helper modules, AI, Prisma client, OCR/QR utilities
- `prisma/` — database schema and migrations
- `scripts/` — utility scripts

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

- Copy `.env.example` to `.env` or `.env.local`
- Provide values for database connection, authentication, and third-party services

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Apply database schema (migration or push):

```bash
npx prisma db push
```

5. Run the dev server:

```bash
npm run dev
```

## Available scripts

- `npm run dev` — start development server
- `npm run build` — build production app
- `npm run start` — start Next production server
- `npm run lint` — run Next/Eslint checks

## Notes

- The root project is the active application.
- There is a nested `MyHealthID-Core/` folder inside the repository that appears to duplicate the root application files. It is likely an obsolete backup or copied workspace and should be reviewed before removing.
- `.env`, `.env.local`, `node_modules`, `.next`, and build artifacts are already ignored in `.gitignore`.

## Recommended next steps

- Review the nested `MyHealthID-Core/` folder before deleting it.
- Add a project-specific README section for required environment variables and deployment details.
- Consider adding tests for critical behavior.
