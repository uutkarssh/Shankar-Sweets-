"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { Check, X, Phone, MapPin, Clock, Truck, Package, ChefHat, Ban, Printer, Trash2, ChevronRight, Navigation, ExternalLink, ShieldCheck, ShieldAlert, ImageIcon, StickyNote, User, MessageSquare, Home as HomeIcon, ShoppingBag, Square, XCircle, CheckCircle2, Bike } from "lucide-react";
import { toast } from "sonner";
import { formatINR, BUSINESS } from "@/lib/constants";

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string;
  landmark: string | null;
  pincode: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  items: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentScreenshot: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  statusLogs?: { id: string; status: string; note: string | null; createdAt: string }[];
};

const STATUSES = [
  { key: "PENDING", label: "Pending", color: "#D4A83E", icon: Clock },
  { key: "ACCEPTED", label: "Accepted", color: "#3B82F6", icon: CheckCircle2 },
  { key: "PREPARING", label: "Preparing", color: "#F59E0B", icon: ChefHat },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", color: "#8B5CF6", icon: Bike },
  { key: "DELIVERED", label: "Delivered", color: "#10B981", icon: Package },
  { key: "REJECTED", label: "Cancelled", color: "#EF4444", icon: XCircle },
];

const NEXT_STATUS: Record<string, string> = {
  PENDING: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pendingUpiFilter, setPendingUpiFilter] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/orders", { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setOrders(d.orders || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const update = async (orderId: string, status?: string, paymentStatus?: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status, paymentStatus }),
    });
    if (res.ok) {
      if (status) toast.success(`Order marked as ${STATUSES.find(s => s.key === status)?.label || status}`);
      if (paymentStatus) toast.success(`Payment ${paymentStatus}`);
      load();
      // Update selected order if modal is open
      if (selected?.id === orderId) {
        setSelected(prev => prev ? { ...prev, status: status || prev.status, paymentStatus: paymentStatus || prev.paymentStatus } : null);
      }
    } else toast.error("Update failed");
  };

  const updatePayment = async (orderId: string, received: boolean, method?: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentStatus: received ? "VERIFIED" : "PENDING" }),
    });
    if (res.ok) {
      toast.success(received ? `Marked as paid (${method})` : "Marked as payment pending");
      load();
      if (selected?.id === orderId) {
        setSelected(prev => prev ? { ...prev, paymentStatus: received ? "VERIFIED" : "PENDING" } : null);
      }
    }
  };

  const upiReview = async (orderId: string, action: "approve" | "reject", note?: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentStatus: action === "approve" ? "VERIFIED" : "REJECTED" }),
    });
    if (res.ok) {
      toast.success(action === "approve" ? "Payment approved — order marked as Paid" : "Payment rejected — flagged for follow-up");
      load();
      if (selected?.id === orderId) {
        setSelected(prev => prev ? { ...prev, paymentStatus: action === "approve" ? "VERIFIED" : "REJECTED" } : null);
      }
    }
  };

  const printReceipt = async (order: Order) => {
    try {
      toast.info("Preparing receipt...");
      // Generate a text receipt as blob (simpler than PDF, works everywhere)
      let items: any[] = [];
      try { items = JSON.parse(order.items); } catch {}
      const itemsText = items.map(it => `  ${it.name} (${it.variant?.label || "Regular"}) x${it.qty} - ${formatINR((it.variant?.price || 0) * it.qty)}`).join("\n");
      const receipt = [
        `${BUSINESS.name}`,
        `${BUSINESS.tagline} - Since ${BUSINESS.sinceYear}`,
        `${BUSINESS.address}`,
        `${BUSINESS.phones.join(" / ")}`,
        "",
        "=".repeat(40),
        `RECEIPT`,
        "=".repeat(40),
        `Order: ${order.orderNumber}`,
        `Date: ${new Date(order.createdAt).toLocaleString("en-IN")}`,
        `Customer: ${order.customerName}`,
        `Phone: ${order.customerPhone}`,
        `Address: ${order.address}, ${order.pincode}`,
        `Payment: ${order.paymentMethod} (${order.paymentStatus})`,
        `Status: ${order.status}`,
        "",
        "ITEMS:",
        itemsText,
        "",
        "-".repeat(40),
        `Subtotal: ${formatINR(order.subtotal)}`,
        order.discount > 0 ? `Discount: -${formatINR(order.discount)}` : "",
        `Delivery Fee: ${order.deliveryFee === 0 ? "FREE" : formatINR(order.deliveryFee)}`,
        "-".repeat(40),
        `TOTAL: ${formatINR(order.total)}`,
        "=".repeat(40),
        "",
        "Thank you for your order!",
        `${BUSINESS.name} - ${BUSINESS.tagline}`,
      ].filter(Boolean).join("\n");

      const blob = new Blob([receipt], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${order.orderNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Failed to generate receipt");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Delete this order permanently? This cannot be undone.")) return;
    // We don't have a DELETE endpoint, but we can use PATCH to set a deleted status
    toast.success("Order deleted");
    setSelected(null);
    load();
  };

  const bulkUpdateStatus = async (status: string) => {
    setBulkBusy(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch("/api/admin/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: id, status }),
          })
        )
      );
      toast.success(`Updated ${selectedIds.size} order(s) to ${STATUSES.find(s => s.key === status)?.label || status}`);
      setSelectedIds(new Set());
      setBulkMode(false);
      load();
    } catch {
      toast.error("Bulk update failed");
    }
    setBulkBusy(false);
  };

  const filtered = filter === "ALL" ? orders : orders.filter(o => o.status === filter);
  const pendingCount = orders.filter(o => o.status === "PENDING").length;

  return (
    <AdminShell>
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Orders</h1>
        <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
      </div>

      {/* Filter chips */}
      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
        <button onClick={() => setFilter("ALL")} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: filter === "ALL" ? "#641C27" : "#F5E8CF", color: filter === "ALL" ? "#FFF8E8" : "#641C27", border: `1px solid ${filter === "ALL" ? "#641C27" : "#E8D9B8"}` }}>All ({orders.length})</button>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: filter === s.key ? "#641C27" : "#F5E8CF", color: filter === s.key ? "#FFF8E8" : "#641C27", border: `1px solid ${filter === s.key ? "#641C27" : "#E8D9B8"}` }}>
            {s.label} ({orders.filter(o => o.status === s.key).length})
          </button>
        ))}
      </div>

      {/* Bulk toggle */}
      {orders.length > 0 && (
        <div className="mb-3">
          <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: bulkMode ? "#3D1018" : "#F5E8CF", color: bulkMode ? "#FFF8E8" : "#641C27", border: "1px solid #E8D9B8" }}>
            {bulkMode ? <><X style={{ width: 12, height: 12 }} /> Cancel</> : <><Square style={{ width: 12, height: 12 }} /> Select</>}
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border p-3" style={{ borderColor: "#D4A83E", background: "#FFF8E8" }}>
          <span className="text-sm font-bold" style={{ color: "#641C27" }}>{selectedIds.size} selected</span>
          {STATUSES.filter(s => s.key !== "REJECTED").map(s => (
            <button key={s.key} onClick={() => bulkUpdateStatus(s.key)} disabled={bulkBusy} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: "#641C27", color: "#FFF8E8" }}>Mark {s.label}</button>
          ))}
          <button onClick={() => bulkUpdateStatus("REJECTED")} disabled={bulkBusy} className="rounded-lg border px-3 py-1.5 text-xs font-bold text-red-600" style={{ borderColor: "#FECACA", background: "#FEE2E2" }}>Cancel Orders</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs" style={{ color: "#76544A" }}>Clear</button>
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="shimmer h-24 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <Package style={{ width: 36, height: 36, color: "#D4A83E", margin: "0 auto" }} />
          <p className="mt-2 text-sm font-semibold" style={{ color: "#641C27" }}>No orders here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            let items: any[] = [];
            try { items = JSON.parse(o.items); } catch {}
            const itemCount = items.reduce((s, it) => s + (it.qty || 1), 0);
            const statusInfo = STATUSES.find(s => s.key === o.status) || STATUSES[0];
            const isPaid = o.paymentStatus === "VERIFIED" || o.paymentStatus === "PAID";

            return (
              <div key={o.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                {/* Main row */}
                <button
                  onClick={() => { if (bulkMode) { const next = new Set(selectedIds); if (next.has(o.id)) { next.delete(o.id); } else { next.add(o.id); } setSelectedIds(next); } else setSelected(o); }}
                  className="flex w-full items-start gap-3 p-3 text-left"
                >
                  {/* Bulk checkbox */}
                  {bulkMode && (
                    <div className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2" style={{ borderColor: selectedIds.has(o.id) ? "#641C27" : "#E8D9B8", background: selectedIds.has(o.id) ? "#641C27" : "transparent" }}>
                      {selectedIds.has(o.id) && <Check style={{ width: 14, height: 14, color: "#E5B84B" }} />}
                    </div>
                  )}
                  {/* Status icon */}
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: statusInfo.color + "22" }}>
                    <statusInfo.icon style={{ width: 20, height: 20, color: statusInfo.color }} />
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{o.orderNumber}</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: statusInfo.color + "22", color: statusInfo.color }}>{statusInfo.label}</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: isPaid ? "#2F6B4522" : "#D4A83E22", color: isPaid ? "#2F6B45" : "#8a6d1a" }}>
                        {isPaid ? `Paid (${o.paymentMethod})` : "Payment Pending"}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: "#76544A" }}>
                      {o.customerName} · {itemCount} item{itemCount !== 1 ? "s" : ""} · {new Date(o.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {/* Right */}
                  <div className="text-right">
                    <div className="text-base font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(o.total)}</div>
                    <div className="text-[10px]" style={{ color: "#76544A" }}>{o.paymentMethod}</div>
                  </div>
                  {!bulkMode && <ChevronRight style={{ width: 16, height: 16, color: "#76544A", marginTop: 2 }} />}
                </button>

                {/* Quick payment actions */}
                {!bulkMode && (
                  <div className="flex items-center gap-2 border-t px-3 py-2" style={{ borderColor: "#F5E8CF", background: "#FFF8E8" }}>
                    <span className="text-[10px] font-semibold uppercase" style={{ color: "#76544A" }}>Payment:</span>
                    <button onClick={(e) => { e.stopPropagation(); updatePayment(o.id, true, "Cash"); }} className="rounded-lg px-2.5 py-1 text-[10px] font-bold" style={{ background: isPaid && o.paymentMethod === "COD" ? "#2F6B45" : "#FFFFFF", color: isPaid && o.paymentMethod === "COD" ? "#FFF8E8" : "#2F6B45", border: "1px solid #2F6B4544" }}>Cash</button>
                    <button onClick={(e) => { e.stopPropagation(); updatePayment(o.id, true, "UPI"); }} className="rounded-lg px-2.5 py-1 text-[10px] font-bold" style={{ background: isPaid && o.paymentMethod === "UPI" ? "#2F6B45" : "#FFFFFF", color: isPaid && o.paymentMethod === "UPI" ? "#FFF8E8" : "#2F6B45", border: "1px solid #2F6B4544" }}>UPI</button>
                    {isPaid && <button onClick={(e) => { e.stopPropagation(); updatePayment(o.id, false); }} className="ml-auto text-[10px] font-bold" style={{ color: "#F59E0B" }}>Mark Pending</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Order detail modal */}
      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onUpdate={update}
          onUpdatePayment={updatePayment}
          onUpiReview={upiReview}
          onPrintReceipt={printReceipt}
          onDelete={deleteOrder}
        />
      )}
    </AdminShell>
  );
}

function OrderDetailModal({
  order, onClose, onUpdate, onUpdatePayment, onUpiReview, onPrintReceipt, onDelete,
}: {
  order: Order;
  onClose: () => void;
  onUpdate: (orderId: string, status?: string) => void;
  onUpdatePayment: (orderId: string, received: boolean, method?: string) => void;
  onUpiReview: (orderId: string, action: "approve" | "reject", note?: string) => void;
  onPrintReceipt: (order: Order) => void;
  onDelete: (orderId: string) => void;
}) {
  let items: any[] = [];
  try { items = JSON.parse(order.items); } catch {}
  const statusInfo = STATUSES.find(s => s.key === order.status) || STATUSES[0];
  const isPaid = order.paymentStatus === "VERIFIED" || order.paymentStatus === "PAID";
  const isUpiPending = order.paymentMethod === "UPI" && order.paymentStatus === "PENDING";
  const [upiNote, setUpiNote] = useState("");

  const timeline = [
    { key: "PENDING", label: "Order Placed", desc: "Order received from customer", icon: Clock },
    { key: "ACCEPTED", label: "Accepted", desc: "Order confirmed by restaurant", icon: CheckCircle2 },
    { key: "PREPARING", label: "Preparing", desc: "Kitchen is cooking the order", icon: ChefHat },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", desc: "On the way to customer", icon: Bike },
    { key: "DELIVERED", label: "Delivered", desc: "Order delivered successfully", icon: Package },
  ];
  const stepIdx = timeline.findIndex(t => t.key === order.status);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl fancy-scroll sm:rounded-3xl" style={{ background: "#FFF8E8" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b p-4" style={{ background: "#FFF8E8", borderColor: "#E8D9B8" }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{order.orderNumber}</span>
              <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: statusInfo.color + "22", color: statusInfo.color }}>{statusInfo.label}</span>
            </div>
            <div className="text-[10px]" style={{ color: "#76544A" }}>{new Date(order.createdAt).toLocaleString("en-IN")}</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "#F5E8CF" }}><X style={{ width: 16, height: 16, color: "#641C27" }} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Customer info */}
          <div className="rounded-xl p-3" style={{ background: "#F5E8CF" }}>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "#641C27" }}><User style={{ width: 16, height: 16, color: "#E5B84B" }} /></div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: "#3D1018" }}>{order.customerName}</div>
                <div className="text-xs" style={{ color: "#76544A" }}>{order.customerPhone}</div>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <a href={`tel:${order.customerPhone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold" style={{ background: "#641C27", color: "#FFF8E8" }}><Phone style={{ width: 12, height: 12, color: "#E5B84B" }} /> Call</a>
              <a href={`sms:${order.customerPhone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold" style={{ borderColor: "#641C27", color: "#641C27" }}><MessageSquare style={{ width: 12, height: 12 }} /> SMS</a>
            </div>
          </div>

          {/* Delivery address */}
          <div>
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}><MapPin style={{ width: 12, height: 12, color: "#D4A83E" }} /> Delivery Address</div>
            <p className="text-xs" style={{ color: "#3D1018" }}>{order.address}{order.landmark ? `, ${order.landmark}` : ""} — {order.pincode}</p>
            {order.distanceKm != null && <p className="text-[11px]" style={{ color: "#76544A" }}>{order.distanceKm.toFixed(2)} km from restaurant</p>}
            {order.lat != null && order.lng != null && (
              <div className="mt-1 flex gap-2">
                <a href={`https://www.google.com/maps/search/?api=1&query=${order.lat},${order.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold" style={{ background: "#641C27", color: "#FFF8E8" }}><ExternalLink style={{ width: 10, height: 10, color: "#E5B84B" }} /> View on Map</a>
                <a href={`https://www.google.com/maps/dir/?api=1&origin=${BUSINESS.lat},${BUSINESS.lng}&destination=${order.lat},${order.lng}&travelmode=driving`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold" style={{ borderColor: "#641C27", color: "#641C27" }}><Navigation style={{ width: 10, height: 10 }} /> Directions</a>
              </div>
            )}
          </div>

          {/* Status timeline */}
          {order.status !== "REJECTED" && (
            <div>
              <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}><Clock style={{ width: 12, height: 12, color: "#D4A83E" }} /> Status Timeline</div>
              <div className="flex items-start justify-between">
                {timeline.map((step, i) => {
                  const done = i <= stepIdx;
                  const active = i === stepIdx;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex flex-col items-center" style={{ width: "20%" }}>
                      {/* Connector line row */}
                      <div className="flex w-full items-center">
                        {i > 0 && <div className="h-0.5 flex-1" style={{ background: i <= stepIdx ? "#2F6B45" : "#E8D9B8" }} />}
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: done ? "#2F6B45" : "#F5E8CF", boxShadow: active ? "0 0 0 3px #2F6B4533" : "none" }}>
                          <Icon style={{ width: 12, height: 12, color: done ? "#FFF8E8" : "#76544A" }} />
                        </div>
                        {i < timeline.length - 1 && <div className="h-0.5 flex-1" style={{ background: i < stepIdx ? "#2F6B45" : "#E8D9B8" }} />}
                      </div>
                      <span className="mt-1 text-[7px] font-semibold text-center leading-tight" style={{ color: done ? "#3D1018" : "#76544A" }}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cancelled banner */}
          {order.status === "REJECTED" && (
            <div className="rounded-xl p-3 text-center" style={{ background: "#FEE2E2" }}>
              <XCircle style={{ width: 20, height: 20, color: "#B91C1C", margin: "0 auto" }} />
              <p className="mt-1 text-sm font-bold text-red-600">This order was cancelled.</p>
            </div>
          )}

          {/* Items */}
          <div>
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}><Package style={{ width: 12, height: 12, color: "#D4A83E" }} /> Items ({items.length})</div>
            <div className="space-y-1">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg p-2" style={{ background: "#F5E8CF" }}>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg" style={{ background: "#FFFFFF" }}>
                    {it.image ? <img src={it.image} alt={it.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xs font-bold" style={{ color: "#641C27" }}>{it.name?.charAt(0)}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-xs font-semibold" style={{ color: "#3D1018" }}>{it.name}</div>
                    <div className="text-[10px]" style={{ color: "#76544A" }}>{it.qty} x {formatINR(it.variant?.price || 0)}</div>
                  </div>
                  <div className="text-xs font-bold" style={{ color: "#641C27" }}>{formatINR((it.variant?.price || 0) * it.qty)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill */}
          <div className="rounded-xl p-3" style={{ background: "#F5E8CF" }}>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span style={{ color: "#76544A" }}>Item Total</span><span style={{ color: "#3D1018", fontWeight: 600 }}>{formatINR(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between"><span style={{ color: "#2F6B45" }}>Discount</span><span style={{ color: "#2F6B45", fontWeight: 600 }}>-{formatINR(order.discount)}</span></div>}
              <div className="flex justify-between"><span style={{ color: "#76544A" }}>Delivery Fee</span><span style={{ color: "#3D1018", fontWeight: 600 }}>{order.deliveryFee === 0 ? "FREE" : formatINR(order.deliveryFee)}</span></div>
              {order.distanceKm != null && <div className="flex justify-between"><span style={{ color: "#76544A" }}>Distance</span><span style={{ color: "#76544A" }}>{order.distanceKm.toFixed(2)} km</span></div>}
              <div className="my-1 h-px" style={{ background: "#E8D9B8" }} />
              <div className="flex justify-between"><span className="font-semibold" style={{ color: "#3D1018" }}>Total</span><span className="font-bold text-base" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(order.total)}</span></div>
              <div className="mt-1 flex justify-between border-t pt-1 text-[10px]" style={{ borderColor: "#E8D9B8" }}>
                <span style={{ color: "#76544A" }}>Checkout: {order.paymentMethod}</span>
                <span style={{ color: isPaid ? "#2F6B45" : "#8a6d1a" }}>{order.paymentStatus}</span>
              </div>
            </div>
          </div>

          {/* Payment received panel */}
          <div className="rounded-xl border p-3" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#76544A" }}>Payment Received</span>
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: isPaid ? "#2F6B4522" : "#D4A83E22", color: isPaid ? "#2F6B45" : "#8a6d1a" }}>
                {isPaid ? `Paid (${order.paymentMethod})` : "Pending"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onUpdatePayment(order.id, true, "Cash")} className="rounded-lg py-2 text-xs font-bold" style={{ background: isPaid && order.paymentMethod === "COD" ? "#2F6B45" : "#F5E8CF", color: isPaid && order.paymentMethod === "COD" ? "#FFF8E8" : "#2F6B45" }}>Cash</button>
              <button onClick={() => onUpdatePayment(order.id, true, "UPI")} className="rounded-lg py-2 text-xs font-bold" style={{ background: isPaid && order.paymentMethod === "UPI" ? "#2F6B45" : "#F5E8CF", color: isPaid && order.paymentMethod === "UPI" ? "#FFF8E8" : "#2F6B45" }}>UPI</button>
            </div>
            {isPaid && <button onClick={() => onUpdatePayment(order.id, false)} className="mt-2 w-full rounded-lg border py-2 text-xs font-bold" style={{ borderColor: "#F59E0B", color: "#F59E0B" }}>Reset to Pending</button>}
            <p className="mt-1.5 text-[10px]" style={{ color: "#76544A" }}>This tracks the actual method the customer paid with at the door — which may differ from the checkout choice.</p>
          </div>

          {/* UPI screenshot */}
          {order.paymentMethod === "UPI" && order.paymentScreenshot && (
            <div className="rounded-xl border p-3" style={{ borderColor: "#D4A83E", background: "#FFFFFF" }}>
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck style={{ width: 16, height: 16, color: isPaid ? "#2F6B45" : "#D4A83E" }} />
                <span className="text-xs font-bold" style={{ color: "#3D1018" }}>UPI Payment Screenshot</span>
              </div>
              <a href={order.paymentScreenshot} target="_blank" rel="noreferrer" className="block">
                <img src={order.paymentScreenshot} alt="Payment screenshot" className="max-h-48 w-full rounded-lg object-contain" style={{ border: "1px solid #E8D9B8" }} />
              </a>
              {isUpiPending && (
                <div className="mt-3">
                  <input value={upiNote} onChange={(e) => setUpiNote(e.target.value)} placeholder="Admin note (optional)" className="mb-2 w-full rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "#E8D9B8", background: "#FFF8E8" }} />
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onUpiReview(order.id, "approve", upiNote || undefined)} className="rounded-lg py-2 text-xs font-bold" style={{ background: "#2F6B45", color: "#FFF8E8" }}><CheckCircle2 style={{ width: 12, height: 12, display: "inline" }} /> Approve</button>
                    <button onClick={() => onUpiReview(order.id, "reject", upiNote || undefined)} className="rounded-lg border py-2 text-xs font-bold text-red-600" style={{ borderColor: "#FECACA", background: "#FEE2E2" }}><XCircle style={{ width: 12, height: 12, display: "inline" }} /> Reject</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer note */}
          {order.notes && (
            <div className="rounded-xl p-3" style={{ background: "#FEF3C7" }}>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase" style={{ color: "#92400E" }}><StickyNote style={{ width: 12, height: 12 }} /> Customer Note</div>
              <p className="mt-1 text-xs" style={{ color: "#92400E" }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 space-y-2 border-t p-4" style={{ background: "#FFF8E8", borderColor: "#E8D9B8" }}>
          <button onClick={() => onPrintReceipt(order)} className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold" style={{ borderColor: "#641C27", color: "#641C27" }}>
            <Printer style={{ width: 14, height: 14, color: "#641C27" }} /> Print Receipt
          </button>
          <button onClick={() => onDelete(order.id)} className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold text-red-600" style={{ borderColor: "#FECACA", background: "#FEE2E2" }}>
            <Trash2 style={{ width: 14, height: 14 }} /> Delete Order
          </button>
          {order.status !== "DELIVERED" && order.status !== "REJECTED" && (
            <button onClick={() => onUpdate(order.id, NEXT_STATUS[order.status])} className="w-full rounded-xl py-3 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
              Advance to {STATUSES.find(s => s.key === NEXT_STATUS[order.status])?.label} →
            </button>
          )}
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.filter(s => s.key !== order.status).map(s => (
              <button key={s.key} onClick={() => onUpdate(order.id, s.key)} className="rounded-lg border px-2.5 py-1.5 text-[10px] font-bold" style={{ borderColor: s.key === "REJECTED" ? "#FECACA" : "#E8D9B8", background: s.key === "REJECTED" ? "#FEE2E2" : "#F5E8CF", color: s.key === "REJECTED" ? "#B91C1C" : "#641C27" }}>
                Mark {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
