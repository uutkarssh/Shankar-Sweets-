import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOrderNumber, BUSINESS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    const required = ["customerName", "customerPhone", "address", "pincode", "items", "subtotal", "total"];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === "") {
        return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 });
      }
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Enforce delivery radius
    if (body.lat != null && body.lng != null) {
      const R = 6371;
      const dLat = ((body.lat - BUSINESS.lat) * Math.PI) / 180;
      const dLng = ((body.lng - BUSINESS.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((BUSINESS.lat * Math.PI) / 180) * Math.cos((body.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist > BUSINESS.deliveryRadiusKm) {
        return NextResponse.json({ error: `Out of delivery range (${dist.toFixed(2)} km). Max ${BUSINESS.deliveryRadiusKm} km.` }, { status: 400 });
      }
      body.distanceKm = dist;
    }

    const orderNumber = body.orderNumber || generateOrderNumber();

    // Check accepting orders
    const config = await db.restaurantConfig.findUnique({ where: { id: "singleton" } });
    if (config?.acceptingOrders === false) {
      return NextResponse.json({ error: "Orders are temporarily paused. Please try again soon." }, { status: 503 });
    }

    const order = await db.order.create({
      data: {
        orderNumber,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail || null,
        address: body.address,
        landmark: body.landmark || null,
        pincode: body.pincode,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        distanceKm: body.distanceKm ?? null,
        items: JSON.stringify(body.items),
        subtotal: Number(body.subtotal),
        deliveryFee: Number(body.deliveryFee || 0),
        total: Number(body.total),
        paymentMethod: body.paymentMethod || "COD",
        paymentStatus: body.paymentMethod === "UPI" ? "PENDING" : "PENDING",
        paymentScreenshot: body.paymentScreenshot || null,
        status: "PENDING",
        notes: body.notes || null,
      },
    });

    await db.orderStatusLog.create({
      data: { orderId: order.id, status: "PENDING", note: "Order placed by customer" },
    });

    // Best-effort Telegram notification (single message, edited in place later)
    try {
      const { notifyTelegramNewOrder } = await import("@/lib/telegram");
      await notifyTelegramNewOrder(order);
    } catch (e) {
      console.error("Telegram notify failed:", e);
    }

    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, orderId: order.id });
  } catch (e: any) {
    console.error("Create order error:", e);
    return NextResponse.json({ error: e?.message || "Failed to place order" }, { status: 500 });
  }
}
