"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { Check, X, Phone, MapPin, Clock, Truck, Package, ChefHat, Ban } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/constants";

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  landmark: string | null;
  pincode: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  items: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

const STATUSES = ["PENDING", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "REJECTED"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#D4A83E",
  ACCEPTED: "#2F6B45",
  PREPARING: "#E5B84B",
  OUT_FOR_DELIVERY: "#641C27",
  DELIVERED: "#2F6B45",
  REJECTED: "#B91C1C",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const d = await res.json();
      setOrders(d.orders || []);
    } catch {
      // ignore transient fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const update = async (orderId: string, status?: string, paymentStatus?: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status, paymentStatus }),
    });
    if (res.ok) {
      toast.success(status ? `Order ${status.toLowerCase().replace(/_/g, " ")}` : "Payment updated");
      load();
    } else {
      toast.error("Update failed");
    }
  };

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <AdminShell>
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Orders</h1>
        <div className="gold-divider mt-2 mb-3"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {["ALL", ...STATUSES].map((s) => {
            const active = filter === s;
            const label = s === "ALL" ? "All" : s.replace(/_/g, " ");
            return (
              <button key={s} onClick={() => setFilter(s)} className="rounded-full px-3 py-1.5 text-xs font-semibold transition" style={{ background: active ? "#641C27" : "#F5E8CF", color: active ? "#FFF8E8" : "#641C27", border: `1px solid ${active ? "#641C27" : "#E8D9B8"}` }}>
                {label} {s !== "ALL" && `(${orders.filter((o) => o.status === s).length})`}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="shimmer h-32 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <Package style={{ width: 36, height: 36, color: "#D4A83E", margin: "0 auto" }} />
          <p className="mt-2 text-sm font-semibold" style={{ color: "#641C27" }}>No orders here</p>
          <p className="text-xs" style={{ color: "#76544A" }}>New orders will appear automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            let items: any[] = [];
            try { items = JSON.parse(o.items); } catch {}
            return (
              <div key={o.id} className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{o.orderNumber}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: STATUS_COLORS[o.status] + "22", color: STATUS_COLORS[o.status] }}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                      {o.paymentMethod === "UPI" && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: o.paymentStatus === "VERIFIED" || o.paymentStatus === "PAID" ? "#2F6B4522" : "#D4A83E22", color: o.paymentStatus === "VERIFIED" || o.paymentStatus === "PAID" ? "#2F6B45" : "#8a6d1a" }}>
                          UPI: {o.paymentStatus}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "#76544A" }}>
                      <Clock style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
                      {new Date(o.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(o.total)}</div>
                    <div className="text-[10px]" style={{ color: "#76544A" }}>{o.paymentMethod}</div>
                  </div>
                </div>

                <div className="mt-2 text-xs" style={{ color: "#3D1018" }}>
                  <div className="font-semibold">{o.customerName} · <a href={`tel:${o.customerPhone}`} style={{ color: "#641C27" }}>{o.customerPhone}</a></div>
                  <div className="mt-0.5 flex items-start gap-1" style={{ color: "#76544A" }}>
                    <MapPin style={{ width: 12, height: 12, marginTop: 1, color: "#D4A83E" }} />
                    <span>{o.address}{o.landmark ? `, ${o.landmark}` : ""} — {o.pincode}{o.distanceKm != null ? ` (${o.distanceKm.toFixed(2)} km)` : ""}</span>
                  </div>
                  {o.notes && <div className="mt-0.5" style={{ color: "#76544A" }}><strong>Note:</strong> {o.notes}</div>}
                </div>

                <div className="mt-2 rounded-xl p-2 text-xs" style={{ background: "#FFF8E8" }}>
                  {items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between py-0.5">
                      <span style={{ color: "#3D1018" }}>{it.name} <span style={{ color: "#76544A" }}>({it.variant?.label}) ×{it.qty}</span></span>
                      <span style={{ color: "#641C27", fontWeight: 600 }}>{formatINR((it.variant?.price ?? 0) * it.qty)}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status === "PENDING" && (
                    <>
                      <ActionBtn onClick={() => update(o.id, "ACCEPTED")} icon={Check} label="Accept" primary />
                      <ActionBtn onClick={() => update(o.id, "REJECTED")} icon={X} label="Reject" danger />
                    </>
                  )}
                  {o.status === "ACCEPTED" && <ActionBtn onClick={() => update(o.id, "PREPARING")} icon={ChefHat} label="Preparing" />}
                  {o.status === "PREPARING" && <ActionBtn onClick={() => update(o.id, "OUT_FOR_DELIVERY")} icon={Truck} label="Out for Delivery" />}
                  {o.status === "OUT_FOR_DELIVERY" && <ActionBtn onClick={() => update(o.id, "DELIVERED")} icon={Package} label="Delivered" primary />}
                  {o.paymentMethod === "UPI" && o.paymentStatus === "PENDING" && (
                    <>
                      <ActionBtn onClick={() => update(o.id, undefined, "VERIFIED")} icon={Check} label="Approve Payment" primary />
                      <ActionBtn onClick={() => update(o.id, undefined, "REJECTED")} icon={X} label="Reject Payment" danger />
                    </>
                  )}
                  <a href={`tel:${o.customerPhone}`} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "#E8D9B8", background: "#F5E8CF", color: "#641C27" }}>
                    <Phone style={{ width: 12, height: 12 }} /> Call
                  </a>
                  {o.lat != null && o.lng != null && (
                    <a href={`https://www.google.com/maps?q=${o.lat},${o.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "#E8D9B8", background: "#F5E8CF", color: "#641C27" }}>
                      <MapPin style={{ width: 12, height: 12 }} /> Location
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

function ActionBtn({ onClick, icon: Icon, label, primary, danger }: { onClick: () => void; icon: React.ElementType; label: string; primary?: boolean; danger?: boolean }) {
  const bg = primary ? "#641C27" : danger ? "#B91C1C" : "#FFFFFF";
  const fg = primary || danger ? "#FFF8E8" : "#641C27";
  const border = primary ? "#D4A83E" : danger ? "#B91C1C" : "#E8D9B8";
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:scale-[1.02]" style={{ background: bg, color: fg, border: `1px solid ${border}` }}>
      <Icon style={{ width: 12, height: 12 }} /> {label}
    </button>
  );
}
