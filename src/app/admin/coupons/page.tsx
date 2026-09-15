"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { Tag, Plus, Pencil, Trash2, X, Power } from "lucide-react";
import { toast } from "sonner";

type Coupon = {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrder: number;
  categorySlug: string | null;
  active: boolean;
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt: string | null;
  createdAt: string;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/coupons", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setCoupons(d.coupons || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (data: any) => {
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success(editing ? "Coupon updated" : "Coupon created");
      setShowForm(false);
      setEditing(null);
      load();
    } else {
      toast.error("Save failed");
    }
  };

  const toggle = async (id: string) => {
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
    if (res.ok) {
      toast.success("Toggled");
      load();
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (res.ok) { toast.success("Deleted"); load(); }
  };

  return (
    <AdminShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Coupon Management</h1>
          <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
          <Plus style={{ width: 14, height: 14, color: "#E5B84B" }} /> New Coupon
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-2xl border p-4 skeleton-delay-${i}`} style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }} aria-hidden>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-3 w-40" />
                </div>
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
              <div className="skeleton mt-3 h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <Tag style={{ width: 36, height: 36, color: "#D4A83E", margin: "0 auto" }} />
          <p className="mt-2 text-sm font-semibold" style={{ color: "#641C27" }}>No coupons yet</p>
          <p className="text-xs" style={{ color: "#76544A" }}>Create your first coupon to offer discounts.</p>
          <p className="mt-2 text-[10px]" style={{ color: "#76544A" }}>Create coupons with custom codes, discount types, and conditions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <div key={c.id} className="rounded-2xl border p-4" style={{ borderColor: c.active ? "#E8D9B8" : "#FECACA", background: c.active ? "#FFFFFF" : "#FEF2F2", opacity: c.active ? 1 : 0.7 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded px-2 py-0.5 font-mono text-sm font-bold" style={{ background: "#F5E8CF", color: "#641C27" }}>{c.code}</span>
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: c.discountType === "free_delivery" ? "#2F6B4522" : "#641C2722", color: c.discountType === "free_delivery" ? "#2F6B45" : "#641C27" }}>
                      {c.discountType === "percent" ? `${c.discountValue}% off` : c.discountType === "flat" ? `₹${c.discountValue} off` : "Free delivery"}
                    </span>
                    {!c.active && (
                      <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: "#B91C1C22", color: "#B91C1C" }}>Inactive</span>
                    )}
                    {c.maxRedemptions > 0 && (
                      <span className="text-[10px]" style={{ color: "#76544A" }}>{c.redemptionCount}/{c.maxRedemptions} used</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "#3D1018" }}>{c.description}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: "#76544A" }}>
                    Min order: ₹{c.minOrder}
                    {c.categorySlug && ` · ${c.categorySlug} only`}
                    {c.expiresAt && ` · expires ${new Date(c.expiresAt).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold" style={{ borderColor: "#E8D9B8", background: "#F5E8CF", color: "#641C27" }}>
                  <Pencil style={{ width: 11, height: 11 }} /> Edit
                </button>
                <button onClick={() => toggle(c.id)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: c.active ? "#B91C1C" : "#2F6B45" }}>
                  <Power style={{ width: 11, height: 11 }} /> {c.active ? "Disable" : "Enable"}
                </button>
                <button onClick={() => del(c.id)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-red-600" style={{ borderColor: "#FECACA", background: "#FEE2E2" }}>
                  <Trash2 style={{ width: 11, height: 11 }} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CouponForm coupon={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} />
      )}
    </AdminShell>
  );
}

function CouponForm({ coupon, onClose, onSave }: { coupon: Coupon | null; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState<any>({
    action: coupon ? "update" : "create",
    id: coupon?.id,
    code: coupon?.code || "",
    description: coupon?.description || "",
    discountType: coupon?.discountType || "percent",
    discountValue: coupon?.discountValue ?? 10,
    minOrder: coupon?.minOrder ?? "",
    categorySlug: coupon?.categorySlug || "",
    active: coupon?.active ?? true,
    maxRedemptions: coupon?.maxRedemptions ?? "",
    expiresAt: coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : "",
  });
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 fancy-scroll sm:rounded-3xl" style={{ background: "#FFF8E8" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{coupon ? "Edit Coupon" : "New Coupon"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "#F5E8CF" }}><X style={{ width: 16, height: 16, color: "#641C27" }} /></button>
        </div>
        <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

        <div className="space-y-3">
          <Input label="Coupon Code" value={f.code} onChange={(v) => set("code", v.toUpperCase())} placeholder="SAVE20" />
          <Input label="Description" value={f.description} onChange={(v) => set("description", v)} placeholder="20% off on all orders" />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Discount Type</span>
              <select value={f.discountType} onChange={(e) => set("discountType", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}>
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (₹)</option>
                <option value="free_delivery">Free Delivery</option>
              </select>
            </label>
            <Input label="Discount Value" value={f.discountValue} onChange={(v) => set("discountValue", v)} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Min Order (₹)" value={f.minOrder} onChange={(v) => set("minOrder", v)} type="number" />
            <Input label="Max Redemptions (0=unlimited)" value={f.maxRedemptions} onChange={(v) => set("maxRedemptions", v)} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Category Slug (optional)" value={f.categorySlug} onChange={(v) => set("categorySlug", v)} placeholder="sweets" />
            <Input label="Expiry Date (optional)" value={f.expiresAt} onChange={(v) => set("expiresAt", v)} type="date" />
          </div>
          <button onClick={() => onSave(f)} className="w-full rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
            {coupon ? "Update Coupon" : "Create Coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => {
          if (type === "number") {
            // Allow empty string so the user can clear the field and type
            // a new value without a hardcoded 0 blocking them.
            const raw = e.target.value;
            onChange(raw === "" ? "" : Number(raw));
          } else {
            onChange(e.target.value);
          }
        }}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
        style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }}
      />
    </label>
  );
}
