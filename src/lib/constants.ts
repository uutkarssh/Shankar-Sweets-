// Shankar Sweets & Bakery — brand & business constants

export const BUSINESS = {
  name: "Shankar Sweets & Bakery",
  tagline: "Taste the Tradition",
  sinceYear: 1962,
  address: "Pillar no. 27-28, Baraut, Prayagraj",
  phones: ["7618866717", "8423452102"],
  lat: 25.336578,
  lng: 82.266731,
  deliveryRadiusKm: 10,
  freeDeliveryThreshold: 2000,
  minDeliveryFee: 20,
  maxDeliveryFee: 70,
  minOrderSubtotal: 200,
  farDistanceThresholdKm: 7,
  farMinOrderSubtotal: 800,
  upiId: "shankarsweets@upi",
  openingTime: "08:00",
  closingTime: "22:00",
  categories: ["Sweets", "Bakery", "Ice Cream", "Chaat", "Snacks", "Pizza", "Burger", "Maggie", "Chinese", "Hot Beverage"],
} as const;

export const BRAND_COLORS = {
  burgundy: "#641C27",
  darkWine: "#3D1018",
  gold: "#D4A83E",
  saffron: "#E5B84B",
  ivory: "#FFF8E8",
  white: "#FFFFFF",
  cream: "#F5E8CF",
  chocolate: "#2C1715",
  warmBrown: "#76544A",
  naturalGreen: "#2F6B45",
} as const;

export const ADMIN = {
  email: process.env.ADMIN_EMAIL || "admin@shankarsweets.in",
  password: process.env.ADMIN_PASSWORD || "shankar1962",
};

export type DeliveryResult = {
  eligible: boolean;
  fee: number | null;
  blockReason?: string;
  remaining?: number;
};

/**
 * Delivery pricing engine — matches Apna Baithak exactly.
 * - Hard cutoff at 10km.
 * - Min order ₹200 (₹800 if >7km).
 * - Free delivery above ₹2000.
 * - Fee: ₹20 at 1km → ₹70 at 10km, linear, rounded to nearest ₹5.
 */
export function calculateDeliveryFee(distanceKm: number, subtotal: number): number | null {
  const r = computeDelivery(distanceKm, subtotal);
  return r.eligible ? r.fee : null;
}

export function computeDelivery(distanceKm: number, subtotal: number): DeliveryResult {
  const radius = BUSINESS.deliveryRadiusKm;

  // Out of range
  if (distanceKm > radius) {
    return { eligible: false, fee: null, blockReason: `Sorry, we only deliver within ${radius} km. Your address is ${distanceKm.toFixed(2)} km away.` };
  }

  // Distance-first eligibility check (fixes wrong-message-priority bug)
  if (distanceKm > BUSINESS.farDistanceThresholdKm && subtotal < BUSINESS.farMinOrderSubtotal) {
    return {
      eligible: false,
      fee: null,
      blockReason: `Minimum order for delivery beyond ${BUSINESS.farDistanceThresholdKm} km is ₹${BUSINESS.farMinOrderSubtotal}. Add ₹${BUSINESS.farMinOrderSubtotal - subtotal} more.`,
      remaining: BUSINESS.farMinOrderSubtotal - subtotal,
    };
  }

  if (subtotal < BUSINESS.minOrderSubtotal) {
    return {
      eligible: false,
      fee: null,
      blockReason: `Minimum order for delivery is ₹${BUSINESS.minOrderSubtotal}. Add ₹${BUSINESS.minOrderSubtotal - subtotal} more.`,
      remaining: BUSINESS.minOrderSubtotal - subtotal,
    };
  }

  // Free delivery override
  if (subtotal >= BUSINESS.freeDeliveryThreshold) {
    return { eligible: true, fee: 0 };
  }

  // Linear fee: ₹20 at 1km → ₹70 at 10km
  const clamped = Math.max(1, Math.min(distanceKm, radius));
  const raw = BUSINESS.minDeliveryFee + (clamped - 1) * (BUSINESS.maxDeliveryFee - BUSINESS.minDeliveryFee) / (radius - 1);
  const rounded = Math.round(raw / 5) * 5;
  return { eligible: true, fee: Math.max(BUSINESS.minDeliveryFee, rounded) };
}

/** Haversine distance in km between two coordinates. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatINR(amount: number): string {
  return "₹" + Math.round(amount).toString();
}

/**
 * Estimated delivery time in minutes.
 * Base prep time 20 min + ~4 min/km travel, clamped to [25, 60].
 */
export function estimateDeliveryMinutes(distanceKm: number): { min: number; max: number } {
  const base = 20;
  const travel = Math.round(distanceKm * 4);
  const mid = Math.min(60, Math.max(25, base + travel));
  return { min: Math.max(20, mid - 8), max: mid + 12 };
}

export function formatETA(min: number, max: number): string {
  return `${min}-${max} min`;
}

export function generateOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SS${y}${m}${day}-${rand}`;
}

// ─── Coupon system ────────────────────────────────────────────
export type Coupon = {
  code: string;
  description: string;
  discountType: "percent" | "flat" | "free_delivery";
  discountValue: number; // percent (0-100) or flat amount in INR
  minOrder: number;
  categorySlug?: string; // restrict to a category (e.g. "sweets" for SWEET15)
};

export const COUPONS: Coupon[] = [
  { code: "WELCOME10", description: "10% off on your first order", discountType: "percent", discountValue: 10, minOrder: 200 },
  { code: "SWEET15", description: "15% off on sweets & bakery", discountType: "percent", discountValue: 15, minOrder: 300, categorySlug: "sweets" },
  { code: "FREESHIP", description: "Free delivery on any order", discountType: "free_delivery", discountValue: 0, minOrder: 150 },
];

export type CouponResult = {
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  freeDelivery: boolean;
  error?: string;
};

/**
 * Validate a coupon code against the current cart.
 * - cartSubtotal: total of all items
 * - deliveryFee: current delivery fee
 * - categorySubtotals: map of categorySlug → subtotal (for category-restricted coupons)
 */
export function validateCoupon(
  code: string,
  cartSubtotal: number,
  deliveryFee: number,
  categorySubtotals?: Record<string, number>
): CouponResult {
  const coupon = COUPONS.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
  if (!coupon) {
    return { valid: false, discountAmount: 0, freeDelivery: false, error: "Invalid coupon code" };
  }
  if (cartSubtotal < coupon.minOrder) {
    return { valid: false, discountAmount: 0, freeDelivery: false, error: `Minimum order ₹${coupon.minOrder} required (you have ₹${Math.round(cartSubtotal)})` };
  }

  // Category-restricted coupon: only applies to that category's subtotal
  let applicableBase = cartSubtotal;
  if (coupon.categorySlug) {
    applicableBase = categorySubtotals?.[coupon.categorySlug] ?? 0;
    if (applicableBase === 0) {
      return { valid: false, discountAmount: 0, freeDelivery: false, error: `Add ${coupon.categorySlug} items to use this coupon` };
    }
  }

  if (coupon.discountType === "percent") {
    const discount = Math.round((applicableBase * coupon.discountValue) / 100);
    return { valid: true, coupon, discountAmount: discount, freeDelivery: false };
  }
  if (coupon.discountType === "flat") {
    return { valid: true, coupon, discountAmount: coupon.discountValue, freeDelivery: false };
  }
  if (coupon.discountType === "free_delivery") {
    return { valid: true, coupon, discountAmount: deliveryFee, freeDelivery: true };
  }
  return { valid: false, discountAmount: 0, freeDelivery: false, error: "Unknown coupon type" };
}
