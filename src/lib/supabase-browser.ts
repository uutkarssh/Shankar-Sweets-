import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client.
 *
 * IMPORTANT: This module is imported (transitively) by the root `layout.tsx`
 * via `<AuthProvider>`. That means it gets evaluated during static prerendering
 * of EVERY page — including `/_not-found`. On deploy platforms where
 * `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` aren't set in
 * the build environment, eagerly calling `createBrowserClient(url!, anon!)`
 * at module top-level throws:
 *   "@supabase/ssr: Your project's URL and API key are required..."
 * and breaks the whole production build.
 *
 * Fix: lazily create the client on first access, and gracefully degrade to a
 * safe no-op stub when env vars are missing (build time / SSR / misconfigured
 * deploy). Real client is only created when the browser actually needs it
 * and env vars are present.
 */

let _client: SupabaseClient | null = null;
let _tried = false;

function getClient(): SupabaseClient | null {
  if (_tried) return _client;
  _tried = true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Env not configured — degrade gracefully. Auth/storage calls become no-ops.
    return null;
  }
  try {
    _client = createBrowserClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    // Defensive: never let a Supabase init failure crash the app.
    console.warn("[supabase-browser] failed to initialize client:", err);
    _client = null;
  }
  return _client;
}

/**
 * No-op auth stub returned when Supabase env vars aren't configured
 * (e.g., during build / prerender). All calls resolve as "no session" so
 * callers can fall through to their normal unauthenticated code path.
 */
const noopAuth = {
  getSession: async () => ({ data: { session: null }, error: null as unknown }),
  getUser: async () => ({ data: { user: null }, error: null as unknown }),
  onAuthStateChange: () => ({
    data: { subscription: { unsubscribe: () => {} } },
  }),
  signOut: async () => ({ error: null as unknown }),
  signInWithPassword: async () => ({
    data: { user: null, session: null },
    error: { message: "Auth not configured" } as unknown,
  }),
  signUp: async () => ({
    data: { user: null, session: null },
    error: { message: "Auth not configured" } as unknown,
  }),
  signInWithOAuth: async () => ({
    data: { url: null, provider: null },
    error: { message: "Auth not configured" } as unknown,
  }),
  resend: async () => ({ data: {}, error: null as unknown }),
  onTokenChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  refreshSession: async () => ({
    data: { session: null, user: null },
    error: null as unknown,
  }),
};

const noopStorage = {
  from: () => ({
    upload: async () => ({ error: { message: "Storage not configured" } }),
    getPublicUrl: () => ({ data: { publicUrl: "" } }),
    list: async () => ({ data: [], error: null }),
    remove: async () => ({ error: null }),
  }),
};

/**
 * Lazy proxy — defers all property access until first use, and returns safe
 * no-op stubs when env vars aren't configured. Existing callers don't need
 * to change — they just gracefully no-op when Supabase is unavailable.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    const client = getClient();
    if (!client) {
      if (prop === "auth") return noopAuth;
      if (prop === "storage") return noopStorage;
      if (prop === "from") return () => noopStorage.from();
      if (prop === "channel" || prop === "removeChannel" || prop === "getChannels") {
        return () => undefined;
      }
      return undefined;
    }
    return (client as unknown as Record<string, unknown>)[prop];
  },
}) as SupabaseClient;
