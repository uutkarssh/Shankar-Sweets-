import { NextResponse } from "next/server";
import { validateCouponWithDB } from "@/lib/coupon-db";

export const dynamic = "force-dynamic";

// POST: validate a coupon code against cart
export async function POST(req: Request) {
  try {
    const { code, cartSubtotal, deliveryFee, categorySubtotals } = await req.json();
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
    const result = await validateCouponWithDB(
      String(code),
      Number(cartSubtotal || 0),
      Number(deliveryFee || 0),
      categorySubtotals
    );
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
