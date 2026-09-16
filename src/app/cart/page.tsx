"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useCart } from "@/lib/store";
import { formatINR, calculateDeliveryFee, BUSINESS, haversineKm } from "@/lib/constants";
import { Minus, Plus, Trash2, ShoppingBag, MapPin, ArrowRight, Truck, AlertCircle, Sparkles, Tag, X, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-browser";
import { useState, useEffect, useMemo } from "react";
import { ProductCard, type ProductItem } from "@/components/site/product-card";
import type { CouponResult } from "@/lib/constants";

// Delivery plan configuration
const ZONE_1_MAX = 2;      // 0-2km: free, min ₹300
const ZONE_2_MAX = 5;       // 2-5km: gradient ₹50→₹60, min ₹700
const ZONE_3_MAX = 7;       // 5-7km: gradient ₹60→₹70, min ₹999
const MIN_ORDER_1 = 300;
const MIN_ORDER_2 = 700;
const MIN_ORDER_3 = 999;

/** Calculate minimum order value based on distance zone */
function getMinOrderForDistance(distanceKm: number): number {
  if (distanceKm <= ZONE_1_MAX) return MIN_ORDER_1;
  if (distanceKm <= ZONE_2_MAX) return MIN_ORDER_2;
  return MIN_ORDER_3;
}

/** Calculate the delivery fee gradient (₹50 at 2km → ₹70 at 7km) */
function calculateGradientFee(distanceKm: number): number {
  if (distanceKm <= ZONE_1_MAX) return 0;
  // Linear scale from ₹50 at 2km to ₹70 at 7km
  const ratio = (distanceKm - ZONE_1_MAX) / (ZONE_3_MAX - ZONE_1_MAX);
  const raw = 50 + (70 - 50) * ratio;
  return Math.round(raw);
}

export default function CartPage() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setSession(session);
      setAuthChecking(false);
    });
  }, []);

  // ─── Coupon state ───
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  const [showCouponsPopup, setShowCouponsPopup] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const address = useCart((s) => s.address);
  const subtotal = useCart((s) => s.subtotal());

  const distance = address?.distanceKm ?? 0;
  const fee = address ? calculateDeliveryFee(distance, subtotal) : undefined;
  const outOfRange = address && (distance > BUSINESS.deliveryRadiusKm);

  // ─── Coupon discount calculation ───
  const discountAmount = appliedCoupon?.valid ? appliedCoupon.discountAmount : 0;
  const freeDelivery = appliedCoupon?.valid && appliedCoupon.freeDelivery;
  const effectiveDeliveryFee = freeDelivery ? 0 : (fee ?? 0);
  const total = Math.max(0, subtotal - discountAmount) + effectiveDeliveryFee;

  // Coupon apply function
  const applyCoupon = async (explicitCode?: string) => {
    const code = explicitCode || couponCode;
    if (!code.trim()) { toast.error("Enter a coupon code"); return; }
    try {
      // Extract phone from auth session for coupon validation
      const phoneDigits = session?.user?.user_metadata?.phone?.replace(/\D/g, "").slice(-10) || "";
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, cartSubtotal: subtotal, deliveryFee: fee ?? 0, phone: phoneDigits || undefined }),
      });
      const result = await res.json();
      if (result.valid) {
        setAppliedCoupon(result);
        setCouponCode(code);
        toast.success(`Coupon ${result.coupon?.code} applied!`, { description: result.freeDelivery ? "Free delivery activated" : `You saved ${formatINR(result.discountAmount)}` });
      } else {
        setAppliedCoupon(null);
        toast.error("Coupon invalid", { description: result.error });
      }
    } catch {
      toast.error("Failed to validate coupon");
    }
  };

  // Load available coupons
  const loadCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res = await fetch("/api/coupons", { cache: "no-store" });
      const d = await res.json();
      setAvailableCoupons(d.coupons || []);
    } catch {}
    setCouponsLoading(false);
  };

  const copyCouponCode = (code: string) => {
    try { navigator.clipboard?.writeText(code); } catch {}
    setCopiedCode(code);
    toast.success(`Coupon ${code} copied!`);
    setTimeout(() => setCopiedCode(c => c === code ? null : c), 2000);
  };

  // Delivery indicator logic
  // The zone-based minimum order (₹300/₹700/₹999) is the DEFAULT. But if a
  // coupon with minOrder=0 is applied (like NEWUSER10 or BIRTHDAY10), the
  // coupon's minOrder takes precedence — the user can place the order with
  // any cart total, not just above ₹300.
  const zoneMinOrder = address ? getMinOrderForDistance(distance) : MIN_ORDER_1;
  const couponMinOrder = appliedCoupon?.valid ? 0 : null; // coupons with minOrder=0 override
  const minOrder = couponMinOrder !== null ? couponMinOrder : zoneMinOrder;
  const gradientFee = address ? calculateGradientFee(distance) : 0;
  const meetsMinOrder = subtotal >= minOrder;
  const remainingForMinOrder = Math.max(0, minOrder - subtotal);
  const isFreeDelivery = distance <= ZONE_1_MAX && meetsMinOrder;

  // ─── "You might also like" suggestions (Swiggy/Zomato-style) ───
  // Fetches the full menu once (only when the cart has items), then filters
  // items client-side based on what's already in the cart.
  const [allMenuItems, setAllMenuItems] = useState<ProductItem[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (lines.length === 0) return;
    let cancelled = false;
    setSuggestionsLoading(true);
    fetch("/api/menu", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { categories?: Array<{ slug: string; items: any[] }> }) => {
        if (cancelled) return;
        const flat: ProductItem[] = (d.categories || []).flatMap((c) =>
          (c.items || []).map((it) => ({ ...it, _categorySlug: c.slug } as ProductItem & { _categorySlug: string }))
        );
        setAllMenuItems(flat);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lines.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute "You might also like" suggestions based on what's in the cart.
  const suggestions = useMemo(() => {
    if (allMenuItems.length === 0 || lines.length === 0) return [];

    // Build a set of cart item IDs (to exclude them from suggestions)
    const cartItemIds = new Set(lines.map((l) => l.itemId));

    // Build a lookup of cart items → their category slugs
    const cartCategorySlugs = new Set<string>();
    for (const l of lines) {
      const it = allMenuItems.find((m) => m.id === l.itemId) as any;
      if (it?._categorySlug) cartCategorySlugs.add(it._categorySlug);
    }

    // Helper: items in a given category slug (case-insensitive partial match), excluding cart items
    const itemsInCategory = (keyword: string) =>
      allMenuItems.filter(
        (it) =>
          !cartItemIds.has(it.id) &&
          (it as any)._categorySlug &&
          (it as any)._categorySlug.toLowerCase().includes(keyword)
      );

    // Helper: items whose name contains a keyword, excluding cart items
    const itemsByName = (keywords: string[]) =>
      allMenuItems.filter((it) => {
        if (cartItemIds.has(it.id)) return false;
        const name = (it.name || "").toLowerCase();
        return keywords.some((k) => name.includes(k));
      });

    const hasPizza = [...cartCategorySlugs].some((s) => s.toLowerCase().includes("pizza"));
    const hasBurger = [...cartCategorySlugs].some((s) => s.toLowerCase().includes("burger"));
    const hasSweets = [...cartCategorySlugs].some((s) => s.toLowerCase().includes("sweet"));
    const hasChinese = [...cartCategorySlugs].some((s) => s.toLowerCase().includes("chinese"));

    let pool: ProductItem[] = [];
    if (hasPizza) {
      // Pizza → suggest cold drinks/beverages
      pool = [
        ...itemsInCategory("beverage"),
        ...itemsInCategory("ice-cream"),
        ...itemsByName(["cold drink", "coke", "pepsi", "sprite", "lassi", "shake", "juice", "mojito"]),
      ];
    }
    if (hasBurger) {
      // Burger → suggest fries/beverages
      pool = [
        ...pool,
        ...itemsInCategory("snacks"),
        ...itemsInCategory("beverage"),
        ...itemsByName(["fries", "wedges", "coke", "pepsi", "sprite", "cold drink", "shake"]),
      ];
    }
    if (hasSweets) {
      // Sweets → suggest chai/beverages
      pool = [
        ...pool,
        ...itemsInCategory("beverage"),
        ...itemsByName(["chai", "tea", "coffee", "lassi", "milk", "cold coffee"]),
      ];
    }
    if (hasChinese) {
      // Chinese → suggest momos/manchurian
      pool = [
        ...pool,
        ...itemsByName(["momo", "manchurian", "noodle", "spring roll", "soup", "schezwan"]),
      ];
    }

    // Deduplicate
    const seen = new Set<string>();
    let deduped = pool.filter((it) => {
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });

    // Fallback: if no specific suggestions matched, use best sellers + featured
    if (deduped.length === 0) {
      deduped = allMenuItems.filter(
        (it) => !cartItemIds.has(it.id) && ((it as any).bestSeller || (it as any).featured)
      );
    }

    // Final fallback: top-rated items
    if (deduped.length === 0) {
      deduped = allMenuItems.filter((it) => !cartItemIds.has(it.id));
    }

    // Sort: best sellers first, then by rating desc — limit to 10
    return deduped
      .sort((a: any, b: any) => {
        if (a.bestSeller !== b.bestSeller) return a.bestSeller ? -1 : 1;
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, 10);
  }, [allMenuItems, lines]);

  if (lines.length === 0) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 md:pb-8 text-center">
          <div className="grid h-24 w-24 place-items-center rounded-full" style={{ background: "#F5E8CF" }}>
            <ShoppingBag style={{ width: 40, height: 40, color: "#D4A83E" }} />
          </div>
          <h1 className="mt-4 text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Your cart is empty</h1>
          <p className="mt-1 text-sm" style={{ color: "#76544A" }}>Add some authentic flavours to get started.</p>
          <button
            onClick={() => router.push("/menu")}
            className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}
          >
            Browse Menu <ArrowRight style={{ width: 14, height: 14, color: "#E5B84B" }} />
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-40">
        <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>
              Your Cart
            </h1>
            <button onClick={() => { clear(); toast.success("Cart cleared"); }} className="text-xs font-semibold" style={{ color: "#76544A" }}>
              Clear all
            </button>
          </div>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Items */}
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={`${l.itemId}-${l.variant.label}`} className="flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl" style={{ background: "#F5E8CF" }}>
                  {l.image ? (
                     
                    <img src={l.image} alt={l.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xl font-bold" style={{ color: "#641C27" }}>{l.name.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{l.name}</h3>
                  <p className="text-xs" style={{ color: "#76544A" }}>{l.variant.label} · {formatINR(l.variant.price)}</p>
                  <div className="mt-1.5 inline-flex items-center gap-2 rounded-lg border px-2 py-1" style={{ borderColor: "#E8D9B8" }}>
                    <button onClick={() => setQty(l.itemId, l.variant.label, l.qty - 1)} className="grid h-6 w-6 place-items-center rounded" style={{ background: "#F5E8CF", color: "#641C27" }} aria-label="Decrease"><Minus style={{ width: 12, height: 12 }} /></button>
                    <span className="min-w-5 text-center text-sm font-bold" style={{ color: "#3D1018" }}>{l.qty}</span>
                    <button onClick={() => setQty(l.itemId, l.variant.label, l.qty + 1)} className="grid h-6 w-6 place-items-center rounded" style={{ background: "#F5E8CF", color: "#641C27" }} aria-label="Increase"><Plus style={{ width: 12, height: 12 }} /></button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(l.variant.price * l.qty)}</div>
                  <button onClick={() => remove(l.itemId, l.variant.label)} className="text-red-500" aria-label="Remove"><Trash2 style={{ width: 16, height: 16 }} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* ─── You might also like (Swiggy/Zomato-style suggestions) ─── */}
          {(suggestionsLoading || suggestions.length > 0) && (
            <section className="mt-5">
              <div className="flex items-center gap-2 px-1">
                <span className="h-4 w-1 rounded-full" style={{ background: "#D4A83E" }} />
                <h2 className="text-base font-semibold sm:text-lg" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>
                  You might also like
                </h2>
                <Sparkles style={{ width: 14, height: 14, color: "#76544A" }} />
              </div>
              <div className="gold-divider mt-2 mb-3">
                <svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden>
                  <path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" />
                </svg>
              </div>
              {suggestionsLoading ? (
                <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="skeleton shrink-0 rounded-2xl border"
                      style={{ width: 200, height: 260, borderColor: "#E8D9B8", background: "#F5E8CF", animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
                  {suggestions.map((it, i) => (
                    <div
                      key={it.id}
                      className="shrink-0 animate-card-pop"
                      style={{ width: 200, animationDelay: `${Math.min(i * 50, 300)}ms` }}
                    >
                      <div className="h-full rounded-2xl border" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", overflow: "hidden" }}>
                        <ProductCard item={it} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Delivery address + delivery fee indicator */}
          <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <div className="flex items-center gap-2">
              <MapPin style={{ width: 16, height: 16, color: "#D4A83E" }} />
              <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Delivery Address</h3>
            </div>
            {address ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: "#F5E8CF", color: "#641C27" }}>{address.label}</span>
                  {address.isDefault && <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: "#D4A83E", color: "#3D1018" }}>Default</span>}
                </div>
                <p className="mt-1 text-sm font-medium" style={{ color: "#3D1018" }}>{address.fullAddress}</p>
                <p className="text-xs" style={{ color: "#76544A" }}>PIN: {address.pincode} · {distance.toFixed(2)} km away</p>

                {/* === DELIVERY FEE INDICATOR (like Apna Baithak) === */}
                {outOfRange ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg p-2.5" style={{ background: "#FEE2E2" }}>
                    <AlertCircle style={{ width: 16, height: 16, color: "#B91C1C", flexShrink: 0 }} />
                    <p className="text-xs font-semibold text-red-600">
                      Beyond {BUSINESS.deliveryRadiusKm} km — delivery not available at this location.
                    </p>
                  </div>
                ) : !meetsMinOrder ? (
                  <div className="mt-3 rounded-lg p-3" style={{ background: "#FEF3C7" }}>
                    <div className="flex items-center gap-2">
                      <Truck style={{ width: 16, height: 16, color: "#92400E", flexShrink: 0 }} />
                      <p className="text-xs font-semibold" style={{ color: "#92400E" }}>
                        Add {formatINR(remainingForMinOrder)} more to place your order
                      </p>
                    </div>
                    <div className="mt-2 h-2 rounded-full" style={{ background: "#FDE68A" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (subtotal / minOrder) * 100)}%`,
                          background: "linear-gradient(90deg, #D4A83E, #E5B84B)",
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px]" style={{ color: "#92400E" }}>
                      {distance <= ZONE_1_MAX ? (
                        <>Min order {formatINR(minOrder)} for 0-2km zone · <strong>FREE delivery</strong> once reached</>
                      ) : distance <= ZONE_2_MAX ? (
                        <>Min order {formatINR(minOrder)} for {ZONE_1_MAX}-{ZONE_2_MAX}km zone · delivery fee {formatINR(gradientFee)} applies</>
                      ) : (
                        <>Min order {formatINR(minOrder)} for {ZONE_2_MAX}-{ZONE_3_MAX}km zone · delivery fee {formatINR(gradientFee)} applies</>
                      )}
                    </p>
                  </div>
                ) : isFreeDelivery ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg p-2.5" style={{ background: "#D1FAE5" }}>
                    <Truck style={{ width: 16, height: 16, color: "#2F6B45", flexShrink: 0 }} />
                    <p className="text-xs font-semibold" style={{ color: "#2F6B45" }}>
                      ✓ Free delivery applied! You're within 2km and above {formatINR(MIN_ORDER_1)}.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 rounded-lg p-2.5" style={{ background: "#F5E8CF" }}>
                    <Truck style={{ width: 16, height: 16, color: "#641C27", flexShrink: 0 }} />
                    <p className="text-xs font-semibold" style={{ color: "#641C27" }}>
                      Delivery fee: {formatINR(gradientFee)} · {distance.toFixed(1)} km from shop
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-xs" style={{ color: "#76544A" }}>Select a delivery address to see delivery charges.</p>
                <div className="mt-2 rounded-lg p-2.5" style={{ background: "#F5E8CF" }}>
                  <p className="text-[11px] font-semibold" style={{ color: "#641C27" }}>Delivery Plan:</p>
                  <p className="mt-1 text-[10px]" style={{ color: "#76544A" }}>0-2km: FREE (min ₹{MIN_ORDER_1})</p>
                  <p className="text-[10px]" style={{ color: "#76544A" }}>2-5km: ₹50-₹60 (min ₹{MIN_ORDER_2})</p>
                  <p className="text-[10px]" style={{ color: "#76544A" }}>5-7km: ₹60-₹70 (min ₹{MIN_ORDER_3})</p>
                </div>
              </div>
            )}
            <button onClick={() => router.push("/address")} className="mt-3 inline-flex items-center gap-1 text-xs font-bold" style={{ color: "#641C27" }}>
              {address ? "Change address" : "Select address"} →
            </button>
          </div>

          {/* Coupon code section — moved here from checkout so users can
              apply coupons directly in the cart before proceeding to checkout */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: appliedCoupon?.valid ? "#2F6B45" : "#E8D9B8", background: "#FFFFFF" }}>
            <div className="flex items-center gap-2">
              <Tag style={{ width: 16, height: 16, color: "#D4A83E" }} />
              <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Apply Coupon</h3>
            </div>
            {appliedCoupon?.valid ? (
              <div className="mt-3 flex items-center justify-between rounded-xl p-3" style={{ background: "#2F6B4522" }}>
                <div>
                  <span className="text-xs font-bold" style={{ color: "#2F6B45" }}>✓ {appliedCoupon.coupon?.code} applied</span>
                  <p className="text-[10px]" style={{ color: "#76544A" }}>
                    {appliedCoupon.freeDelivery ? "Free delivery" : `You save ${formatINR(appliedCoupon.discountAmount)}`}
                  </p>
                </div>
                <button
                  onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                  className="rounded-full px-3 py-1 text-[10px] font-bold"
                  style={{ background: "#B91C1C22", color: "#B91C1C" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="mt-3 flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-xl border px-3 py-2 text-sm uppercase tracking-wider focus:outline-none"
                    style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }}
                    onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }}
                  />
                  <button
                    onClick={() => applyCoupon()}
                    className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide"
                    style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
                  >
                    Apply
                  </button>
                </div>
                <button
                  onClick={() => { if (availableCoupons.length === 0) loadCoupons(); setShowCouponsPopup(true); }}
                  className="mt-2 text-xs font-semibold"
                  style={{ color: "#641C27" }}
                >
                  View Available Coupons →
                </button>
              </>
            )}
          </div>

          {/* Bill */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Bill Details</h3>
            <div className="mt-2 space-y-1.5 text-sm">
              <Row label="Item total" value={formatINR(subtotal)} />
              {discountAmount > 0 && (
                <Row label="Coupon discount" value={`-${formatINR(discountAmount)}`} color="#2F6B45" />
              )}
              <Row label="Delivery fee" value={effectiveDeliveryFee === 0 ? "FREE" : formatINR(effectiveDeliveryFee)} />
              <div className="my-2 h-px" style={{ background: "#E8D9B8" }} />
              <Row label="To Pay" value={formatINR(total)} bold />
            </div>
          </div>
        </div>
      </main>

      {/* Sticky checkout bar — bottom-16 on mobile sits above the bottom nav;
          on desktop (md+) the bottom nav is hidden so we drop to bottom-6. */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 md:bottom-6" style={{ background: "#FFFFFF", borderColor: "#E8D9B8" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>{lines.length} item{lines.length !== 1 ? "s" : ""}</div>
            <div className="text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(total)}</div>
          </div>
          <button
            onClick={() => {
              // Sign-in gating (matching Apna Baithak)
              if (!authChecking && !authed) {
                toast.info("Please sign in to place your order");
                router.push(`/login?returnTo=/cart`);
                return;
              }
              if (!address) { toast.error("Select a delivery address first"); router.push("/address"); return; }
              if (outOfRange) { toast.error("Out of delivery range"); router.push("/address"); return; }
              if (!meetsMinOrder) {
                toast.error(`Minimum order is ${formatINR(minOrder)}`, { description: `Add ${formatINR(remainingForMinOrder)} more to place your order.` });
                return;
              }
              // Pass applied coupon info to checkout via URL params
              const couponParam = appliedCoupon?.valid ? `&couponCode=${encodeURIComponent(appliedCoupon.coupon?.code || "")}&discount=${discountAmount}&freeDelivery=${freeDelivery ? 1 : 0}` : "";
              router.push(`/checkout${couponParam ? `?${couponParam.slice(1)}` : ""}`);
            }}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02]"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}
          >
            {authChecking ? "Loading..." : !authed ? "Sign in to order" : "Place Order"} <ArrowRight style={{ width: 14, height: 14, color: "#E5B84B" }} />
          </button>
        </div>
      </div>

      {/* Available coupons popup */}
      {showCouponsPopup && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" style={{ zIndex: 100 }} onClick={() => setShowCouponsPopup(false)}>
          <div className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl" style={{ background: "#FFF8E8" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Available Coupons</h2>
              <button onClick={() => setShowCouponsPopup(false)} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "#F5E8CF" }}>
                <X style={{ width: 16, height: 16, color: "#641C27" }} />
              </button>
            </div>
            <p className="mt-1 text-[10px]" style={{ color: "#76544A" }}>Only one coupon can be applied per order.</p>
            <div className="mt-4 space-y-3">
              {couponsLoading ? (
                <div className="skeleton h-20 rounded-2xl" />
              ) : availableCoupons.length === 0 ? (
                <p className="text-center text-sm" style={{ color: "#76544A" }}>No coupons available right now.</p>
              ) : (
                availableCoupons.map((c) => (
                  <div key={c.code} className="flex items-stretch overflow-hidden rounded-2xl border" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center p-2 text-center" style={{ background: c.discountType === "free_delivery" ? "#2F6B45" : "#641C27" }}>
                      <span className="text-sm font-extrabold" style={{ color: "#E5B84B" }}>
                        {c.discountType === "percent" ? `${c.discountValue}%` : c.discountType === "free_delivery" ? "FREE" : `₹${c.discountValue}`}
                      </span>
                      <span className="text-[7px] font-bold uppercase" style={{ color: "#FFF8E8" }}>{c.discountType === "free_delivery" ? "DELIVERY" : "OFF"}</span>
                    </div>
                    <div className="flex-1 p-2.5">
                      <p className="text-[11px] font-semibold" style={{ color: "#3D1018" }}>{c.description}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: "#F5E8CF", color: "#641C27" }}>{c.code}</span>
                        <button onClick={() => copyCouponCode(c.code)} className="text-[9px] font-bold" style={{ color: "#641C27" }}>
                          {copiedCode === c.code ? "✓ Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => { applyCoupon(c.code); setShowCouponsPopup(false); }}
                          className="ml-auto rounded-full px-3 py-1 text-[10px] font-bold"
                          style={{ background: "#641C27", color: "#FFF8E8" }}
                        >
                          Apply
                        </button>
                      </div>
                      {c.minOrder > 0 && <p className="mt-1 text-[9px]" style={{ color: "#76544A" }}>Min order {formatINR(c.minOrder)}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: color || (bold ? "#3D1018" : "#76544A"), fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ color: color || (bold ? "#641C27" : "#3D1018"), fontWeight: bold ? 700 : 500, fontFamily: bold ? "var(--font-poppins)" : "var(--font-outfit)" }}>{value}</span>
    </div>
  );
}
