"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prismaClientSingleton = () => {
    return new client_1.PrismaClient();
};
// eslint-disable-next-line
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();
exports.default = prisma;
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = prisma;
