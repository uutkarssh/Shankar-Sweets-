import { ADMIN } from "@/lib/constants";
import crypto from "crypto";

/**
 * Returns true if admin credentials are configured via environment variables.
 * Used to short-circuit login attempts (and produce a clear error message)
 * when ADMIN_EMAIL / ADMIN_PASSWORD are missing — rather than accidentally
 * letting through a request that submits empty strings for both fields.
 */
export function adminCredentialsConfigured(): boolean {
  return Boolean(ADMIN.email && ADMIN.password);
}

// Stable session token derived from admin credentials (survives server restarts).
// Only valid when admin credentials are actually configured.
let SESSION_TOKEN: string | null = null;
export function getSessionToken(): string {
  if (!SESSION_TOKEN) {
    SESSION_TOKEN =
      "ss_" +
      crypto
        .createHash("sha256")
        .update(ADMIN.email + ":" + ADMIN.password)
        .digest("hex")
        .slice(0, 24);
  }
  return SESSION_TOKEN;
}

// Simple admin auth helper. Credentials come from env vars (no hardcoded
// fallbacks — see src/lib/constants.ts).
export function isAdminAuthed(req: Request): boolean {
  if (!adminCredentialsConfigured()) return false;
  const expected = getSessionToken();
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice(7) === expected;
  }
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/admin_token=([^;]+)/);
  if (m && m[1] === expected) return true;
  return false;
}

export function adminCredentials() {
  return { email: ADMIN.email, password: ADMIN.password };
}
