import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log('Prisma client initialized with adapter:', !!prisma);
