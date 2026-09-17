import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

/**
 * POST /api/admin/push/subscribe
 *
 * Admin-side push subscription endpoint. Receives a browser-generated
 * PushSubscription object and stores it in the DB with role="ADMIN".
 *
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 *
 * Behind the existing admin auth check (isAdminAuthed) — same cookie
 * used by all /api/admin/* routes.
 *
 * Admin subscriptions are NOT tied to an orderId (unlike customer
 * subscriptions) — one admin can have multiple devices subscribed.
 *
 * Idempotent: if the same endpoint already exists, just refresh the keys.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { endpoint, keys, userAgent } = body;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "Missing 'endpoint'" }, { status: 400 });
    }
    if (!keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Missing 'keys.p256dh' or 'keys.auth'" },
        { status: 400 }
      );
    }

    const sub = await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        role: "ADMIN",
        orderId: null,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent: userAgent || null,
      },
      update: {
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ ok: true, id: sub.id });
  } catch (err: any) {
    console.error("[admin/push/subscribe] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to store admin subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint) {
      return NextResponse.json({ error: "Missing 'endpoint' query param" }, { status: 400 });
    }
    await db.pushSubscription.deleteMany({
      where: { endpoint, role: "ADMIN" },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/push/subscribe DELETE] Error:", err?.message || err);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
