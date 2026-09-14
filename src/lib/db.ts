import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;

  // If using Turso (libsql:// URL), use the adapter
  if (url && url.startsWith('libsql://')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaLibSql } = require('@prisma/adapter-libsql');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@libsql/client');
      const authToken = process.env.TURSO_AUTH_TOKEN;
      const libsql = createClient({ url, authToken });
      const adapter = new PrismaLibSql(libsql);
      return new PrismaClient({ adapter });
    } catch (e) {
      console.error('Failed to init libsql adapter, falling back:', e);
    }
  }

  // Fallback to default — works with local SQLite or when env not set yet
  return new PrismaClient({ log: ['error', 'warn'] })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
