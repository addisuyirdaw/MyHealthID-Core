import { PrismaClient } from "@prisma/client";

// 1. Define the singleton function with an explicit return type
const prismaClientSingleton = (): PrismaClient => {
    return new PrismaClient();
};

// 2. Setup the global type for the server
declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

// Force clear cache so new models reflect
if (process.env.NODE_ENV !== "production") delete globalThis.prisma;

// 3. Create or reuse the instance
const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

// 4. In development, save the instance to the global object
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;