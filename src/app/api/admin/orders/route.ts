import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { editTelegramOrderStatus } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
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
    // Edit the Telegram message in place
    try { await editTelegramOrderStatus(updated); } catch (e) { console.error("TG edit failed:", e); }
  }

  return NextResponse.json({ ok: true, order: updated });
}
