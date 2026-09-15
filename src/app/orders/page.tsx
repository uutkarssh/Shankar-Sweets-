"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, CheckCircle2, ChefHat, Truck, Clock, RotateCcw } from "lucide-react";
import { formatINR } from "@/lib/constants";
import { useCart } from "@/lib/store";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-browser";

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  items: string;
};

const STEPS = [
  { key: "PENDING", label: "Placed", icon: Clock },
  { key: "ACCEPTED", label: "Accepted", icon: CheckCircle2 },
  { key: "PREPARING", label: "Preparing", icon: ChefHat },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: Truck },
  { key: "DELIVERED", label: "Delivered", icon: Package },
];

export default function OrdersPage() {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  // Auto-fetch user's profile + orders on mount (if signed in)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try {
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const d = await res.json();
        if (d.profile?.phone) {
          // Extract 10-digit number from "+91 XXXXXXXXXX" format
          const digits = d.profile.phone.replace(/\D/g, "").slice(-10);
          setPhone(digits);
          setSearched(true);
          setLoading(true);
          // Auto-fetch orders using the user's phone
          const ordersRes = await fetch(`/api/orders/track?phone=${encodeURIComponent(digits)}`, { cache: "no-store" });
          const ordersData = await ordersRes.json();
          setOrders(ordersData.orders || []);
        }
      } catch {}
      setAutoLoaded(true);
      setLoading(false);
    });
  }, []);

  const reorder = (o: Order) => {
    let items: any[] = [];
    try { items = JSON.parse(o.items); } catch { return; }
    items.forEach((it: any) => {
      add({
        itemId: it.itemId,
        name: it.name,
        image: it.image,
        variant: it.variant || { label: "Regular", price: it.price || 0 },
        qty: it.qty || 1,
      });
    });
    // No toast — user is navigated to /cart immediately
    router.push("/cart");
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length !== 10) return;
    setLoading(true);
    setSearched(true);
    await refreshOrders();
    setLoading(false);
  };

  const refreshOrders = async () => {
    if (!phone) return;
    try {
      const res = await fetch(`/api/orders/track?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
      const d = await res.json();
      setOrders(d.orders || []);
    } catch {
      // ignore
    }
  };

  // Auto-poll for active orders (PENDING/ACCEPTED/PREPARING/OUT_FOR_DELIVERY)
  const hasActiveOrders = orders.some((o) => ["PENDING", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY"].includes(o.status));
  useEffect(() => {
    if (!searched || !hasActiveOrders) return;
    const t = setInterval(refreshOrders, 15000);
    return () => clearInterval(t);
  }, [searched, hasActiveOrders, phone]);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-4">
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>My Orders</h1>
          {searched && hasActiveOrders && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: "#2F6B4522", color: "#2F6B45" }}>
              <span className="h-1.5 w-1.5 rounded-full animate-soft-pulse" style={{ background: "#2F6B45" }} />
              Live · auto-refreshing every 15s
            </div>
          )}
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          {/* Loading state while auto-fetching */}
          {!autoLoaded && (
            <div className="space-y-3 py-2" aria-hidden>
              {[1, 2, 3].map((i) => (
                <div key={i} className={`rounded-2xl border p-4 skeleton-delay-${i}`} style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                  <div className="flex items-center justify-between">
                    <div className="skeleton h-4 w-24" />
                    <div className="skeleton h-5 w-16 rounded-full" />
                  </div>
                  <div className="skeleton mt-3 h-3 w-3/4" />
                  <div className="skeleton mt-2 h-3 w-1/2" />
                </div>
              ))}
              <p className="text-center text-xs" style={{ color: "#76544A" }}>Loading your orders...</p>
            </div>
          )}

          {/* Manual search — only show if not auto-loaded or no phone found */}
          {autoLoaded && !phone && (
            <form onSubmit={search} className="flex gap-2">
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter your 10-digit phone" inputMode="numeric" className="flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
              <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-50" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
                <Search style={{ width: 14, height: 14, color: "#E5B84B" }} /> {loading ? "..." : "Find"}
              </button>
            </form>
          )}

          {/* Loading state during manual search */}
          {loading && autoLoaded && (
            <div className="space-y-3 py-2" aria-hidden>
              {[1, 2].map((i) => (
                <div key={i} className={`rounded-2xl border p-4 skeleton-delay-${i}`} style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton mt-3 h-3 w-3/4" />
                  <div className="skeleton mt-2 h-3 w-1/2" />
                </div>
              ))}
              <p className="text-center text-xs" style={{ color: "#76544A" }}>Searching orders...</p>
            </div>
          )}

          {searched && !loading && orders.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <Package style={{ width: 32, height: 32, color: "#D4A83E", margin: "0 auto" }} />
              <p className="mt-2 text-sm font-semibold" style={{ color: "#641C27" }}>No orders yet</p>
              <p className="text-xs" style={{ color: "#76544A" }}>Your order history will appear here once you place an order.</p>
              <button onClick={() => router.push("/menu")} className="mt-3 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>Browse Menu</button>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {orders.map((o) => {
              let items: any[] = [];
              try { items = JSON.parse(o.items); } catch {}
              const stepIdx = STEPS.findIndex((s) => s.key === o.status);
              return (
                <div key={o.id} className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{o.orderNumber}</span>
                      <span className="ml-2 text-xs" style={{ color: "#76544A" }}>{new Date(o.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="text-sm font-bold" style={{ color: "#641C27" }}>{formatINR(o.total)}</div>
                  </div>

                  {/* Progress steps */}
                  {o.status !== "REJECTED" && (
                    <div className="mt-4 flex items-start justify-between gap-1">
                      {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const done = i <= stepIdx;
                        return (
                          <div key={s.key} className="flex flex-1 flex-col items-center">
                            {/* Icon row with connector lines — all icons same size for alignment */}
                            <div className="flex w-full items-center">
                              {i > 0 && <div className="h-0.5 flex-1" style={{ background: i <= stepIdx ? "#2F6B45" : "#E8D9B8" }} />}
                              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: done ? "#2F6B45" : "#F5E8CF" }}>
                                <Icon style={{ width: 13, height: 13, color: done ? "#FFF8E8" : "#76544A" }} />
                              </div>
                              {i < STEPS.length - 1 && <div className="h-0.5 flex-1" style={{ background: i < stepIdx ? "#2F6B45" : "#E8D9B8" }} />}
                            </div>
                            {/* Label — fixed height container so all labels align regardless of text length */}
                            <span className="mt-1 text-center text-[8px] font-semibold leading-tight" style={{ color: done ? "#3D1018" : "#76544A", minHeight: "1.6rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {o.status === "REJECTED" && (
                    <div className="mt-3 rounded-lg px-3 py-2 text-center text-xs font-semibold text-red-600" style={{ background: "#FEE2E2" }}>Order rejected — please call us.</div>
                  )}

                  <div className="mt-3 text-xs" style={{ color: "#76544A" }}>
                    {items.map((it: any, i: number) => <span key={i}>{i > 0 && " · "}{it.name} ×{it.qty}</span>)}
                  </div>
                  {o.paymentMethod === "UPI" && (
                    <div className="mt-1 text-[11px]" style={{ color: o.paymentStatus === "VERIFIED" || o.paymentStatus === "PAID" ? "#2F6B45" : "#8a6d1a" }}>
                      Payment: {o.paymentStatus}
                    </div>
                  )}
                  {o.status === "DELIVERED" && (
                    <button
                      onClick={() => reorder(o)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition hover:scale-105"
                      style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
                    >
                      <RotateCcw style={{ width: 11, height: 11, color: "#E5B84B" }} />
                      Reorder
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
