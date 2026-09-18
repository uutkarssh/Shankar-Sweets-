import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/push/subscribe
 *
 * Customer-side push subscription endpoint. Receives a browser-generated
 * PushSubscription object and stores it in the DB.
 *
 * Body: { endpoint, keys: { p256dh, auth }, orderId?, customerPhone?, userAgent? }
 *
 * Identity model:
 *   - The subscription is identified by `endpoint` (unique per browser device).
 *   - The customer-side subscription is associated with the customer via
 *     `customerPhone` (the stable cross-order identifier — every order has
 *     a phone, even guest checkout). This is what broadcastPush uses to
 *     find subscriptions when an order's status changes.
 *   - `orderId` is OPTIONAL — set when the subscribe call happens right
 *     after checkout (for traceability) but NOT required. If only orderId
 *     is available (no phone yet), the subscription is still saved and
 *     will be looked up by orderId as a fallback.
 *   - At least ONE of { orderId, customerPhone } must be present.
 *
 * This endpoint is NOT behind auth — guest checkout is allowed. The
 * customerPhone is enough to scope the subscription.
 *
 * Idempotent: if the same endpoint already exists, we update its
 * orderId + customerPhone (so a returning customer's existing subscription
 * gets re-pointed to their new order).
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { endpoint, keys, orderId, customerPhone, userAgent } = body;
    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "Missing 'endpoint'" }, { status: 400 });
    }
    if (!keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Missing 'keys.p256dh' or 'keys.auth'" },
        { status: 400 }
      );
    }

    // At least one of orderId / customerPhone must be present so we know
    // who to send pushes to. Both being missing means we'd save an
    // orphan subscription that no broadcast could ever find.
    const hasOrderId = orderId && typeof orderId === "string";
    const hasPhone = customerPhone && typeof customerPhone === "string";
    if (!hasOrderId && !hasPhone) {
      return NextResponse.json(
        { error: "Missing 'orderId' or 'customerPhone' — at least one is required" },
        { status: 400 }
      );
    }

    // If orderId is provided, verify the order exists (defensive — don't
    // let a random orderId create a phantom subscription).
    if (hasOrderId) {
      const order = await db.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, customerPhone: true },
      });
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      // If customerPhone wasn't provided in the body but IS on the order,
      // use the order's phone — this makes the subscription cross-order
      // reusable even if the frontend forgot to pass it.
      const phoneForSave = customerPhone || order.customerPhone || null;
      const sub = await db.pushSubscription.upsert({
        where: { endpoint },
        create: {
          role: "CUSTOMER",
          orderId,
          customerPhone: phoneForSave,
          endpoint,
          p256dhKey: keys.p256dh,
          authKey: keys.auth,
          userAgent: userAgent || null,
        },
        update: {
          // Repoint to the new order + refresh phone in case it changed.
          orderId,
          customerPhone: phoneForSave,
          p256dhKey: keys.p256dh,
          authKey: keys.auth,
          userAgent: userAgent || null,
        },
      });
      return NextResponse.json({ ok: true, id: sub.id });
    }

    // Only customerPhone (no orderId) — e.g. a logged-in customer subscribing
    // from their profile page, before placing any order. Save with orderId=null.
    const sub = await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        role: "CUSTOMER",
        orderId: null,
        customerPhone,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        userAgent: userAgent || null,
      },
      update: {
        // Refresh phone + keys (a returning customer might have a new number).
        customerPhone,
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

/**
 * DELETE /api/push/subscribe?endpoint=...
 * Optional cleanup endpoint — the browser's `pushsubscriptionchange` event
 * or the user manually unsubscribing can call this. Not strictly required
 * since expired subs are auto-cleaned on failed send (410/404), but kept
 * for completeness.
 */
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
