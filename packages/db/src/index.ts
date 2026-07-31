import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
    prismaClient?: PrismaClient;
};

export const prismaClient = globalForPrisma.prismaClient ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaClient = prismaClient;
}

export type { PrismaClient } from "@prisma/client";