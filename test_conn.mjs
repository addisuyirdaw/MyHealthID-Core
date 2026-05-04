import { MongoClient } from "mongodb";
import { readFileSync } from "fs";

// Parse .env manually
const envFile = readFileSync(".env", "utf-8");
const match = envFile.match(/DATABASE_URL="(.+)"/);
const url = match?.[1];

console.log("Testing URL:", url?.replace(/:([^@]+)@/, ":***@"));

const client = new MongoClient(url);

try {
  await client.connect();
  const db = client.db();
  const collections = await db.listCollections().toArray();
  console.log("✅ Connected successfully!");
  console.log("Collections:", collections.map(c => c.name));
} catch (err) {
  console.error("❌ Connection failed:", err.message);
} finally {
  await client.close();
}
