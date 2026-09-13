import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET reviews for an item (active only)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const itemId = url.searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const reviews = await db.review.findMany({
    where: { itemId, active: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return NextResponse.json({ reviews, average: avg, count: reviews.length });
}

// POST a new review
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, customerName, customerPhone, rating, comment } = body;

    if (!itemId || !customerName || !customerPhone || !rating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const r = Number(rating);
    if (r < 1 || r > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }
    if (customerPhone.replace(/\D/g, "").length !== 10) {
      return NextResponse.json({ error: "Valid 10-digit phone required" }, { status: 400 });
    }

    // Check if this phone has a DELIVERED order containing this item → mark verified
    const orders = await db.order.findMany({
      where: { customerPhone, status: "DELIVERED" },
      select: { items: true },
    });
    const verified = orders.some((o) => {
      try {
        const items = JSON.parse(o.items);
        return Array.isArray(items) && items.some((it: any) => it.itemId === itemId);
      } catch {
        return false;
      }
    });

    // Prevent duplicate reviews (one per phone per item)
    const existing = await db.review.findFirst({
      where: { itemId, customerPhone },
    });
    if (existing) {
      return NextResponse.json({ error: "You have already reviewed this item" }, { status: 409 });
    }

    const review = await db.review.create({
      data: {
        itemId,
        customerName: String(customerName).slice(0, 80),
        customerPhone,
        rating: r,
        comment: comment ? String(comment).slice(0, 500) : null,
        verified,
      },
    });

    // Update the item's aggregate rating + count
    const allReviews = await db.review.findMany({ where: { itemId, active: true }, select: { rating: true } });
    const newAvg = allReviews.length ? allReviews.reduce((s, rv) => s + rv.rating, 0) / allReviews.length : r;
    await db.item.update({
      where: { id: itemId },
      data: { rating: Math.round(newAvg * 10) / 10, ratingCount: allReviews.length },
    });

    return NextResponse.json({ ok: true, review });
  } catch (e: any) {
    console.error("Review create error:", e);
    return NextResponse.json({ error: e?.message || "Failed to post review" }, { status: 500 });
  }
}
