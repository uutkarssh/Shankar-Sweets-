"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { Truck, Plus, Pencil, Trash2, X, MapPin } from "lucide-react";
import { toast } from "sonner";

type Zone = {
  id: string;
  name: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  minOrderValue: number;
  deliveryFee: number;
  gradientStartFee: number | null;
  gradientEndFee: number | null;
  isActive: boolean;
  sortOrder: number;
};

export default function AdminDeliveryPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [maxRadius, setMaxRadius] = useState(7);
  const [offersEnabled, setOffersEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/delivery-zones", { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setZones(d.zones || []);
      setMaxRadius(d.maxRadiusKm || 7);
      setOffersEnabled(d.offersEnabled ?? true);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveRadius = async () => {
    const res = await fetch("/api/admin/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-radius", radius: maxRadius }),
    });
    if (res.ok) toast.success("Max delivery radius updated");
  };

  const toggleOffers = async () => {
    const newVal = !offersEnabled;
    setOffersEnabled(newVal);
    const res = await fetch("/api/admin/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-offers", enabled: newVal }),
    });
    if (res.ok) toast.success(newVal ? "Offers enabled" : "Offers disabled — hidden from customer site");
  };

  const save = async (data: any) => {
    const res = await fetch("/api/admin/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success(editing ? "Zone updated" : "Zone created");
      setShowForm(false);
      setEditing(null);
      load();
    } else toast.error("Save failed");
  };

  const del = async (id: string) => {
    if (!confirm("Delete this zone?")) return;
    const res = await fetch("/api/admin/delivery-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (res.ok) { toast.success("Deleted"); load(); }
  };

  return (
    <AdminShell>
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Delivery Settings</h1>
        <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
      </div>

      {/* Max radius */}
      <div className="mb-4 rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
        <div className="flex items-center gap-2">
          <MapPin style={{ width: 16, height: 16, color: "#D4A83E" }} />
          <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Max Delivery Radius</h3>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            value={maxRadius}
            onChange={(e) => setMaxRadius(Number(e.target.value))}
            className="w-24 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }}
          />
          <span className="self-center text-sm" style={{ color: "#76544A" }}>km</span>
          <button onClick={saveRadius} className="rounded-lg px-4 py-2 text-xs font-bold uppercase" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>Save</button>
        </div>
      </div>

      {/* Offers master toggle */}
      <div className="mb-4 rounded-2xl border p-4" style={{ borderColor: offersEnabled ? "#2F6B45" : "#B91C1C", background: "#FFFFFF" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Offers Feature</h3>
            <p className="text-xs" style={{ color: "#76544A" }}>{offersEnabled ? "Offers tab visible to customers" : "Offers tab hidden from customer site"}</p>
          </div>
          <button onClick={toggleOffers} className="rounded-full px-4 py-2 text-xs font-bold uppercase" style={{ background: offersEnabled ? "#2F6B45" : "#B91C1C", color: "#FFF8E8" }}>
            {offersEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Zones */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold" style={{ color: "#641C27", fontFamily: "var(--font-poppins)" }}>
          <Truck style={{ width: 14, height: 14, color: "#D4A83E" }} /> Delivery Zones ({zones.length})
        </h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
          <Plus style={{ width: 12, height: 12, color: "#E5B84B" }} /> Add Zone
        </button>
      </div>

      {loading ? (
        <div className="shimmer h-20 rounded-2xl" />
      ) : zones.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <Truck style={{ width: 28, height: 28, color: "#D4A83E", margin: "0 auto" }} />
          <p className="mt-1 text-sm font-semibold" style={{ color: "#641C27" }}>No delivery zones configured</p>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((z) => (
            <div key={z.id} className="rounded-2xl border p-4" style={{ borderColor: z.isActive ? "#E8D9B8" : "#FECACA", background: z.isActive ? "#FFFFFF" : "#FEF2F2", opacity: z.isActive ? 1 : 0.7 }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{z.name}</span>
                    {!z.isActive && <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase" style={{ background: "#B91C1C22", color: "#B91C1C" }}>Inactive</span>}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "#76544A" }}>
                    {z.minDistanceKm}-{z.maxDistanceKm} km · Min order: ₹{z.minOrderValue}
                  </p>
                  <p className="text-xs" style={{ color: "#76544A" }}>
                    Fee: ₹{z.deliveryFee}
                    {z.gradientStartFee != null && z.gradientEndFee != null && ` (gradient: ₹${z.gradientStartFee}→₹${z.gradientEndFee})`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => { setEditing(z); setShowForm(true); }} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold" style={{ borderColor: "#E8D9B8", background: "#F5E8CF", color: "#641C27" }}>
                    <Pencil style={{ width: 11, height: 11 }} /> Edit
                  </button>
                  <button onClick={() => del(z.id)} className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-red-600" style={{ borderColor: "#FECACA", background: "#FEE2E2" }}>
                    <Trash2 style={{ width: 11, height: 11 }} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <ZoneForm zone={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={save} />}
    </AdminShell>
  );
}

function ZoneForm({ zone, onClose, onSave }: { zone: Zone | null; onClose: () => void; onSave: (d: any) => void }) {
  const [f, setF] = useState<any>({
    action: zone ? "update" : "create",
    id: zone?.id,
    name: zone?.name || "",
    minDistanceKm: zone?.minDistanceKm ?? 0,
    maxDistanceKm: zone?.maxDistanceKm ?? 2,
    minOrderValue: zone?.minOrderValue ?? 300,
    deliveryFee: zone?.deliveryFee ?? 0,
    gradientStartFee: zone?.gradientStartFee ?? null,
    gradientEndFee: zone?.gradientEndFee ?? null,
    isActive: zone?.isActive ?? true,
    sortOrder: zone?.sortOrder ?? 0,
  });
  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 fancy-scroll sm:rounded-3xl" style={{ background: "#FFF8E8" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>{zone ? "Edit Zone" : "New Zone"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "#F5E8CF" }}><X style={{ width: 16, height: 16, color: "#641C27" }} /></button>
        </div>
        <div className="gold-divider mt-2 mb-4"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>

        <div className="space-y-3">
          <Input label="Zone Name" value={f.name} onChange={(v) => set("name", v)} placeholder="Zone 1: 0-2km (Free)" />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Min Distance (km)" value={f.minDistanceKm} onChange={(v) => set("minDistanceKm", v)} type="number" />
            <Input label="Max Distance (km)" value={f.maxDistanceKm} onChange={(v) => set("maxDistanceKm", v)} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Min Order Value (₹)" value={f.minOrderValue} onChange={(v) => set("minOrderValue", v)} type="number" />
            <Input label="Base Delivery Fee (₹)" value={f.deliveryFee} onChange={(v) => set("deliveryFee", v)} type="number" />
          </div>

          {/* Gradient config */}
          <div className="rounded-xl border p-3" style={{ borderColor: "#D4A83E", background: "#FFFFFF" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>Gradient Fee (optional — for continuous fee scaling)</p>
            <p className="text-[10px] mt-1" style={{ color: "#76544A" }}>Leave empty for flat fee. If set, fee scales linearly from start to end across this zone's distance range.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input label="Gradient Start Fee (₹)" value={f.gradientStartFee ?? ""} onChange={(v) => set("gradientStartFee", v === "" ? null : Number(v))} type="number" />
              <Input label="Gradient End Fee (₹)" value={f.gradientEndFee ?? ""} onChange={(v) => set("gradientEndFee", v === "" ? null : Number(v))} type="number" />
            </div>
          </div>

          <button onClick={() => onSave(f)} className="w-full rounded-xl py-2.5 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
            {zone ? "Update Zone" : "Create Zone"}
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
      <input type={type} value={value ?? ""} onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFFFFF", color: "#2C1715" }} />
    </label>
  );
}
