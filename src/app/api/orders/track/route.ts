import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone")?.trim();
  const orderNumber = url.searchParams.get("orderNumber")?.trim();

  if (!phone && !orderNumber) {
    return NextResponse.json({ error: "Provide phone or orderNumber" }, { status: 400 });
  }

  const where: any = {};
  if (orderNumber) where.orderNumber = orderNumber;
  else where.customerPhone = phone;

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  return NextResponse.json({ orders });
}
