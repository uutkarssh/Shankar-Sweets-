"use client";

import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { useState } from "react";
import { Search, Package, CheckCircle2, ChefHat, Truck, Clock } from "lucide-react";
import { formatINR } from "@/lib/constants";

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
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length !== 10) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/orders/track?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
      const d = await res.json();
      setOrders(d.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-3xl px-3 pt-4 sm:px-4">
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2C1715", fontFamily: "var(--font-poppins)" }}>Track Your Orders</h1>
          <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

          <form onSubmit={search} className="flex gap-2">
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter your 10-digit phone" inputMode="numeric" className="flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
            <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide disabled:opacity-50" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
              <Search style={{ width: 14, height: 14, color: "#E5B84B" }} /> {loading ? "..." : "Find"}
            </button>
          </form>

          {searched && !loading && orders.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <Package style={{ width: 32, height: 32, color: "#D4A83E", margin: "0 auto" }} />
              <p className="mt-2 text-sm font-semibold" style={{ color: "#641C27" }}>No orders found</p>
              <p className="text-xs" style={{ color: "#76544A" }}>Check the phone number and try again.</p>
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
                    <div className="mt-4 flex items-center justify-between">
                      {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const done = i <= stepIdx;
                        return (
                          <div key={s.key} className="flex flex-1 flex-col items-center">
                            <div className="flex w-full items-center">
                              {i > 0 && <div className="h-0.5 flex-1" style={{ background: i <= stepIdx ? "#2F6B45" : "#E8D9B8" }} />}
                              <div className="grid h-7 w-7 place-items-center rounded-full" style={{ background: done ? "#2F6B45" : "#F5E8CF" }}>
                                <Icon style={{ width: 13, height: 13, color: done ? "#FFF8E8" : "#76544A" }} />
                              </div>
                              {i < STEPS.length - 1 && <div className="h-0.5 flex-1" style={{ background: i < stepIdx ? "#2F6B45" : "#E8D9B8" }} />}
                            </div>
                            <span className="mt-1 text-[9px] font-semibold" style={{ color: done ? "#3D1018" : "#76544A" }}>{s.label}</span>
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
