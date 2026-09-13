import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLoyaltyAccount, pointsToRupees, POINTS_PER_RUPEE, REDEEM_RATE } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

// GET loyalty account by phone
export async function GET(req: Request) {
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone")?.trim();
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

  const account = await getLoyaltyAccount(phone);
  if (!account) {
    return NextResponse.json({ account: null, points: 0, rupeeValue: 0, transactions: [] });
  }

  return NextResponse.json({
    account: {
      phone: account.phone,
      name: account.name,
      points: account.points,
      totalSpent: account.totalSpent,
      ordersCount: account.ordersCount,
    },
    points: account.points,
    rupeeValue: pointsToRupees(account.points),
    transactions: account.transactions,
  });
}

// POST: redeem points (validate + return discount info; actual deduction on order placement)
export async function POST(req: Request) {
  try {
    const { phone, pointsToRedeem } = await req.json();
    if (!phone || !pointsToRedeem) {
      return NextResponse.json({ error: "phone and pointsToRedeem required" }, { status: 400 });
    }
    const pts = Math.floor(Number(pointsToRedeem));
    if (pts < 100) {
      return NextResponse.json({ error: "Minimum 100 points required to redeem" }, { status: 400 });
    }

    const account = await getLoyaltyAccount(phone);
    if (!account || account.points < pts) {
      return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
    }

    const discount = pointsToRupees(pts);
    return NextResponse.json({
      ok: true,
      pointsRedeemed: pts,
      discount,
      remainingPoints: account.points - pts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

// Deduct points (called after order placement with loyalty redemption)
export async function PATCH(req: Request) {
  try {
    const { phone, points, orderId, note } = await req.json();
    if (!phone || !points) {
      return NextResponse.json({ error: "phone and points required" }, { status: 400 });
    }
    const account = await db.loyaltyAccount.findUnique({ where: { phone } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (account.points < points) return NextResponse.json({ error: "Insufficient points" }, { status: 400 });

    await db.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: { decrement: points } },
    });
    await db.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        points: -points,
        type: "REDEEMED",
        orderId: orderId || null,
        note: note || "Redeemed at checkout",
      },
    });
    return NextResponse.json({ ok: true, remainingPoints: account.points - points });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
