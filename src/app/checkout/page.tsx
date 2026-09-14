"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useCart } from "@/lib/store";
import { BUSINESS, calculateDeliveryFee, formatINR, generateOrderNumber, estimateDeliveryMinutes, formatETA, type CouponResult } from "@/lib/constants";
import { ChevronLeft, CreditCard, Banknote, Upload, CheckCircle2, Clock, Tag, X, Check, Share2, Download, Award, MapPin, User, Phone } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const address = useCart((s) => s.address);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const setCustomer = useCart((s) => s.setCustomer);
  const setNotes = useCart((s) => s.setNotes);
  const storedName = useCart((s) => s.customerName);
  const storedPhone = useCart((s) => s.customerPhone);
  const storedEmail = useCart((s) => s.customerEmail);
  const storedNotes = useCart((s) => s.notes);

  const [name, setName] = useState(storedName);
  const [phone, setPhone] = useState(storedPhone);
  const [email, setEmail] = useState(storedEmail);
  const [notes, setNotesState] = useState(storedNotes);
  const [method, setMethod] = useState<"COD" | "UPI">("COD");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  const [placedMethod, setPlacedMethod] = useState<"COD" | "UPI">("COD");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  const distance = address?.distanceKm ?? 0;
  const fee = address ? calculateDeliveryFee(distance, subtotal) : undefined;
  const outOfRange = address && fee === null;

  const discountAmount = appliedCoupon?.valid ? appliedCoupon.discountAmount : 0;
  const freeDelivery = appliedCoupon?.valid && appliedCoupon.freeDelivery;
  const effectiveDeliveryFee = freeDelivery ? 0 : (fee ?? 0);
  const total = Math.max(0, subtotal - discountAmount) + effectiveDeliveryFee;

  const applyCoupon = async () => {
    if (!couponCode.trim()) { toast.error("Enter a coupon code"); return; }
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, cartSubtotal: subtotal, deliveryFee: fee ?? 0 }),
      });
      const result = await res.json();
      if (result.valid) {
        setAppliedCoupon(result);
        toast.success(`Coupon ${result.coupon?.code} applied!`, { description: result.freeDelivery ? "Free delivery activated" : `You saved ${formatINR(result.discountAmount)}` });
      } else {
        setAppliedCoupon(null);
        toast.error("Coupon invalid", { description: result.error });
      }
    } catch {
      toast.error("Failed to validate coupon");
    }
  };

  const canPlace = !!address && !outOfRange && lines.length > 0 && name.trim().length > 1 && phone.replace(/\D/g, "").length === 10;

  const place = async () => {
    if (!canPlace) {
      toast.error("Complete the form", { description: "Name, valid 10-digit phone and address required." });
      return;
    }
    if (method === "UPI" && !screenshot) {
      toast.error("Upload payment screenshot", { description: "Required for UPI verification." });
      return;
    }
    setPlacing(true);
    setCustomer({ name, phone, email });
    setNotes(notes);
    try {
      const orderNumber = generateOrderNumber();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
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
          couponCode: appliedCoupon?.valid ? appliedCoupon.coupon?.code : null,
          total,
          paymentMethod: method,
          paymentScreenshot: screenshot,
          notes,
        }),
      });
      if (!res.ok) throw new Error("Order failed");
      const data = await res.json();
      setPlaced(data.orderNumber || orderNumber);
      setPlacedMethod(method);
      clear();
      toast.success("Order placed!", { description: data.orderNumber || orderNumber });
    } catch {
      toast.error("Could not place order", { description: "Please try again or call us." });
    } finally {
      setPlacing(false);
    }
  };

  // ─── Order confirmed screen ───
  if (placed) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="grid h-24 w-24 place-items-center rounded-full" style={{ background: "#641C27" }}>
            <CheckCircle2 style={{ width: 48, height: 48, color: "#E5B84B" }} />
          </div>
          <div className="gold-divider mt-4 mx-auto max-w-xs"><svg width="24" height="10" viewBox="0 0 24 10" fill="none" aria-hidden><path d="M12 0 L15 5 L12 10 L9 5 Z" fill="#D4A83E" /></svg></div>
          <h1 className="mt-3 text-2xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Order Confirmed</h1>
          <p className="mt-1 text-sm" style={{ color: "#76544A" }}>Thank you, {name || "friend"}! Your order is being prepared.</p>
          <div className="mt-3 rounded-xl border px-4 py-2" style={{ borderColor: "#D4A83E", background: "#FFFFFF" }}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Order Number</span>
            <div className="text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{placed}</div>
          </div>
          {placedMethod === "UPI" && (
            <p className="mt-3 max-w-xs text-xs" style={{ color: "#76544A" }}>Your payment screenshot is being verified. You'll receive an update shortly.</p>
          )}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border p-4" style={{ borderColor: "#D4A83E", background: "#641C27", color: "#FFF8E8" }}>
            <Clock style={{ width: 22, height: 22, color: "#E5B84B" }} />
            <div className="text-left">
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#E5B84B" }}>Arriving in</div>
              <div className="text-lg font-bold" style={{ fontFamily: "var(--font-poppins)" }}>25-45 min</div>
            </div>
          </div>
          <button onClick={() => router.push("/orders")} className="mt-4 rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-wide" style={{ background: "#F5E8CF", color: "#641C27", border: "1px solid #641C27" }}>Track My Order</button>
          <button onClick={() => router.push("/")} className="mt-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}>Back to Home</button>
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
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
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
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
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

          {/* Contact details */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Contact Details</h3>
            <div className="mt-3 space-y-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit phone *" inputMode="numeric" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
            </div>
          </div>

          {/* Order notes */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Order Notes</h3>
            <textarea value={notes} onChange={(e) => setNotesState(e.target.value)} rows={2} placeholder="Any special instructions..." className="mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
          </div>

          {/* Coupon */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <div className="flex items-center gap-2">
              <Tag style={{ width: 16, height: 16, color: "#D4A83E" }} />
              <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Apply Coupon</h3>
            </div>
            {appliedCoupon?.valid ? (
              <div className="mt-3 flex items-center justify-between rounded-xl border p-3 animate-fade-in-up" style={{ borderColor: "#2F6B45", background: "#F0FDF4" }}>
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "#2F6B45" }}><Check style={{ width: 14, height: 14, color: "#FFF8E8" }} /></div>
                  <div>
                    <div className="font-mono text-sm font-bold" style={{ color: "#2F6B45" }}>{appliedCoupon.coupon?.code}</div>
                    <div className="text-[11px]" style={{ color: "#3D1018" }}>{appliedCoupon.freeDelivery ? "Free delivery" : `Saved ${formatINR(appliedCoupon.discountAmount)}`}</div>
                  </div>
                </div>
                <button onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "#FEE2E2" }} aria-label="Remove coupon"><X style={{ width: 14, height: 14, color: "#B91C1C" }} /></button>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }} />
                <button onClick={applyCoupon} className="rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>Apply</button>
              </div>
            )}
            <p className="mt-2 text-[10px]" style={{ color: "#76544A" }}>Try WELCOME10, SWEET15, or FREESHIP</p>
          </div>

          {/* Payment */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Payment Method</h3>
            <div className="mt-3 space-y-2">
              <PayOption active={method === "COD"} onClick={() => setMethod("COD")} icon={Banknote} title="Cash on Delivery" desc="Pay with cash when your order arrives." />
              <PayOption active={method === "UPI"} onClick={() => setMethod("UPI")} icon={CreditCard} title="UPI Payment" desc="Pay now via UPI and upload the screenshot." />
            </div>
            {method === "UPI" && (
              <div className="mt-3 rounded-xl border p-3" style={{ borderColor: "#D4A83E", background: "#FFF8E8" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Pay to UPI ID</div>
                    <div className="text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{BUSINESS.upiId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>Amount</div>
                    <div className="text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(total)}</div>
                  </div>
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-semibold" style={{ borderColor: "#D4A83E", color: "#641C27" }}>
                  <Upload style={{ width: 16, height: 16 }} />
                  {screenshot ? "Screenshot selected ✓" : "Upload Payment Screenshot"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => setScreenshot(reader.result as string); reader.readAsDataURL(f); }} />
                </label>
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
          <button onClick={place} disabled={!canPlace || placing} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}>
            {placing ? "Placing..." : method === "UPI" ? "Verify & Place" : "Place Order"}
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
