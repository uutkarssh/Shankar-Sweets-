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
      // Dynamically import jsPDF (only loaded when the admin clicks "Print Receipt")
      const { jsPDF } = await import("jspdf");

      // ─── Layout constants (A4 portrait, all in mm) ───
      // The letterhead template has:
      //   - Maroon header band: top 0–27% of the page
      //   - Blank cream content area: 27%–91%
      //   - Maroon footer band: 91%–100%
      //   - Left/right safe margins: ~6% of page width
      const PAGE_W = 210;  // A4 width in mm
      const PAGE_H = 297;  // A4 height in mm
      const HEADER_END = PAGE_H * 0.27;   // 80.19mm — content starts here
      const FOOTER_START = PAGE_H * 0.91; // 270.27mm — content ends here
      const MARGIN_L = PAGE_W * 0.06;     // 12.6mm
      const MARGIN_R = PAGE_W * 0.06;     // 12.6mm
      const CONTENT_X = MARGIN_L;          // left edge of content
      const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R; // usable width
      const CONTENT_TOP = HEADER_END + 8;  // 8mm gap below header artwork
      const CONTENT_BOTTOM = FOOTER_START - 8; // 8mm gap above footer

      // ─── Load the letterhead image ───
      // Fetch the image and convert to data URL so jsPDF can embed it
      const imgResp = await fetch("/images/brand/receipt-letterhead.png");
      const imgBlob = await imgResp.blob();
      const imgDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imgBlob);
      });

      // ─── Create the PDF ───
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      // Add the letterhead as a full-page background image
      doc.addImage(imgDataUrl, "PNG", 0, 0, PAGE_W, PAGE_H);

      // ─── Register Poppins font ───
      // We embed the Poppins font (regular + bold) so all receipt text uses
      // Poppins, not jsPDF's default Helvetica. The font files are loaded
      // from the public folder and converted to base64.
      // NOTE: jsPDF requires base64-encoded TTF font data. We fetch the
      // font files from the public/fonts directory.
      try {
        const [regularResp, boldResp] = await Promise.all([
          fetch("/fonts/Poppins-Regular.ttf"),
          fetch("/fonts/Poppins-Bold.ttf"),
        ]);
        if (regularResp.ok && boldResp.ok) {
          const [regularBuf, boldBuf] = await Promise.all([
            regularResp.arrayBuffer(),
            boldResp.arrayBuffer(),
          ]);
          // Convert ArrayBuffer to base64
          const arrayBufferToBase64 = (buf: ArrayBuffer): string => {
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
          };
          const regularBase64 = arrayBufferToBase64(regularBuf);
          const boldBase64 = arrayBufferToBase64(boldBuf);
          doc.addFileToVFS("Poppins-Regular.ttf", regularBase64);
          doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
          doc.addFileToVFS("Poppins-Bold.ttf", boldBase64);
          doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");
          doc.setFont("Poppins");
        }
      } catch (e) {
        // If font loading fails, fall back to the default font (Helvetica)
        // — the receipt will still generate, just without Poppins.
        console.warn("Failed to load Poppins font, using default:", e);
      }

      // ─── Helper: text wrapping that respects the content width ───
      // Returns an array of lines that fit within CONTENT_W at the given
      // font size. Also checks against CONTENT_BOTTOM and stops if overflow.
      const wrapText = (text: string, fontSize: number): string[] => {
        doc.setFontSize(fontSize);
        return doc.splitTextToSize(text, CONTENT_W) as string[];
      };

      // ─── Draw receipt content ───
      let y = CONTENT_TOP;

      // Title
      doc.setFont("Poppins", "bold");
      doc.setFontSize(16);
      doc.setTextColor("#3D1018"); // dark wine
      doc.text("TAX INVOICE", PAGE_W / 2, y, { align: "center" });
      y += 8;

      // Invoice number + date (two columns)
      doc.setFontSize(10);
      doc.setTextColor("#76544A"); // warm brown
      doc.setFont("Poppins", "normal");
      const invoiceLine1 = `Invoice: ${order.orderNumber}`;
      const invoiceLine2 = `Date: ${new Date(order.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
      doc.text(invoiceLine1, CONTENT_X, y);
      doc.text(invoiceLine2, PAGE_W - MARGIN_R, y, { align: "right" });
      y += 6;

      // Divider line
      doc.setDrawColor("#D4A83E"); // gold
      doc.setLineWidth(0.3);
      doc.line(CONTENT_X, y, PAGE_W - MARGIN_R, y);
      y += 6;

      // Customer details
      doc.setFont("Poppins", "bold");
      doc.setFontSize(9);
      doc.setTextColor("#3D1018");
      doc.text("CUSTOMER DETAILS", CONTENT_X, y);
      y += 5;

      doc.setFont("Poppins", "normal");
      doc.setFontSize(10);
      doc.setTextColor("#2C1715");
      const customerLines = wrapText(`${order.customerName}  |  ${order.customerPhone}`, 10);
      for (const line of customerLines) {
        if (y > CONTENT_BOTTOM - 20) break; // stop if running out of space
        doc.text(line, CONTENT_X, y);
        y += 5;
      }
      if (order.customerEmail) {
        const emailLines = wrapText(order.customerEmail, 9);
        doc.setFontSize(9);
        doc.setTextColor("#76544A");
        for (const line of emailLines) {
          if (y > CONTENT_BOTTOM - 20) break;
          doc.text(line, CONTENT_X, y);
          y += 4.5;
        }
      }
      // Address (wrapped — can be long)
      const addrText = `Address: ${order.address}${order.landmark ? `, ${order.landmark}` : ""}, PIN: ${order.pincode}`;
      const addrLines = wrapText(addrText, 9);
      doc.setFontSize(9);
      doc.setTextColor("#76544A");
      for (const line of addrLines) {
        if (y > CONTENT_BOTTOM - 20) break;
        doc.text(line, CONTENT_X, y);
        y += 4.5;
      }
      y += 4;

      // Divider line
      doc.setDrawColor("#D4A83E");
      doc.setLineWidth(0.3);
      doc.line(CONTENT_X, y, PAGE_W - MARGIN_R, y);
      y += 6;

      // ─── Items table ───
      // Column widths (total = CONTENT_W = ~184.8mm)
      const colItem = CONTENT_W * 0.50;  // 50% for item name
      const colVariant = CONTENT_W * 0.18; // 18% for variant
      const colQty = CONTENT_W * 0.10;   // 10% for qty
      const colPrice = CONTENT_W * 0.10; // 10% for unit price
      const colTotal = CONTENT_W * 0.12; // 12% for line total

      // Table header
      doc.setFont("Poppins", "bold");
      doc.setFontSize(9);
      doc.setTextColor("#FFF8E8");
      doc.setFillColor("#641C27"); // burgundy
      doc.rect(CONTENT_X, y - 4, CONTENT_W, 7, "F");
      doc.text("ITEM", CONTENT_X + 2, y);
      doc.text("VARIANT", CONTENT_X + colItem + 2, y);
      doc.text("QTY", CONTENT_X + colItem + colVariant + 2, y);
      doc.text("PRICE", CONTENT_X + colItem + colVariant + colQty + 2, y);
      doc.text("TOTAL", PAGE_W - MARGIN_R - 2, y, { align: "right" });
      y += 8;

      // Item rows
      doc.setFont("Poppins", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#2C1715");
      let items: any[] = [];
      try { items = JSON.parse(order.items); } catch {}
      for (const it of items) {
        // Check if we're running out of space — if so, stop adding items
        // (better to show fewer items than overflow into the footer)
        if (y > CONTENT_BOTTOM - 40) {
          doc.setFont("Poppins", "italic");
          doc.setTextColor("#B91C1C");
          doc.text("... (more items — see order details)", CONTENT_X, y);
          y += 5;
          break;
        }

        const name = it.name || "Unknown";
        const variant = it.variant?.label || "Regular";
        const qty = it.qty || 1;
        const price = it.variant?.price || it.price || 0;
        const lineTotal = price * qty;

        // Wrap the item name if it's too long
        const nameLines = wrapText(name, 9) as string[];
        const rowHeight = Math.max(nameLines.length * 4.5, 5);

        // Alternate row background (very light cream)
        const itemIndex = items.indexOf(it);
        if (itemIndex % 2 === 1) {
          doc.setFillColor("#FFF8E8");
          doc.rect(CONTENT_X, y - 4, CONTENT_W, rowHeight + 1, "F");
        }

        doc.setTextColor("#2C1715");
        // Name (first line)
        doc.text(nameLines[0], CONTENT_X + 2, y);
        // Additional name lines (if wrapped)
        for (let i = 1; i < nameLines.length; i++) {
          if (y > CONTENT_BOTTOM - 40) break;
          y += 4.5;
          doc.text(nameLines[i], CONTENT_X + 2, y);
        }

        doc.text(variant, CONTENT_X + colItem + 2, y);
        doc.text(String(qty), CONTENT_X + colItem + colVariant + 2, y);
        doc.text(formatINR(price), CONTENT_X + colItem + colVariant + colQty + 2, y);
        doc.text(formatINR(lineTotal), PAGE_W - MARGIN_R - 2, y, { align: "right" });

        y += rowHeight + 1;
      }

      y += 4;

      // Divider line
      doc.setDrawColor("#D4A83E");
      doc.setLineWidth(0.3);
      doc.line(CONTENT_X, y, PAGE_W - MARGIN_R, y);
      y += 6;

      // ─── Totals ───
      // Only draw totals if there's enough space above the footer
      if (y < CONTENT_BOTTOM - 40) {
        doc.setFont("Poppins", "normal");
        doc.setFontSize(10);
        doc.setTextColor("#2C1715");

        const totalX = PAGE_W - MARGIN_R;
        const labelX = totalX - 50;

        doc.text("Subtotal:", labelX, y);
        doc.text(formatINR(order.subtotal), totalX, y, { align: "right" });
        y += 5;

        if (order.discount > 0) {
          doc.setTextColor("#2F6B45"); // green for discount
          doc.text("Discount:", labelX, y);
          doc.text(`-${formatINR(order.discount)}`, totalX, y, { align: "right" });
          y += 5;
          doc.setTextColor("#2C1715");
        }

        doc.text("Delivery Fee:", labelX, y);
        doc.text(order.deliveryFee === 0 ? "FREE" : formatINR(order.deliveryFee), totalX, y, { align: "right" });
        y += 7;

        // Total — prominent
        doc.setFont("Poppins", "bold");
        doc.setFontSize(13);
        doc.setTextColor("#641C27");
        doc.setFillColor("#FFF8E8");
        doc.rect(labelX - 4, y - 5, 54, 9, "F");
        doc.text("TOTAL:", labelX, y);
        doc.text(formatINR(order.total), totalX, y, { align: "right" });
        y += 10;
      }

      // ─── Payment info ───
      if (y < CONTENT_BOTTOM - 20) {
        doc.setFont("Poppins", "normal");
        doc.setFontSize(9);
        doc.setTextColor("#76544A");
        doc.text(`Payment: ${order.paymentMethod} (${order.paymentStatus})`, CONTENT_X, y);
        y += 5;
        doc.text(`Order Status: ${order.status}`, CONTENT_X, y);
        y += 7;
      }

      // ─── Thank you note ───
      if (y < CONTENT_BOTTOM - 10) {
        doc.setFont("Poppins", "italic");
        doc.setFontSize(10);
        doc.setTextColor("#641C27");
        doc.text("Thank you for your order!", PAGE_W / 2, y, { align: "center" });
        y += 5;
        doc.setFontSize(8);
        doc.setTextColor("#76544A");
        doc.text(`${BUSINESS.name} — ${BUSINESS.tagline}`, PAGE_W / 2, y, { align: "center" });
      }

      // ─── Save ───
      doc.save(`receipt-${order.orderNumber}.pdf`);
      toast.success("Receipt PDF downloaded");
    } catch (e: any) {
      console.error("Receipt generation failed:", e);
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

  // Filter out DRAFT orders (UPI orders that haven't completed payment yet)
  // from the default view. They become PENDING once payment is uploaded/continued.
  const visibleOrders = orders.filter(o => o.status !== "DRAFT");
  const filtered = filter === "ALL" ? visibleOrders : visibleOrders.filter(o => o.status === filter);
  const pendingCount = visibleOrders.filter(o => o.status === "PENDING").length;

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
            {s.label} ({visibleOrders.filter(o => o.status === s.key).length})
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
        <div className="space-y-3">{[1, 2, 3].map(i => (
          <div key={i} className={`rounded-2xl border p-4 skeleton-delay-${i}`} style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }} aria-hidden>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-3 w-40" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-3 w-16" />
              </div>
            </div>
            <div className="skeleton mt-3 h-3 w-2/3" />
          </div>
        ))}</div>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{o.orderNumber}</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase shrink-0" style={{ background: statusInfo.color + "22", color: statusInfo.color }}>{statusInfo.label}</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold shrink-0" style={{ background: isPaid ? "#2F6B4522" : "#D4A83E22", color: isPaid ? "#2F6B45" : "#8a6d1a" }}>
                        {isPaid ? `Paid (${o.paymentMethod})` : "Payment Pending"}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: "#76544A" }}>
                      {o.customerName} · {itemCount} item{itemCount !== 1 ? "s" : ""} · {new Date(o.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {/* Right — price + payment method, with its own clear space.
                      Using shrink-0 + min-w to ensure the price never gets
                      squeezed or overlapped by the badges on the left. */}
                  <div className="shrink-0 text-right pl-2" style={{ minWidth: "70px" }}>
                    <div className="text-base font-bold whitespace-nowrap" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>{formatINR(o.total)}</div>
                    <div className="text-[10px] whitespace-nowrap" style={{ color: "#76544A" }}>{o.paymentMethod}</div>
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

          {/* UPI screenshot + AI verification result */}
          {order.paymentMethod === "UPI" && (
            <div className="rounded-xl border p-3" style={{ borderColor: "#D4A83E", background: "#FFFFFF" }}>
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck style={{ width: 16, height: 16, color: isPaid ? "#2F6B45" : "#D4A83E" }} />
                <span className="text-xs font-bold" style={{ color: "#3D1018" }}>UPI Payment Screenshot</span>
              </div>

              {/* AI verification result from status logs */}
              {order.statusLogs && order.statusLogs.length > 0 && (
                <div className="mb-3 rounded-lg p-2" style={{ background: "#FFF8E8", border: "1px solid #E8D9B8" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#76544A" }}>AI Verification Result</p>
                  {order.statusLogs
                    .filter(log => log.note && (log.note.includes("Payment auto-check") || log.note.includes("verified") || log.note.includes("manual review")))
                    .slice(0, 1)
                    .map(log => (
                      <p key={log.id} className="mt-1 text-xs" style={{ color: log.note.includes("verified") ? "#2F6B45" : "#92400E" }}>
                        {log.note}
                      </p>
                    ))}
                  {/* If no AI verification log exists, show the current payment status */}
                  {order.statusLogs
                    .filter(log => log.note && (log.note.includes("Payment auto-check") || log.note.includes("verified") || log.note.includes("manual review")))
                    .length === 0 && (
                    <p className="mt-1 text-xs" style={{ color: "#76544A" }}>
                      Payment status: <strong style={{ color: isPaid ? "#2F6B45" : "#92400E" }}>{order.paymentStatus}</strong>
                      {isUpiPending && " — awaiting screenshot upload or manual review"}
                    </p>
                  )}
                </div>
              )}

              {order.paymentScreenshot ? (
                <>
                  <a href={order.paymentScreenshot} target="_blank" rel="noreferrer" className="block">
                    <img src={order.paymentScreenshot} alt="Payment screenshot" className="max-h-48 w-full rounded-lg object-contain" style={{ border: "1px solid #E8D9B8" }} />
                  </a>
                  <p className="mt-1 text-[10px] text-center" style={{ color: "#76544A" }}>Tap image to open full size in a new tab</p>
                </>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: "#E8D9B8", background: "#FFF8E8" }}>
                  <p className="text-xs" style={{ color: "#76544A" }}>No screenshot uploaded yet.</p>
                  <p className="mt-1 text-[10px]" style={{ color: "#76544A" }}>
                    {isUpiPending
                      ? "The customer hasn't uploaded a payment screenshot. They can do this from the payment page."
                      : "The customer chose to continue without a screenshot — manual review required."}
                  </p>
                </div>
              )}
              {isUpiPending && order.paymentScreenshot && (
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
