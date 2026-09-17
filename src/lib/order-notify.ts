/**
 * Order notification helper — fires both Telegram AND admin push for a new
 * order, so the admin gets the alert on both channels regardless of which
 * one is currently working.
 *
 * Used by:
 *   - /api/orders POST (COD checkout — direct path)
 *   - /api/orders/payment-verify POST (UPI checkout — 3 sub-paths:
 *     manual review, AI-verified, AI-unavailable)
 *
 * Both channels are fire-and-forget — one failing must not block the other,
 * and neither must block the order placement response.
 */

import type { Order } from "@prisma/client";

/**
 * Fire both Telegram + admin push for a new order. Returns immediately;
 * errors are logged but never thrown.
 */
export async function notifyNewOrderBoth(order: Order): Promise<void> {
  // ── Telegram (existing channel) ──
  try {
    const { notifyTelegramNewOrder } = await import("@/lib/telegram");
    await notifyTelegramNewOrder(order);
  } catch (e) {
    console.error("Telegram notify failed:", e);
  }

  // ── Admin push (new channel) ──
  // Fire-and-forget. Wrapping in try/catch so a missing VAPID env var
  // (which throws at ensureConfigured()) doesn't crash the order placement.
  try {
    const { broadcastPush } = await import("@/lib/push-server");
    const { sent, failed } = await broadcastPush(
      { role: "ADMIN" },
      {
        title: "🔔 New order received",
        body: `Order ${order.orderNumber} — ₹${Math.round(order.total)} (${order.paymentMethod === "COD" ? "Cash on Delivery" : "UPI"})\nCustomer: ${order.customerName} • ${order.customerPhone}`,
        tag: "new-order",
        url: `/admin/orders?order=${order.id}`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
      }
    );
    console.log(`[push] admin new-order: sent=${sent} failed=${failed} order=${order.id} (${order.orderNumber})`);
  } catch (e) {
    // Most common cause: VAPID env vars not set. Non-fatal — Telegram still works.
    console.error("Admin push (new order) failed:", e);
  }
}
