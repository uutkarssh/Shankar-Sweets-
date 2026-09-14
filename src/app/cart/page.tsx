"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useCart } from "@/lib/store";
import { formatINR, calculateDeliveryFee, BUSINESS } from "@/lib/constants";
import { Minus, Plus, Trash2, ShoppingBag, MapPin, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

export default function CartPage() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const address = useCart((s) => s.address);
  const subtotal = useCart((s) => s.subtotal());

  const distance = address?.distanceKm ?? 0;
  const fee = address ? calculateDeliveryFee(distance, subtotal) : undefined;
  const outOfRange = address && fee === null;
  const total = subtotal + (fee ?? 0);

  if (lines.length === 0) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
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

          {/* Delivery address */}
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
                {outOfRange ? (
                  <p className="mt-2 text-xs font-semibold text-red-600">Sorry, we only deliver within {BUSINESS.deliveryRadiusKm} km.</p>
                ) : fee === 0 ? (
                  <p className="mt-2 text-xs font-semibold" style={{ color: "#2F6B45" }}>Free delivery applied (order above {formatINR(BUSINESS.freeDeliveryThreshold)})</p>
                ) : fee !== undefined ? (
                  <p className="mt-2 text-xs font-semibold" style={{ color: "#641C27" }}>Delivery fee: {formatINR(fee)}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs" style={{ color: "#76544A" }}>Select a delivery address to proceed.</p>
            )}
            <button onClick={() => router.push("/address")} className="mt-3 inline-flex items-center gap-1 text-xs font-bold" style={{ color: "#641C27" }}>
              {address ? "Change address" : "Select address"} →
            </button>
          </div>

          {/* Bill */}
          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Bill Details</h3>
            <div className="mt-2 space-y-1.5 text-sm">
              <Row label="Item total" value={formatINR(subtotal)} />
              <Row label="Delivery fee" value={fee === undefined ? "—" : fee === 0 ? "FREE" : formatINR(fee)} />
              <div className="my-2 h-px" style={{ background: "#E8D9B8" }} />
              <Row label="To Pay" value={formatINR(total)} bold />
            </div>
          </div>
        </div>
      </main>

      {/* Sticky checkout */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4" style={{ background: "#FFFFFF", borderColor: "#E8D9B8" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "#76544A" }}>{lines.length} item{lines.length !== 1 ? "s" : ""}</div>
            <div className="text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(total)}</div>
          </div>
          <button
            onClick={() => {
              if (!address) { toast.error("Select a delivery address first"); router.push("/address"); return; }
              if (outOfRange) { toast.error("Out of delivery range"); router.push("/address"); return; }
              router.push("/checkout");
            }}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.02]"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1.5px solid #D4A83E" }}
          >
            Place Order <ArrowRight style={{ width: 14, height: 14, color: "#E5B84B" }} />
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: bold ? "#3D1018" : "#76544A", fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ color: bold ? "#641C27" : "#3D1018", fontWeight: bold ? 700 : 500, fontFamily: bold ? "var(--font-poppins)" : "var(--font-outfit)" }}>{value}</span>
    </div>
  );
}
