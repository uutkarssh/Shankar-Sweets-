"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useCart } from "@/lib/store";
import { BUSINESS, calculateDeliveryFee, formatINR, generateOrderNumber, estimateDeliveryMinutes, formatETA, type CouponResult } from "@/lib/constants";
import { ChevronLeft, CreditCard, Banknote, Upload, CheckCircle2, Clock, Tag, X, Check, Share2, Download, Award, MapPin, Phone, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-browser";

export default function CheckoutPageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center" style={{ background: "#FFF8E8" }}><div className="w-full max-w-3xl space-y-4 px-4 py-6"><div className="skeleton h-6 w-32 skeleton-delay-1" /><div className="skeleton h-32 rounded-2xl skeleton-delay-2" /><div className="skeleton h-24 rounded-2xl skeleton-delay-3" /><div className="skeleton h-12 rounded-full skeleton-delay-4" /></div></div>}>
      <CheckoutPage />
    </Suspense>
  );
}

function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmedOrder = searchParams.get("confirmed");
  const confirmedStatus = searchParams.get("status");
  // Coupon info passed from cart page via URL params
  const urlCouponCode = searchParams.get("couponCode");
  const urlDiscount = searchParams.get("discount");
  const urlFreeDelivery = searchParams.get("freeDelivery") === "1";
  const lines = useCart((s) => s.lines);
  const address = useCart((s) => s.address);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const setNotes = useCart((s) => s.setNotes);
  const storedNotes = useCart((s) => s.notes);

  // Profile from Supabase auth
  const [profile, setProfile] = useState<{ email: string; name: string | null; phone: string | null } | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  const [notes, setNotesState] = useState(storedNotes);
  const [method, setMethod] = useState<"COD" | "UPI">("COD");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  const [placedMethod, setPlacedMethod] = useState<"COD" | "UPI">("COD");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  // Available coupons popup (Swiggy/Zomato-style "View Available Coupons")
  const [showCouponsPopup, setShowCouponsPopup] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Array<{
    code: string;
    description: string;
    discountType: string;
    discountValue: number;
    minOrder: number;
    categorySlug?: string | null;
  }>>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  // Track the last created UPI order so a second tap navigates to its payment
  // page instead of creating a duplicate order.
  const [upiOrderCreated, setUpiOrderCreated] = useState<{ orderNum: string; orderId: string; amount: number } | null>(null);

  // Fetch user profile on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        toast.error("Please sign in first");
        router.push("/login?returnTo=/checkout");
        return;
      }
      try {
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const d = await res.json();
        setProfile(d.profile);
        // If profile has no phone, show phone prompt
        if (!d.profile?.phone) {
          setShowPhonePrompt(true);
        }
      } catch {
        toast.error("Failed to load profile");
      }
    });
  }, [router]);

  const distance = address?.distanceKm ?? 0;
  const fee = address ? calculateDeliveryFee(distance, subtotal) : undefined;
  const outOfRange = address && fee === null;

  // ─── Coupon discount — read from URL params (applied in cart page) ───
  const discountAmount = urlCouponCode ? Number(urlDiscount || 0) : 0;
  const freeDelivery = urlCouponCode ? urlFreeDelivery : false;
  const effectiveDeliveryFee = freeDelivery ? 0 : (fee ?? 0);
  const total = Math.max(0, subtotal - discountAmount) + effectiveDeliveryFee;

  const applyCoupon = async (explicitCode?: string) => {
    const code = (explicitCode ?? couponCode).trim();
    if (!code) { toast.error("Enter a coupon code"); return; }
    // Extract the user's 10-digit phone so the server can enforce one-time-use
    // coupons (NEWUSER10 / BIRTHDAY10) by looking up their order history.
    const phoneDigits = (profile?.phone || "").replace(/\D/g, "").slice(-10);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          cartSubtotal: subtotal,
          deliveryFee: fee ?? 0,
          phone: phoneDigits || undefined,
        }),
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

  // Fetch active coupons and open the "Available Coupons" popup.
  const openAvailableCoupons = async () => {
    setShowCouponsPopup((s) => !s);
    if (availableCoupons.length > 0) return; // already loaded
    setCouponsLoading(true);
    try {
      const res = await fetch("/api/coupons", { cache: "no-store" });
      const d = await res.json();
      setAvailableCoupons(Array.isArray(d.coupons) ? d.coupons : []);
    } catch {
      toast.error("Could not load coupons");
    } finally {
      setCouponsLoading(false);
    }
  };

  const selectCoupon = (code: string) => {
    setShowCouponsPopup(false);
    setCouponCode(code);
    setAppliedCoupon(null);
    // Defer apply so the input state settles before validation
    setTimeout(() => applyCoupon(code), 0);
  };

  const copyCouponFromPopup = (code: string) => {
    try { navigator.clipboard?.writeText(code); } catch {}
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
  };

  const formatCouponDiscount = (c: { discountType: string; discountValue: number }) => {
    if (c.discountType === "percent") return `${c.discountValue}% OFF`;
    if (c.discountType === "free_delivery") return "FREE DELIVERY";
    return `${formatINR(c.discountValue)} OFF`;
  };

  // Phone validation: user must have phone before placing order
  const hasPhone = !!profile?.phone && profile.phone.replace(/\D/g, "").length >= 10;
  const canPlace = !!address && !outOfRange && lines.length > 0 && hasPhone;

  const savePhone = async () => {
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setSavingPhone(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ phone: digits }),
      });
      const d = await res.json();
      if (d.profile) {
        setProfile(d.profile);
        setShowPhonePrompt(false);
        toast.success("Phone number saved");
      }
    } catch {
      toast.error("Failed to save phone");
    } finally {
      setSavingPhone(false);
    }
  };

  const place = async () => {
    // ─── Guard: if a UPI order was already created, navigate to its payment
    // page instead of creating a duplicate. This prevents the "stuck on
    // PLACING" dead-end when the user taps "Place Order" a second time
    // after the first UPI order was already created but navigation didn't
    // complete (e.g. due to a slow connection or browser quirk). ───
    if (upiOrderCreated) {
      router.push(`/payment?order=${upiOrderCreated.orderNum}&id=${upiOrderCreated.orderId}&amount=${upiOrderCreated.amount}`);
      return;
    }

    if (!canPlace) {
      if (!hasPhone) {
        toast.error("Phone number required", { description: "Please enter your phone number to proceed." });
        return;
      }
      toast.error("Complete the checkout", { description: "Address and phone required." });
      return;
    }
    setPlacing(true);
    setNotes(notes);
    try {
      const orderNumber = generateOrderNumber();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          customerName: profile?.name || profile?.email?.split("@")[0] || "Customer",
          customerPhone: profile?.phone || "",
          customerEmail: profile?.email || "",
          address: address!.fullAddress,
          landmark: address!.landmark,
          pincode: address!.pincode,
          lat: address!.lat,
          lng: address!.lng,
          distanceKm: address!.distanceKm,
          items: lines,
          subtotal,
          deliveryFee: effectiveDeliveryFee,
          discount: discountAmount,
          couponCode: urlCouponCode || null,
          total,
          paymentMethod: method,
          paymentScreenshot: null, // Screenshot uploaded on /payment page for UPI
          notes,
        }),
      });
      if (!res.ok) throw new Error("Order failed");
      const data = await res.json();
      const orderNum = data.orderNumber || orderNumber;
      if (method === "UPI") {
        // ─── UPI: navigate to the payment page immediately. ───
        // Record the created order so a second tap navigates to the payment
        // page instead of creating a duplicate.
        setUpiOrderCreated({ orderNum, orderId: data.orderId, amount: total });
        toast.success("Order placed! Complete UPI payment");
        // Use router.replace so the checkout page isn't in the browser history
        // (pressing Back won't return to a stale checkout with an already-placed order).
        router.replace(`/payment?order=${orderNum}&id=${data.orderId}&amount=${total}`);
        // NOTE: Do NOT clear the cart yet — it will be cleared after payment
        // is confirmed on the /payment page or the /checkout confirmation screen.
        // Do NOT set placing=false here — the navigation is in flight and we
        // want the button to stay disabled until the page changes.
        return;
      } else {
        // COD: go straight to confirmation
        setPlaced(orderNum);
        setPlacedMethod("COD");
        toast.success("Order placed!", { description: orderNum });
      }
    } catch {
      toast.error("Could not place order", { description: "Please try again or call us." });
      setPlacing(false);
    }
    // For COD, set placing=false (for UPI we returned early above)
    if (method !== "UPI") {
      setPlacing(false);
    }
  };

  // ─── Order confirmed screen ───
  // ─── Confirmation screen (from COD placement or /payment redirect) ───
  const showConfirmation = placed || confirmedOrder;
  const confirmationOrderNum = placed || confirmedOrder || "";
  const isPendingVerification = confirmedStatus === "PENDING_VERIFICATION" || placedMethod === "UPI";

  // Clear cart when confirmation screen shows (covers both COD and UPI flows)
  useEffect(() => {
    if (showConfirmation) {
      clear();
    }
  }, [showConfirmation, clear]);

  if (showConfirmation) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex-1 pb-24 md:pb-8">
          <div className="mx-auto max-w-3xl px-3 pt-6 sm:px-4">
            {/* Hero */}
            <div className="text-center">
              {isPendingVerification ? (
                <>
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full" style={{ background: "#FEF3C7" }}>
                    <Clock style={{ width: 40, height: 40, color: "#92400E" }} />
                  </div>
                  <h1 className="mt-3 text-xl font-bold" style={{ color: "#92400E", fontFamily: "var(--font-poppins)" }}>Payment Under Review</h1>
                  <p className="mt-1 max-w-xs mx-auto text-xs" style={{ color: "#76544A" }}>We couldn't automatically verify your payment, but your order has been placed. Our team will confirm your payment shortly.</p>
                </>
              ) : (
                <>
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full" style={{ background: "#641C27" }}>
                    <CheckCircle2 style={{ width: 40, height: 40, color: "#E5B84B" }} />
                  </div>
                  <h1 className="mt-3 text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Order Confirmed!</h1>
                  <p className="mt-1 text-xs" style={{ color: "#76544A" }}>Thank you, {profile?.name || "friend"}! Your order has been received and is being prepared.</p>
                </>
              )}
            </div>
            <div className="gold-divider mt-4 mb-4 mx-auto max-w-xs"><svg width="24" height="10" viewBox="0 0 24 10" fill="none" aria-hidden><path d="M12 0 L15 5 L12 10 L9 5 Z" fill="#D4A83E" /></svg></div>

            {/* Order details card */}
            <div className="rounded-2xl border p-5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Order Number</div>
                  <div className="text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{confirmationOrderNum}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Payment</div>
                  <div className="text-sm font-bold" style={{ color: placedMethod === "UPI" ? "#92400E" : "#2F6B45" }}>{placedMethod === "UPI" ? "UPI (Pending)" : "Cash on Delivery"}</div>
                </div>
              </div>
              <div className="mt-3 h-px" style={{ background: "#E8D9B8" }} />
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs" style={{ color: "#76544A" }}>Estimated Delivery</div>
                <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#641C27" }}>
                  <Clock style={{ width: 14, height: 14, color: "#D4A83E" }} /> 25-45 min
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs" style={{ color: "#76544A" }}>Items</div>
                <div className="text-sm font-bold" style={{ color: "#3D1018" }}>{lines.length || "—"} item(s)</div>
              </div>
              {address && (
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="text-xs shrink-0" style={{ color: "#76544A" }}>Delivery to</div>
                  <div className="text-xs text-right" style={{ color: "#3D1018" }}>{address.fullAddress}, {address.pincode}</div>
                </div>
              )}
            </div>

            {/* What happens next */}
            <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#D4A83E", background: "#641C27", color: "#FFF8E8" }}>
              <h3 className="text-sm font-bold" style={{ color: "#E5B84B", fontFamily: "var(--font-poppins)" }}>What happens next?</h3>
              <div className="mt-2 space-y-1.5 text-xs" style={{ color: "rgba(255,248,232,0.9)" }}>
                <div className="flex items-start gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold" style={{ background: "#D4A83E", color: "#3D1018" }}>1</span>
                  Your order has been received by {BUSINESS.name}.
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold" style={{ background: "#D4A83E", color: "#3D1018" }}>2</span>
                  We'll start preparing your food shortly. You'll receive updates.
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold" style={{ background: "#D4A83E", color: "#3D1018" }}>3</span>
                  Our delivery partner will pick up your order and head your way.
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold" style={{ background: "#D4A83E", color: "#3D1018" }}>4</span>
                  Expected arrival: 25-45 minutes from now.
                </div>
              </div>
            </div>

            {/* Order policy */}
            <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#76544A" }}>Order Policy</h3>
              <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "#76544A" }}>
                By placing this order, you agree that orders cannot be cancelled or refunded once preparation begins at {BUSINESS.name}. Please ensure your contact number and delivery address are correct. For any issues, call us at {BUSINESS.phones[0]}.
              </p>
            </div>

            {/* Contact info */}
            <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#76544A" }}>Need Help?</h3>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="text-xs" style={{ color: "#3D1018" }}>Call us: <strong>{BUSINESS.phones[0]}</strong></div>
                  <div className="text-xs" style={{ color: "#3D1018" }}>Alt: <strong>{BUSINESS.phones[1]}</strong></div>
                </div>
                <a href={`tel:${BUSINESS.phones[0]}`} className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>Call Now</a>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button onClick={() => router.push("/orders")} className="flex-1 rounded-full py-3 text-sm font-bold uppercase tracking-wide" style={{ background: "#F5E8CF", color: "#641C27", border: "1px solid #641C27" }}>
                Track My Order
              </button>
              <button onClick={() => router.push("/")} className="flex-1 rounded-full py-3 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}>
                Back to Home
              </button>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ─── Empty cart guard ───
  if (lines.length === 0) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 md:pb-8 text-center">
          <p className="text-sm font-semibold" style={{ color: "#641C27" }}>Your cart is empty</p>
          <button onClick={() => router.push("/menu")} className="mt-4 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>Browse Menu</button>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ─── No address guard ───
  if (!address) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 md:pb-8 text-center">
          <MapPin style={{ width: 40, height: 40, color: "#D4A83E" }} />
          <p className="mt-2 text-sm font-semibold" style={{ color: "#641C27" }}>No delivery address selected</p>
          <p className="mt-1 text-xs" style={{ color: "#76544A" }}>Select an address to proceed to checkout.</p>
          <button onClick={() => router.push("/address")} className="mt-4 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>Select Address</button>
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
          <button onClick={() => router.push("/cart")} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#641C27" }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back to cart
          </button>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>Checkout</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Delivery address (read-only, with Change link) */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin style={{ width: 16, height: 16, color: "#D4A83E" }} />
                <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Delivering To</h3>
              </div>
              <button onClick={() => router.push("/address")} className="text-xs font-bold" style={{ color: "#641C27" }}>Change →</button>
            </div>
            <div className="mt-2 flex items-start gap-2">
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: "#F5E8CF", color: "#641C27" }}>{address.label}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: "#3D1018" }}>{address.fullAddress}</p>
                <p className="text-xs" style={{ color: "#76544A" }}>PIN: {address.pincode} · {distance.toFixed(2)} km away</p>
              </div>
            </div>
          </div>

          {/* Contact info from profile — no manual entry unless phone missing */}
          {profile && (
            <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Contact Details</h3>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "#641C27" }}>
                  <Phone style={{ width: 16, height: 16, color: "#E5B84B" }} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#3D1018" }}>{profile.name || profile.email}</div>
                  <div className="text-xs" style={{ color: "#76544A" }}>{profile.phone || "No phone number"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Phone prompt — only if user has no phone (e.g. Google OAuth without phone) */}
          {showPhonePrompt && (
            <div className="mt-3 rounded-2xl border p-4 animate-fade-in-up" style={{ borderColor: "#D4A83E", background: "#FFF8E8" }}>
              <h3 className="text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>Phone Number Required</h3>
              <p className="mt-1 text-xs" style={{ color: "#76544A" }}>Required for delivery — we'll call/SMS on this number.</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit phone number"
                  inputMode="numeric"
                  className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}
                />
                <button
                  onClick={savePhone}
                  disabled={savingPhone}
                  className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
                  style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
                >
                  {savingPhone ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* Order notes */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Order Notes</h3>
            <textarea value={notes} onChange={(e) => setNotesState(e.target.value)} rows={2} placeholder="Any special instructions..." className="mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
          </div>

          {/* Coupon — read-only display. The coupon is applied on the cart
              page; here we just show what was applied (if any). */}
          {urlCouponCode && (
            <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#2F6B45", background: "#F0FDF4" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "#2F6B45" }}>
                    <Check style={{ width: 14, height: 14, color: "#FFF8E8" }} />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold" style={{ color: "#2F6B45" }}>{urlCouponCode}</div>
                    <div className="text-[11px]" style={{ color: "#3D1018" }}>
                      {freeDelivery ? "Free delivery" : `Saved ${formatINR(discountAmount)}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/cart")}
                  className="text-[10px] font-bold underline"
                  style={{ color: "#641C27" }}
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Payment Method</h3>
            <div className="mt-3 space-y-2">
              <PayOption active={method === "COD"} onClick={() => setMethod("COD")} icon={Banknote} title="Cash on Delivery" desc="Pay with cash when your order arrives." />
              <PayOption active={method === "UPI"} onClick={() => setMethod("UPI")} icon={CreditCard} title="UPI Payment" desc="Pay via UPI app — you'll be taken to a payment page after placing your order." />
            </div>
            {method === "UPI" && (
              <div className="mt-3 flex items-center justify-between rounded-xl border p-3" style={{ borderColor: "#D4A83E", background: "#FFF8E8" }}>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>UPI ID</div>
                  <div className="text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{BUSINESS.upiId}</div>
                  <div className="text-[11px]" style={{ color: "#76544A" }}>{BUSINESS.upiPayeeName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Amount</div>
                  <div className="text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(total)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Bill */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Bill Details</h3>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between"><span style={{ color: "#76544A" }}>Item total</span><span style={{ color: "#3D1018", fontWeight: 600 }}>{formatINR(subtotal)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between animate-fade-in-up"><span style={{ color: "#2F6B45" }}>Coupon discount</span><span style={{ color: "#2F6B45", fontWeight: 600 }}>-{formatINR(discountAmount)}</span></div>}
              <div className="flex justify-between"><span style={{ color: "#76544A" }}>Delivery fee</span><span style={{ color: "#3D1018", fontWeight: 600 }}>{fee === undefined ? "—" : effectiveDeliveryFee === 0 ? "FREE" : formatINR(effectiveDeliveryFee)}</span></div>
              <div className="my-2 h-px" style={{ background: "#E8D9B8" }} />
              <div className="flex justify-between"><span className="font-semibold" style={{ color: "#3D1018" }}>To Pay</span><span className="font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(total)}</span></div>
              {discountAmount > 0 && <div className="mt-2 rounded-lg px-2 py-1 text-center text-[11px] font-semibold" style={{ background: "#2F6B4522", color: "#2F6B45" }}>You saved {formatINR(discountAmount + (freeDelivery ? (fee ?? 0) : 0))} on this order!</div>}
            </div>
          </div>

          {outOfRange && <div className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold text-red-600" style={{ background: "#FEE2E2" }}>Delivery not available at this address (beyond {BUSINESS.deliveryRadiusKm} km).</div>}
        </div>
      </main>

      {/* Sticky place order */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4" style={{ background: "#FFFFFF", borderColor: "#E8D9B8" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Total</div>
            <div className="text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(total)}</div>
          </div>
          <button
            onClick={place}
            disabled={!canPlace || placing}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}
          >
            {placing ? "Placing..." : upiOrderCreated ? "Go to Payment" : "Place Order"}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function PayOption({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ElementType; title: string; desc: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition" style={{ borderColor: active ? "#641C27" : "#E8D9B8", background: active ? "#FFF8E8" : "#FFFFFF", boxShadow: active ? "0 0 0 1px #641C27" : "none" }}>
      <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: active ? "#641C27" : "#F5E8CF" }}>
        <Icon style={{ width: 16, height: 16, color: active ? "#E5B84B" : "#641C27" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{title}</div>
        <div className="text-[11px]" style={{ color: "#76544A" }}>{desc}</div>
      </div>
      <div className="h-4 w-4 rounded-full border-2" style={{ borderColor: active ? "#641C27" : "#E8D9B8", background: active ? "#641C27" : "transparent" }}>
        {active && <CheckCircle2 style={{ width: 12, height: 12, color: "#E5B84B", marginTop: -1, marginLeft: -1 }} />}
      </div>
    </button>
  );
}
