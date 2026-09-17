import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/push/subscribe
 *
 * Customer-side push subscription endpoint. Receives a browser-generated
 * PushSubscription object and stores it in the DB linked to the order ID
 * that was just placed.
 *
 * Body: { endpoint, keys: { p256dh, auth }, orderId, userAgent? }
 *
 * This endpoint is NOT behind auth — because the checkout flow can be
 * guest checkout (no login required). The orderId is enough to scope the
 * subscription. The subscription is auto-deleted when the order is
 * delivered or after 30 days.
 *
 * Idempotent: if the same endpoint already exists, we update its orderId
 * (e.g. a returning customer placing a new order from the same device).
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { endpoint, keys, orderId, userAgent } = body;
    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "Missing 'endpoint'" }, { status: 400 });
    }
    if (!keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Missing 'keys.p256dh' or 'keys.auth'" },
        { status: 400 }
      );
    }
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Missing 'orderId'" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const sub = await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        role: "CUSTOMER",
        orderId,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent: userAgent || null,
      },
      update: {
        orderId,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ ok: true, id: sub.id });
  } catch (err: any) {
    console.error("[push/subscribe] Error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to store subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint) {
      return NextResponse.json({ error: "Missing 'endpoint' query param" }, { status: 400 });
    }
    await db.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[push/subscribe DELETE] Error:", err?.message || err);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
