const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__svtPrisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__svtPrisma = prisma;
}

module.exports = { prisma };
