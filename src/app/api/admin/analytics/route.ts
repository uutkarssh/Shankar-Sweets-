import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Cache analytics for 30 seconds — it's an aggregate view that doesn't need
// to be real-time. The admin orders cache (5s) handles fresh order data.
const getCachedAnalytics = unstable_cache(
  async () => {
    // All orders (exclude rejected for revenue)
    const orders = await db.order.findMany({
      where: { status: { not: "REJECTED" } },
      select: { id: true, total: true, subtotal: true, deliveryFee: true, status: true, paymentMethod: true, createdAt: true, items: true },
    });

    const categories = await db.category.findMany({
      include: { items: { where: { active: true }, select: { id: true } } },
    });

    return { orders, categories };
  },
  ["admin-analytics-v1"],
  { revalidate: 30, tags: ["admin-analytics", "admin-orders"] }
);

export async function GET(req: Request) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orders, categories } = await getCachedAnalytics();
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  // Today's stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => new Date(o.createdAt) >= todayStart);
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);

  // Last 7 days revenue
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    return d;
  });
  const dailyRevenue = last7.map((d) => {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayOrders = orders.filter((o) => {
      const c = new Date(o.createdAt);
      return c >= d && c < next;
    });
    return {
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
    };
  });

  // Popular items by qty sold
  const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
  orders.forEach((o) => {
    try {
      const items = JSON.parse(o.items);
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          const key = it.itemId || it.name;
          const name = it.name;
          const qty = it.qty || 1;
          const price = it.variant?.price ?? it.price ?? 0;
          const existing = itemMap.get(key) || { name, qty: 0, revenue: 0 };
          existing.qty += qty;
          existing.revenue += price * qty;
          itemMap.set(key, existing);
        });
      }
    } catch {
      // ignore
    }
  });
  const popularItems = Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 8);

  // Payment method split
  const codCount = orders.filter((o) => o.paymentMethod === "COD").length;
  const upiCount = orders.filter((o) => o.paymentMethod === "UPI").length;

  // Category breakdown (uses cached categories from above)
  const categoryCounts = categories.map((c) => ({ name: c.name, count: c.items.length })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    deliveredCount,
    pendingCount,
    todayRevenue,
    todayOrders: todayOrders.length,
    dailyRevenue,
    popularItems,
    paymentSplit: { cod: codCount, upi: upiCount },
    categoryCounts,
  });
}
