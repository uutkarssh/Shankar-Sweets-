import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { editTelegramOrderStatus } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Telegram Webhook Endpoint
 *
 * Telegram sends POST requests here when:
 * - A user presses an inline keyboard button (callback_query)
 * - A user sends a message to the bot (message)
 *
 * This endpoint processes order status changes from the inline buttons
 * (Accept, Reject, Mark Preparing, Out for Delivery, Delivered,
 *  Approve Payment, Reject Payment).
 *
 * To register this webhook with Telegram, run:
 *   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *     -H "Content-Type: application/json" \
 *     -d '{"url": "https://your-vercel-url.vercel.app/api/telegram/webhook"}'
 */
export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data: string = callbackQuery.data || "";
      const callbackQueryId: string = callbackQuery.id;

      // Parse the callback data: "oid=<orderId>|<STATUS>"
      // e.g. "oid=abc123|ACCEPTED" or "oid=abc123|PAY_APPROVE"
      const parts = data.split("|");
      if (parts.length !== 2) {
        await answerCallback(callbackQueryId, "Invalid action");
        return NextResponse.json({ ok: true });
      }

      const orderIdPart = parts[0]; // "oid=abc123"
      const action = parts[1]; // "ACCEPTED", "REJECTED", etc.

      const orderId = orderIdPart.replace("oid=", "");
      if (!orderId) {
        await answerCallback(callbackQueryId, "Order not found");
        return NextResponse.json({ ok: true });
      }

      // Fetch the order
      const order = await db.order.findUnique({ where: { id: orderId } });
      if (!order) {
        await answerCallback(callbackQueryId, "❌ Order not found");
        return NextResponse.json({ ok: true });
      }

      // Handle payment actions separately
      if (action === "PAY_APPROVE") {
        await db.order.update({
          where: { id: orderId },
          data: { paymentStatus: "VERIFIED" },
        });
        await db.orderStatusLog.create({
          data: { orderId, status: order.status, note: "Payment approved via Telegram" },
        });
        await editTelegramOrderStatus({ ...order, paymentStatus: "VERIFIED" });
        await answerCallback(callbackQueryId, "✅ Payment approved! Order marked as paid.");
        return NextResponse.json({ ok: true });
      }

      if (action === "PAY_REJECT") {
        await db.order.update({
          where: { id: orderId },
          data: { paymentStatus: "REJECTED" },
        });
        await db.orderStatusLog.create({
          data: { orderId, status: order.status, note: "Payment rejected via Telegram" },
        });
        await editTelegramOrderStatus({ ...order, paymentStatus: "REJECTED" });
        await answerCallback(callbackQueryId, "❌ Payment rejected.");
        return NextResponse.json({ ok: true });
      }

      // Handle order status changes
      const validStatuses = ["ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "REJECTED"];
      if (!validStatuses.includes(action)) {
        await answerCallback(callbackQueryId, "❌ Unknown action");
        return NextResponse.json({ ok: true });
      }

      // Update order status
      await db.order.update({
        where: { id: orderId },
        data: { status: action },
      });
      await db.orderStatusLog.create({
        data: { orderId, status: action, note: `Status changed to ${action} via Telegram` },
      });

      // Edit the Telegram message to show updated status
      await editTelegramOrderStatus({ ...order, status: action });

      // Answer the callback query (shows a small toast to the admin)
      const statusLabels: Record<string, string> = {
        ACCEPTED: "✅ Order accepted!",
        PREPARING: "🍳 Marked as preparing!",
        OUT_FOR_DELIVERY: "🛵 Out for delivery!",
        DELIVERED: "📦 Order delivered!",
        REJECTED: "❌ Order rejected!",
      };
      await answerCallback(callbackQueryId, statusLabels[action] || "✅ Done");

      return NextResponse.json({ ok: true });
    }

    // Handle regular messages (optional — for future features)
    if (update.message) {
      // Could handle /start, /help, etc. here
      // For now, just acknowledge
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[telegram/webhook] Error:", error);
    // Always return 200 so Telegram doesn't retry endlessly
    return NextResponse.json({ ok: true });
  }
}

/**
 * Answer a callback query — shows a small toast notification to the
 * admin who pressed the button.
 */
async function answerCallback(callbackQueryId: string, text: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: false,
      }),
    });
  } catch (e) {
    // Non-fatal
  }
}

// GET endpoint — for verifying the webhook is alive
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Telegram webhook endpoint is active. POST updates here.",
  });
}
