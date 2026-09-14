import { PrismaClient } from '@prisma/client'

/**
 * Defensive Prisma client factory.
 *
 * PROBLEM: At build time on Vercel (or any deploy platform), env vars like
 * DATABASE_URL / TURSO_AUTH_TOKEN may not be available — they're often
 * configured per-environment (Production / Preview / Development). When
 * Next.js tries to statically prerender pages, the page's import graph
 * pulls in `@/lib/db`, which previously called `createPrismaClient()` at
 * module top-level. That eagerly initialized @libsql/client's createClient
 * with `url: undefined` (literal string "undefined" via Prisma's
 * env("DATABASE_URL") resolution), throwing:
 *   LibsqlError: URL_INVALID: The URL 'undefined' is not in a valid format
 *
 * FIX:
 * 1. LAZY init — don't create any client at module load. Only create on
 *    first actual query via the Proxy. Build-time prerender never queries,
 *    so no client is ever created at build time.
 * 2. SANITIZE env values — treat literal "undefined" / "null" / "" as missing.
 * 3. FALLBACK — if no valid libsql URL, fall back to a local SQLite file so
 *    the build succeeds. At runtime on Vercel, the real DATABASE_URL will
 *    be set and the libsql adapter will be used.
 * 4. TRY/CATCH — never let a Prisma init failure crash the app.
 * 5. HMR-safe — reuse the same client across dev hot reloads via globalThis.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaInitError?: string
}

function sanitizeEnv(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Treat literal "undefined" / "null" / "false" strings as missing —
  // Vercel/Next.js sometimes leaves these as values when env vars are
  // partially configured.
  if (trimmed === 'undefined' || trimmed === 'null' || trimmed === 'false' || trimmed === 'none') {
    return null;
  }
  return trimmed;
}

function createPrismaClient(): PrismaClient {
  const url = sanitizeEnv(process.env.DATABASE_URL) || sanitizeEnv(process.env.TURSO_DATABASE_URL);
  const authToken = sanitizeEnv(process.env.TURSO_AUTH_TOKEN);

  // If using Turso (libsql:// URL), use the adapter
  if (url && url.startsWith('libsql://')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaLibSql } = require('@prisma/adapter-libsql');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@libsql/client');
      const libsql = createClient({ url, authToken: authToken || undefined });
      const adapter = new PrismaLibSql(libsql);
      return new PrismaClient({ adapter });
    } catch (e) {
      console.error('[db] Failed to init libsql adapter, falling back to SQLite:', e);
      globalForPrisma.__prismaInitError = String(e);
    }
  }

  // Fallback — local SQLite file. Use a path that works at build time
  // even if no DATABASE_URL is configured.
  try {
    return new PrismaClient({
      log: ['error', 'warn'],
      datasources: { db: { url: 'file:./db/custom.db' } },
    } as ConstructorParameters<typeof PrismaClient>[0]);
  } catch {
    // Last-resort: plain PrismaClient (will use schema's env("DATABASE_URL"))
    return new PrismaClient({ log: ['error', 'warn'] });
  }
}

/**
 * Lazy getter — only creates the Prisma client on first access.
 * During `bun run build` (static prerender), this is never called,
 * so no libsql client is ever created at build time.
 */
function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Proxy that defers client creation until first method call.
 * Allows the module to be safely imported at build time without
 * triggering any DB connection.
 *
 * Method calls are auto-bound to the underlying client so `this` context
 * is preserved (important for Prisma's internal query methods).
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getDb();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
}) as PrismaClient;
