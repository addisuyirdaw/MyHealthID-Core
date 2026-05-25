import { PrismaClient } from "@prisma/client";

// Connection timeout: 5 s — fail fast instead of hanging for 30 s when Atlas
// is unreachable (e.g. IP not whitelisted or cluster is paused).
const CONNECT_TIMEOUT_MS = 5_000;
const SOCKET_TIMEOUT_MS = 8_000;

/** Append timeout query params using `?` or `&` so the URL stays valid for MongoDB. */
function buildDatasourceUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      'DATABASE_URL is not set. Add a value to `.env` or `.env.local` in the project root (must start with "mongodb://" or "mongodb+srv://").'
    );
  }
  if (!raw.startsWith("mongodb://") && !raw.startsWith("mongodb+srv://")) {
    throw new Error(
      'DATABASE_URL must start with "mongodb://" or "mongodb+srv://". Prisma MongoDB does not accept other providers.'
    );
  }
  const joiner = raw.includes("?") ? "&" : "?";
  return `${raw}${joiner}connectTimeoutMS=${CONNECT_TIMEOUT_MS}&socketTimeoutMS=${SOCKET_TIMEOUT_MS}&serverSelectionTimeoutMS=${CONNECT_TIMEOUT_MS}`;
}

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    datasources: {
      db: {
        url: buildDatasourceUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
