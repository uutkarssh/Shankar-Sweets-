import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCouponWithDB } from "@/lib/coupon-db";

export const dynamic = "force-dynamic";

/**
 * Normalize an Indian phone number to the canonical "+91 XXXXXXXXXX" format
 * used in the Customer and Order tables. Returns null if the input isn't a
 * valid 10-digit Indian mobile number.
 */
function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91 ${digits}`;
  }
  return null;
}

// POST: validate a coupon code against cart
export async function POST(req: Request) {
  try {
    const { code, cartSubtotal, deliveryFee, categorySubtotals, phone } = await req.json();
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
    const result = await validateCouponWithDB(
      String(code),
      Number(cartSubtotal || 0),
      Number(deliveryFee || 0),
      categorySubtotals
    );

    // ─── One-time-use enforcement for special coupons ───
    // These checks run only if the coupon passed the regular validation
    // (exists, not expired, meets min order, etc.). We override the result
    // with a specific rejection message if the user is not eligible.
    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedPhone = normalizePhone(phone);

    if (result.valid && normalizedCode === "NEWUSER10") {
      // NEWUSER10: one-time use per customer (matched by phone).
      if (!normalizedPhone) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "Please sign in with your phone number to use this coupon",
        });
      }
      // Look up any previous order by this phone that used NEWUSER10.
      // We fetch all orders with this couponCode for the phone and filter
      // case-insensitively in JS (SQLite doesn't support `mode: insensitive`
      // reliably across all Prisma versions).
      const previousOrders = await db.order.findMany({
        where: { customerPhone: normalizedPhone, couponCode: { not: null } },
        select: { couponCode: true, status: true },
      });
      const alreadyUsed = previousOrders.some(
        (o) =>
          o.couponCode?.toUpperCase() === "NEWUSER10" &&
          o.status !== "REJECTED"
      );
      if (alreadyUsed) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "This coupon has already been used",
        });
      }
    }

    if (result.valid && normalizedCode === "BIRTHDAY10") {
      // BIRTHDAY10: only valid during the customer's birthday month,
      // and can only be used once per calendar year.
      if (!normalizedPhone) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "Please sign in with your phone number to use this coupon",
        });
      }
      // Look up the customer's DOB
      const customer = await db.customer.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            // Also try the raw 10-digit form in case it's stored differently
            { phone: { contains: normalizedPhone.replace(/\D/g, "") } },
          ],
        },
        select: { dateOfBirth: true, phone: true },
      });
      const dob = customer?.dateOfBirth;
      if (!dob) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "Please set your date of birth in your profile to use this coupon",
        });
      }
      // Check birthday month
      const dobDate = new Date(dob);
      const now = new Date();
      if (
        isNaN(dobDate.getTime()) ||
        dobDate.getMonth() !== now.getMonth()
      ) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "This coupon is only valid during your birthday month",
        });
      }
      // Check if already used this year
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
      const yearOrders = await db.order.findMany({
        where: {
          customerPhone: normalizedPhone,
          couponCode: { not: null },
          createdAt: { gte: yearStart, lt: yearEnd },
        },
        select: { couponCode: true, status: true },
      });
      const usedThisYear = yearOrders.some(
        (o) =>
          o.couponCode?.toUpperCase() === "BIRTHDAY10" &&
          o.status !== "REJECTED"
      );
      if (usedThisYear) {
        return NextResponse.json({
          valid: false,
          discountAmount: 0,
          freeDelivery: false,
          error: "Birthday coupon already used this year",
        });
      }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
