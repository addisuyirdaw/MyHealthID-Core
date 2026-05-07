import { PrismaClient } from "@prisma/client";

// Connection timeout: 5 s — fail fast instead of hanging for 30 s when Atlas
// is unreachable (e.g. IP not whitelisted or cluster is paused).
const CONNECT_TIMEOUT_MS = 5_000;
const SOCKET_TIMEOUT_MS  = 8_000;

const prismaClientSingleton = (): PrismaClient => {
    return new PrismaClient({
        datasources: {
            db: {
                url: `${process.env.DATABASE_URL}&connectTimeoutMS=${CONNECT_TIMEOUT_MS}&socketTimeoutMS=${SOCKET_TIMEOUT_MS}&serverSelectionTimeoutMS=${CONNECT_TIMEOUT_MS}`,
            },
        },
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
};

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

// 3. Create or reuse the singleton instance
const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

// 4. In development, save the instance to the global object to survive hot-reloads
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;