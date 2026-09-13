import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public: list active coupons (for the offers page)
export async function GET() {
  const coupons = await db.coupon.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    select: {
      code: true,
      description: true,
      discountType: true,
      discountValue: true,
      minOrder: true,
      categorySlug: true,
      maxRedemptions: true,
      redemptionCount: true,
    },
  });
  return NextResponse.json({ coupons });
}
