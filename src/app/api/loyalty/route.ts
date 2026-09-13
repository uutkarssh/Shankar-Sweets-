import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLoyaltyAccount, pointsToRupees } from "@/lib/loyalty";

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
