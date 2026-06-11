import { PrismaClient } from '@prisma/client';

const url1 = "mongodb+srv://myhealthid2_db_user:Addi123%23@cluster0.jpr7vag.mongodb.net/MyHealthID?retryWrites=true&w=majority&appName=Cluster0";
const url2 = "mongodb+srv://myhealthid_prod:AddisHealth2025DB@cluster0.jpr7vag.mongodb.net/MyHealthID?retryWrites=true&w=majority";

async function test(label, url) {
  console.log(`Testing ${label}...`);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });
  try {
    const count = await prisma.patient.count();
    console.log(`✅ ${label} connected successfully! Patient count: ${count}`);
    return true;
  } catch (err) {
    console.error(`❌ ${label} failed:`, err.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await test("URL 1 (myhealthid2_db_user)", url1);
  await test("URL 2 (myhealthid_prod)", url2);
}

main();
