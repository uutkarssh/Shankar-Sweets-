import { NextResponse } from "next/server";
import { adminCredentials, adminCredentialsConfigured, getSessionToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Refuse to authenticate if admin credentials aren't configured via env vars.
  // This prevents the insecure-defaults attack vector (where login would
  // succeed with empty email + empty password if env vars were missing).
  if (!adminCredentialsConfigured()) {
    return NextResponse.json(
      { error: "Admin credentials not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables." },
      { status: 503 }
    );
  }
  const { email, password } = await req.json();
  const creds = adminCredentials();
  if (email === creds.email && password === creds.password) {
    const token = getSessionToken();
    const res = NextResponse.json({ ok: true, token });
    res.cookies.set("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

export async function GET(req: Request) {
  // If admin credentials aren't configured, no one can be authed.
  if (!adminCredentialsConfigured()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const cookie = req.headers.get("cookie") || "";
  const cookieToken = cookie.match(/admin_token=([^;]+)/)?.[1];
  if (token === getSessionToken() || cookieToken === getSessionToken()) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}

// Sign-out — clears the httpOnly admin_token cookie. Must be done server-side
// because httpOnly cookies cannot be modified by client-side JavaScript
// (which was the root cause of the admin-sign-out bug: the admin-shell
// button was calling `document.cookie = "admin_token=; max-age=0"` which
// the browser silently ignored, leaving the session intact).
//
// Returns 200 regardless of whether a session existed, so the client can
// unconditionally navigate to /admin after calling.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,          // expire immediately
    expires: new Date(0),
  });
  return res;
}
