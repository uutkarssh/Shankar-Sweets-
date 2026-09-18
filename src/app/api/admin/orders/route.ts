import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { editTelegramOrderStatus } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Customer push notification copy — kept in one place so it stays in sync
// with the Telegram webhook's labels. Used by the admin-panel status-update
// path. The Telegram webhook path uses its own copy (see /api/telegram/webhook).
const CUSTOMER_STATUS_TITLES: Record<string, string> = {
  ACCEPTED: "✅ Order Accepted",
  PREPARING: "🍳 Your order is being prepared",
  OUT_FOR_DELIVERY: "🛵 Out for delivery!",
  DELIVERED: "🎉 Order delivered — enjoy!",
  REJECTED: "❌ Order rejected",
};

const CUSTOMER_STATUS_BODIES: Record<string, string> = {
  ACCEPTED: "Shankar Sweets has accepted your order {orderNumber}. We'll start preparing it shortly.",
  PREPARING: "Your order {orderNumber} is now being prepared fresh at Shankar Sweets.",
  OUT_FOR_DELIVERY: "Your order {orderNumber} is on its way! Keep your phone handy.",
  DELIVERED: "Your order {orderNumber} has been delivered. Thank you for ordering from Shankar Sweets!",
  REJECTED: "Sorry — your order {orderNumber} could not be fulfilled. Please call Shankar Sweets for details.",
};

// Cache the admin orders list (last 200 orders) for 5 seconds. The admin
// orders page polls every 15s, so a 5s cache still shows near-real-time data
// while cutting response time from ~400ms to ~15ms.
const getCachedAdminOrders = unstable_cache(
  async () => {
    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    return orders;
  },
  ["admin-orders-v1"],
  { revalidate: 5, tags: ["admin-orders"] }
);

export async function GET(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await getCachedAdminOrders();
  return NextResponse.json({ orders });
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId, status, paymentStatus } = await req.json();

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const data: any = {};
  if (status) data.status = status;
  if (paymentStatus) data.paymentStatus = paymentStatus;

  const updated = await db.order.update({ where: { id: orderId }, data });
  if (status) {
    await db.orderStatusLog.create({ data: { orderId, status, note: `Status set to ${status} by admin` } });

    // ─── If the order was in DRAFT status (UPI order that never went through
    // the payment-verify flow) and is now being advanced to PENDING/ACCEPTED,
    // send the Telegram notification that was missed. This happens when the
    // checkout→payment navigation failed (the bug we just fixed) and the
    // admin manually advances the order. ───
    if (order.status === "DRAFT" && !order.telegramMessageId) {
      try {
        const { notifyTelegramNewOrder } = await import("@/lib/telegram");
        // Fetch the updated order with all fields for the Telegram message
        const freshOrder = await db.order.findUnique({ where: { id: orderId } });
        if (freshOrder) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          notifyTelegramNewOrder(freshOrder).catch((e) => console.error("TG notify (missed) failed:", e));
        }
      } catch (e) {
        console.error("Failed to send missed Telegram notification:", e);
      }
    } else {
      // Order already has a Telegram message — edit it in place (fire-and-forget)
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      editTelegramOrderStatus(updated).catch((e) => console.error("TG edit failed:", e));
    }

    // Award loyalty points when delivered — also fire-and-forget
    if (status === "DELIVERED") {
      import("@/lib/loyalty")
        .then(({ awardLoyaltyPoints }) => awardLoyaltyPoints(updated))
        .catch((e) => console.error("Loyalty award failed:", e));
    }

    // ─── Customer push notification (fire-and-forget, alongside Telegram) ───
    // Notifies the customer who placed this order that the status changed.
    // Uses the same status labels as the Telegram webhook for consistency.
    //
    // Lookup strategy: broadcast by customerPhone (the stable cross-order
    // identifier — finds the customer's device across all their orders, so
    // a customer who placed 3 orders from the same device gets ONE push,
    // not 3). Falls back to orderId for any legacy subscriptions that
    // were saved without a phone.
    import("@/lib/push-server")
      .then(({ broadcastPush, cleanupOrderSubscriptions }) =>
        // Primary lookup: customerPhone from the order being updated.
        // (updated.customerPhone comes from the Order model — always set,
        // even for guest checkout.)
        broadcastPush(
          { role: "CUSTOMER", customerPhone: updated.customerPhone || undefined },
          {
            title: CUSTOMER_STATUS_TITLES[status] || "Order Update",
            body: CUSTOMER_STATUS_BODIES[status]?.replace("{orderNumber}", updated.orderNumber) || `Status: ${status}`,
            tag: `order-${orderId}`,
            url: `/orders?order=${orderId}`,
            data: { orderId, status, orderNumber: updated.orderNumber },
          }
        ).then(({ sent, failed }) => {
          console.log(`[push] customer status-update: sent=${sent} failed=${failed} order=${orderId} status=${status} phone=${updated.customerPhone}`);
          // Once the order is delivered, the customer no longer needs push
          // notifications about it — clean up their subscription(s) for this order.
          if (status === "DELIVERED" || status === "REJECTED") {
            cleanupOrderSubscriptions(orderId).catch(() => {});
          }
        })
      )
      .catch((e) => console.error("Customer push failed:", e));
  }

  // NOTE: We intentionally do NOT call revalidateTag here. The admin orders
  // cache has a 5-second TTL, so the next poll (every 15s) will pick up the
  // change. Calling revalidateTag synchronously would add ~300ms to the
  // response, and the admin already sees the update within 5s anyway.

  return NextResponse.json({ ok: true, order: updated });
}

// DELETE — permanently delete an order and its status logs.
// Also deletes the order from the admin orders cache on next poll.
export async function DELETE(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  try {
    // Delete status logs first (FK constraint), then the order
    await db.orderStatusLog.deleteMany({ where: { orderId } });
    await db.order.delete({ where: { id: orderId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[DELETE /api/admin/orders] error:", e);
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 500 });
  }
}
