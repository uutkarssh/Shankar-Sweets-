import { ADMIN } from "@/lib/constants";
import crypto from "crypto";

// Stable session token derived from admin credentials (survives server restarts).
let SESSION_TOKEN: string | null = null;
export function getSessionToken() {
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

// Simple admin auth helper. Hardcoded credentials from env.
export function isAdminAuthed(req: Request): boolean {
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
