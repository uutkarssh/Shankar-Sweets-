// Shankar Sweets & Bakery — brand & business constants

export const BUSINESS = {
  name: "Shankar Sweets & Bakery",
  tagline: "Taste the Tradition",
  sinceYear: 1962,
  address: "Pillar no. 27-28, Baraut, Prayagraj",
  phones: ["7618866717", "8423452102"],
  lat: 25.336578,
  lng: 82.266731,
  deliveryRadiusKm: 5,
  freeDeliveryThreshold: 300,
  minDeliveryFee: 10,
  maxDeliveryFee: 70,
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

/**
 * Delivery fee calculation for Shankar Sweets & Bakery.
 * - Hard cutoff at 5km (returns null if beyond).
 * - Orders above ₹300 within 5km: FREE (returns 0).
 * - Orders at or below ₹300 within 5km: scales linearly from ₹10 at 0km to ₹70 at 5km,
 *   minimum ₹10, rounded to nearest ₹5.
 */
export function calculateDeliveryFee(distanceKm: number, subtotal: number): number | null {
  const radius = BUSINESS.deliveryRadiusKm;
  if (distanceKm > radius) return null; // out of range
  if (subtotal > BUSINESS.freeDeliveryThreshold) return 0;
  const min = BUSINESS.minDeliveryFee;
  const max = BUSINESS.maxDeliveryFee;
  const ratio = Math.min(Math.max(distanceKm, 0) / radius, 1);
  const raw = min + (max - min) * ratio;
  const rounded = Math.round(raw / 5) * 5;
  return Math.max(min, rounded);
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

export function generateOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SS${y}${m}${day}-${rand}`;
}
