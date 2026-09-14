"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { useEffect, useState } from "react";
import { Power, Save } from "lucide-react";
import { toast } from "sonner";
import { BUSINESS } from "@/lib/constants";

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/config", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConfig(d.config))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: any) => setConfig((s: any) => ({ ...s, [k]: v }));

  const save = async () => {
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) toast.success("Settings saved");
    else toast.error("Save failed");
  };

  if (loading || !config) return <AdminShell><div className="shimmer h-40 rounded-2xl" /></AdminShell>;

  return (
    <AdminShell>
      <div className="mb-4">
        <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Settings</h1>
        <div className="gold-divider mt-2"><svg width="20" height="10" viewBox="0 0 20 10" fill="none" aria-hidden><path d="M10 0 L13 5 L10 10 L7 5 Z" fill="#D4A83E" /></svg></div>
      </div>

      {/* Accept orders toggle (prominent) */}
      <div className="mb-4 rounded-2xl border p-4" style={{ borderColor: config.acceptingOrders ? "#2F6B45" : "#B91C1C", background: "#FFFFFF" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: config.acceptingOrders ? "#2F6B4522" : "#B91C1C22" }}>
              <Power style={{ width: 20, height: 20, color: config.acceptingOrders ? "#2F6B45" : "#B91C1C" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
                {config.acceptingOrders ? "Accepting Orders" : "Orders Stopped"}
              </h3>
              <p className="text-xs" style={{ color: "#76544A" }}>
                {config.acceptingOrders ? "Customers can place orders normally." : 'Customers see "We\'ll be open soon" instead of an error.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => set("acceptingOrders", !config.acceptingOrders)}
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide"
            style={{ background: config.acceptingOrders ? "#2F6B45" : "#641C27", color: "#FFF8E8", border: `1px solid ${config.acceptingOrders ? "#2F6B45" : "#D4A83E"}` }}
          >
            {config.acceptingOrders ? "Stop Orders" : "Accept Orders"}
          </button>
        </div>
      </div>

      {/* Business info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Business Info</h3>
          <div className="space-y-2">
            <Field label="Name" value={config.name} onChange={(v) => set("name", v)} />
            <Field label="Tagline" value={config.tagline} onChange={(v) => set("tagline", v)} />
            <Field label="Address" value={config.address} onChange={(v) => set("address", v)} multiline />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Phone 1" value={config.phone1} onChange={(v) => set("phone1", v)} />
              <Field label="Phone 2" value={config.phone2} onChange={(v) => set("phone2", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude" value={config.lat} onChange={(v) => set("lat", v)} type="number" />
              <Field label="Longitude" value={config.lng} onChange={(v) => set("lng", v)} type="number" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Delivery & Payment</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Opening" value={config.openingTime} onChange={(v) => set("openingTime", v)} />
              <Field label="Closing" value={config.closingTime} onChange={(v) => set("closingTime", v)} />
            </div>
            <Field label="Delivery Radius (km)" value={config.deliveryRadiusKm} onChange={(v) => set("deliveryRadiusKm", v)} type="number" />
            <Field label="Free Delivery Above" value={config.freeDeliveryThreshold} onChange={(v) => set("freeDeliveryThreshold", v)} type="number" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min Fee" value={config.minDeliveryFee} onChange={(v) => set("minDeliveryFee", v)} type="number" />
              <Field label="Max Fee" value={config.maxDeliveryFee} onChange={(v) => set("maxDeliveryFee", v)} type="number" />
            </div>
            <Field label="UPI ID" value={config.upiId || ""} onChange={(v) => set("upiId", v)} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={save} className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold uppercase tracking-wide" style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}>
          <Save style={{ width: 14, height: 14, color: "#E5B84B" }} /> Save Settings
        </button>
      </div>
    </AdminShell>
  );
}

function Field({ label, value, onChange, type = "text", multiline }: { label: string; value: any; onChange: (v: any) => void; type?: string; multiline?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#76544A" }}>{label}</span>
      {multiline ? (
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
      ) : (
        <input type={type} value={value ?? ""} onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none" style={{ borderColor: "#E8D9B8", background: "#FFF8E8", color: "#2C1715" }} />
      )}
    </label>
  );
}
