import { NextResponse } from "next/server";
import { adminCredentials, getSessionToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const cookie = req.headers.get("cookie") || "";
  const cookieToken = cookie.match(/admin_token=([^;]+)/)?.[1];
  if (token === getSessionToken() || cookieToken === getSessionToken()) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
