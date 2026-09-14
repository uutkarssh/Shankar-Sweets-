import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, screenshot, manual } = body;

    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Manual continuation (no screenshot) — activate the order as PENDING
    if (manual) {
      await db.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PENDING",
          paymentScreenshot: null,
          status: order.status === "DRAFT" ? "PENDING" : order.status,
        },
      });
      await db.orderStatusLog.create({
        data: { orderId, status: "PENDING", note: "Customer continued without screenshot — manual review needed" },
      });

      // NOW send Telegram notification (order is officially placed)
      try {
        const { notifyTelegramNewOrder } = await import("@/lib/telegram");
        const updatedOrder = await db.order.findUnique({ where: { id: orderId } });
        if (updatedOrder) await notifyTelegramNewOrder(updatedOrder);
      } catch (e) {
        console.error("Telegram notify failed:", e);
      }

      return NextResponse.json({ verified: false, reason: "Manual review needed" });
    }

    // Screenshot provided — try Gemini Vision verification
    if (screenshot) {
      await db.order.update({
        where: { id: orderId },
        data: { paymentScreenshot: screenshot, paymentStatus: "PENDING" },
      });

      try {
        const { verifyPaymentScreenshot } = await import("@/lib/gemini");
        const result = await verifyPaymentScreenshot(screenshot, order.total, process.env.UPI_PAYEE_ID);

        // Activate the order regardless of verification result — the order
        // is now "placed" (DRAFT → PENDING). Payment status reflects whether
        // it was auto-verified or needs manual review.
        const newPaymentStatus = result.verified ? "VERIFIED" : "PENDING";
        await db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: newPaymentStatus,
            status: order.status === "DRAFT" ? "PENDING" : order.status,
          },
        });

        await db.orderStatusLog.create({
          data: {
            orderId,
            status: "PENDING",
            note: result.verified
              ? `Payment auto-verified (${result.confidence}%): ${result.reason}`
              : `Payment auto-check: ${result.reason} — manual review needed`,
          },
        });

        // NOW send Telegram notification (order is officially placed)
        try {
          const { notifyTelegramNewOrder } = await import("@/lib/telegram");
          const updatedOrder = await db.order.findUnique({ where: { id: orderId } });
          if (updatedOrder) await notifyTelegramNewOrder(updatedOrder);
        } catch (e) {
          console.error("Telegram notify failed:", e);
        }

        return NextResponse.json({ verified: result.verified, reason: result.reason });
      } catch (e: any) {
        // Gemini unavailable — activate order + mark for manual review
        await db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "PENDING",
            status: order.status === "DRAFT" ? "PENDING" : order.status,
          },
        });
        await db.orderStatusLog.create({
          data: { orderId, status: "PENDING", note: "Screenshot uploaded — manual review needed (AI verification unavailable)" },
        });

        // Send Telegram notification
        try {
          const { notifyTelegramNewOrder } = await import("@/lib/telegram");
          const updatedOrder = await db.order.findUnique({ where: { id: orderId } });
          if (updatedOrder) await notifyTelegramNewOrder(updatedOrder);
        } catch (e2) {
          console.error("Telegram notify failed:", e2);
        }

        return NextResponse.json({ verified: false, reason: "Manual review needed" });
      }
    }

    return NextResponse.json({ error: "Screenshot or manual flag required" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
