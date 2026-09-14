import { PrismaClient } from '@prisma/client'

/**
 * Prisma client with @prisma/adapter-libsql (Turso) — lazy + guarded.
 *
 * DESIGN GOALS:
 * 1. BUILD-SAFE: Never create a Prisma/libsql client at module top-level.
 *    The root layout imports pages that import `db`, so if we created the
 *    client eagerly, it would crash `bun run build` when env vars aren't
 *    set at build time. The Proxy defers creation until first method call.
 * 2. RUNTIME-SAFE: When the client IS created (first query), throw a
 *    CLEAR, EXPLICIT error if env vars are missing — never silently pass
 *    `undefined` to the libsql adapter (which produces the cryptic
 *    "URL_INVALID: The URL 'undefined' is not in a valid format" error).
 * 3. HMR-SAFE: Reuse the same client across dev hot reloads via globalThis.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // --- Read env vars ---
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  // --- HARD GUARD: fail fast with a clear message ---
  // This replaces the cryptic "URL_INVALID: The URL 'undefined'" error
  // with an immediately diagnosable message in the Vercel logs.
  if (!url) {
    throw new Error(
      `[db] FATAL: DATABASE_URL (or TURSO_DATABASE_URL) is not set in the environment. ` +
      `Check Vercel → Project Settings → Environment Variables. ` +
      `process.env.DATABASE_URL = ${JSON.stringify(process.env.DATABASE_URL)}, ` +
      `process.env.TURSO_DATABASE_URL = ${JSON.stringify(process.env.TURSO_DATABASE_URL)}`
    )
  }
  if (!url.startsWith('libsql://') && !url.startsWith('libsql:')) {
    throw new Error(
      `[db] FATAL: DATABASE_URL must be a libsql:// URL (Turso). Got: "${url}". ` +
      `Set DATABASE_URL to your Turso database URL.`
    )
  }
  if (!authToken) {
    throw new Error(
      `[db] FATAL: TURSO_AUTH_TOKEN is not set in the environment. ` +
      `Check Vercel → Project Settings → Environment Variables. ` +
      `process.env.TURSO_AUTH_TOKEN = ${JSON.stringify(process.env.TURSO_AUTH_TOKEN)}`
    )
  }

  // --- Create the libsql adapter ---
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSql } = require('@prisma/adapter-libsql')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@libsql/client')

  const libsql = createClient({ url, authToken })
  const adapter = new PrismaLibSql(libsql)

  // --- Create PrismaClient with the adapter ---
  // The adapter overrides the schema's datasource — all queries go through libsql.
  return new PrismaClient({ adapter })
}

/**
 * Lazy getter — only creates the Prisma client on first access.
 * During `bun run build` (static prerender), this is never called,
 * so no libsql client is ever created at build time.
 */
function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
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
    const client = getDb()
    const value = Reflect.get(client, prop)
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient
