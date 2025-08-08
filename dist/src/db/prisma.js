import { PrismaClient } from '@prisma/client';
import { config } from '../config/env.js';
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
if (config.nodeEnv !== 'production')
    globalForPrisma.prisma = prisma;
