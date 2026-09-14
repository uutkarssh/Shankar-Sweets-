import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Normalize any phone format to last 10 digits
function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const phoneParam = url.searchParams.get("phone")?.trim();
  const orderNumber = url.searchParams.get("orderNumber")?.trim();

  if (!phoneParam && !orderNumber) {
    return NextResponse.json({ error: "Provide phone or orderNumber" }, { status: 400 });
  }

  if (orderNumber) {
    const orders = await db.order.findMany({
      where: { orderNumber },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    return NextResponse.json({ orders });
  }

  // Phone-based search — try multiple formats
  const normalizedPhone = normalizePhone(phoneParam);

  // Try exact match first
  let orders = await db.order.findMany({
    where: { customerPhone: phoneParam },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
  });

  // If no exact match, try with +91 prefix
  if (orders.length === 0) {
    orders = await db.order.findMany({
      where: { customerPhone: `+91 ${normalizedPhone}` },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
  }

  // If still no match, try just the 10-digit number
  if (orders.length === 0) {
    orders = await db.order.findMany({
      where: { customerPhone: normalizedPhone },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
  }

  // If still no match, try contains (catches any format with the digits embedded)
  if (orders.length === 0) {
    orders = await db.order.findMany({
      where: { customerPhone: { contains: normalizedPhone } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { statusLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
  }

  return NextResponse.json({ orders });
}
