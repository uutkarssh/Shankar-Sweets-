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

    // Manual continuation (no screenshot)
    if (manual) {
      await db.order.update({
        where: { id: orderId },
        data: { paymentStatus: "PENDING", paymentScreenshot: null },
      });
      await db.orderStatusLog.create({
        data: { orderId, status: order.status, note: "Customer continued without screenshot — manual review needed" },
      });
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
        if (result.verified) {
          await db.order.update({ where: { id: orderId }, data: { paymentStatus: "VERIFIED" } });
          await db.orderStatusLog.create({
            data: { orderId, status: order.status, note: `Payment auto-verified (${result.confidence}%): ${result.reason}` },
          });
          return NextResponse.json({ verified: true, reason: result.reason });
        } else {
          await db.orderStatusLog.create({
            data: { orderId, status: order.status, note: `Payment auto-check: ${result.reason}` },
          });
          return NextResponse.json({ verified: false, reason: result.reason });
        }
      } catch (e: any) {
        // Gemini unavailable — mark for manual review
        await db.orderStatusLog.create({
          data: { orderId, status: order.status, note: "Screenshot uploaded — manual review needed" },
        });
        return NextResponse.json({ verified: false, reason: "Manual review needed" });
      }
    }

    return NextResponse.json({ error: "Screenshot or manual flag required" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
