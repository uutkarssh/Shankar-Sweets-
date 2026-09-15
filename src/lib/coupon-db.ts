import { db } from "@/lib/db";
import { COUPONS, validateCoupon, type CouponResult } from "@/lib/constants";

/**
 * Validate a coupon code against both hardcoded coupons AND DB coupons.
 * DB coupons take precedence (same code → DB version wins).
 */
export async function validateCouponWithDB(
  code: string,
  cartSubtotal: number,
  deliveryFee: number,
  categorySubtotals?: Record<string, number>
): Promise<CouponResult> {
  // Check DB coupons first
  try {
    // SQLite doesn't support Prisma's `mode: "insensitive"`. Since all
    // coupon codes are stored uppercase, we uppercase the input before
    // querying for an exact match.
    const dbCoupon = await db.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), active: true },
    });

    if (dbCoupon) {
      // Check expiry
      if (dbCoupon.expiresAt && new Date(dbCoupon.expiresAt) < new Date()) {
        return { valid: false, discountAmount: 0, freeDelivery: false, error: "This coupon has expired" };
      }
      // Check max redemptions
      if (dbCoupon.maxRedemptions > 0 && dbCoupon.redemptionCount >= dbCoupon.maxRedemptions) {
        return { valid: false, discountAmount: 0, freeDelivery: false, error: "This coupon has reached its redemption limit" };
      }
      // Check min order
      if (cartSubtotal < dbCoupon.minOrder) {
        return { valid: false, discountAmount: 0, freeDelivery: false, error: `Minimum order ₹${dbCoupon.minOrder} required (you have ₹${Math.round(cartSubtotal)})` };
      }
      // Category restriction
      let applicableBase = cartSubtotal;
      if (dbCoupon.categorySlug) {
        applicableBase = categorySubtotals?.[dbCoupon.categorySlug] ?? 0;
        if (applicableBase === 0) {
          return { valid: false, discountAmount: 0, freeDelivery: false, error: `Add ${dbCoupon.categorySlug} items to use this coupon` };
        }
      }
      // Compute discount
      if (dbCoupon.discountType === "percent") {
        const discount = Math.round((applicableBase * dbCoupon.discountValue) / 100);
        return { valid: true, coupon: dbCoupon as any, discountAmount: discount, freeDelivery: false };
      }
      if (dbCoupon.discountType === "flat") {
        return { valid: true, coupon: dbCoupon as any, discountAmount: dbCoupon.discountValue, freeDelivery: false };
      }
      if (dbCoupon.discountType === "free_delivery") {
        return { valid: true, coupon: dbCoupon as any, discountAmount: deliveryFee, freeDelivery: true };
      }
    }
  } catch (e) {
    console.error("DB coupon lookup failed:", e);
  }

  // Fall back to hardcoded coupons
  return validateCoupon(code, cartSubtotal, deliveryFee, categorySubtotals);
}

/**
 * Increment the redemption count of a coupon after it's used.
 */
export async function incrementCouponRedemption(code: string): Promise<void> {
  try {
    const coupon = await db.coupon.findFirst({
      where: { code: { equals: code, mode: "insensitive" } },
    });
    if (coupon) {
      await db.coupon.update({
        where: { id: coupon.id },
        data: { redemptionCount: { increment: 1 } },
      });
    }
  } catch (e) {
    // best-effort
  }
}

/**
 * Get all active coupons (DB + hardcoded) for the offers page.
 */
export async function getAllActiveCoupons() {
  let dbCoupons: any[] = [];
  try {
    dbCoupons = await db.coupon.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // ignore
  }

  // Merge: DB coupons first, then hardcoded ones not already in DB
  const dbCodes = new Set(dbCoupons.map((c) => c.code.toUpperCase()));
  const hardcoded = COUPONS.filter((c) => !dbCodes.has(c.code.toUpperCase()));

  return [
    ...dbCoupons.map((c) => ({
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrder: c.minOrder,
      categorySlug: c.categorySlug || undefined,
    })),
    ...hardcoded,
  ];
}
