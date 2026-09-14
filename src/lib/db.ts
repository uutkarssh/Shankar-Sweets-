import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

/**
 * Prisma client with @prisma/adapter-libsql (Turso) — lazy + guarded.
 *
 * ROOT CAUSE OF PREVIOUS URL_INVALID ERROR:
 * The PrismaLibSQL adapter factory's connect() method calls createClient(config)
 * internally. Previously, we passed a libsql.Client INSTANCE as the config:
 *   const libsql = createClient({ url, authToken })
 *   const adapter = new PrismaLibSQL(libsql)  // ❌ WRONG
 * The factory's createClient(libsqlClient) didn't know how to extract the URL
 * from the client instance → it got `undefined` → "URL_INVALID: The URL 'undefined'".
 *
 * FIX: Pass the config OBJECT { url, authToken } directly to the adapter:
 *   const adapter = new PrismaLibSQL({ url, authToken })  // ✅ CORRECT
 * The factory's connect() method then calls createClient({ url, authToken })
 * which correctly creates the libsql client with the right URL.
 *
 * We do NOT import createClient from @libsql/client — the adapter handles
 * client creation internally.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function pickLibsqlUrl(): string | null {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.TURSO_DATABASE_URL,
  ]
  for (const c of candidates) {
    if (c && c.startsWith('libsql://')) return c
  }
  return candidates.find(c => !!c) || null
}

function createPrismaClient(): PrismaClient {
  const url = pickLibsqlUrl()
  const authToken = process.env.TURSO_AUTH_TOKEN

  // --- HARD GUARD: fail fast with a clear message ---
  if (!url || !url.startsWith('libsql://')) {
    throw new Error(
      `[db] FATAL: No libsql:// URL found. ` +
      `Set DATABASE_URL or TURSO_DATABASE_URL to your Turso database URL. ` +
      `DATABASE_URL = ${JSON.stringify(process.env.DATABASE_URL)}, ` +
      `TURSO_DATABASE_URL = ${JSON.stringify(process.env.TURSO_DATABASE_URL)}`
    )
  }
  if (!authToken) {
    throw new Error(
      `[db] FATAL: TURSO_AUTH_TOKEN is not set. ` +
      `process.env.TURSO_AUTH_TOKEN = ${JSON.stringify(process.env.TURSO_AUTH_TOKEN)}`
    )
  }

  // --- Create the adapter with CONFIG OBJECT (not a client instance) ---
  // The adapter factory's connect() method calls createClient({ url, authToken })
  // internally, which creates the libsql client with the correct URL.
  const adapter = new PrismaLibSQL({ url, authToken })

  // --- Create PrismaClient with the adapter ---
  return new PrismaClient({ adapter })
}

/**
 * Lazy singleton — only creates the Prisma client on first access.
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
 * Proxy that defers client creation until first property access.
 * Allows the module to be safely imported at build time without
 * triggering any DB connection. Method calls are auto-bound to
 * preserve `this` context for Prisma's internal query methods.
 */
let _client: PrismaClient | null = null

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (!_client) {
      _client = getDb()
    }
    const value = Reflect.get(_client, prop)
    return typeof value === 'function' ? value.bind(_client) : value
  },
}) as PrismaClient
