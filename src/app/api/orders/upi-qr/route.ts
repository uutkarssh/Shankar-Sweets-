import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildUpiDeepLink, generateQrDataUrl, UPI_CONFIG } from "@/lib/upi";

export const dynamic = "force-dynamic";

// POST: Generate UPI deep link + QR code for an order
export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, total: true, paymentMethod: true, paymentStatus: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentMethod !== "UPI") {
      return NextResponse.json({ error: "Order is not UPI payment" }, { status: 400 });
    }

    if (order.paymentStatus === "PAID" || order.paymentStatus === "VERIFIED") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    const deepLink = buildUpiDeepLink({
      payeeId: UPI_CONFIG.payeeId,
      payeeName: UPI_CONFIG.payeeName,
      amount: order.total,
      txnRef: order.orderNumber,
      note: `Shankar Sweets Order ${order.orderNumber}`,
    });

    const qrDataUrl = await generateQrDataUrl(deepLink);

    return NextResponse.json({
      deepLink,
      qrDataUrl,
      payeeId: UPI_CONFIG.payeeId,
      payeeName: UPI_CONFIG.payeeName,
      amount: order.total,
      orderNumber: order.orderNumber,
    });
  } catch (error: any) {
    console.error("[upi-qr] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate QR" }, { status: 500 });
  }
}
