import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { editTelegramOrderStatus } from "@/lib/telegram";

export const dynamic = "force-dynamic";

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
    // Edit the Telegram message in place — fire-and-forget so the admin
    // doesn't wait for the Telegram API round-trip (~1s).
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    editTelegramOrderStatus(updated).catch((e) => console.error("TG edit failed:", e));
    // Award loyalty points when delivered — also fire-and-forget
    if (status === "DELIVERED") {
      import("@/lib/loyalty")
        .then(({ awardLoyaltyPoints }) => awardLoyaltyPoints(updated))
        .catch((e) => console.error("Loyalty award failed:", e));
    }
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
